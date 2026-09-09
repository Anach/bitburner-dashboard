import { applySourcePatches, normalizeSourcePatches } from "dashboard/plugins/bbs-connect/bbs-connect-source";

const CATALOG_SEED_PATH = "dashboard/plugins/bbs-connect/bbs-connect-seed.json";
const PLAYER_CATALOG_PATH = "data/bbs-connect-connect-seed.json";
const CONNECTION_DIRECTORY = "data/bbs-connect-connections/";
const LEGACY_CONNECTION_DIRECTORY = "software/bbs-connect/connections/";
const CONNECTION_EXTENSION = ".bbs.txt";
const SAVE_STATE_FILE = "data/bbs-connect-saves.json";
const REMOTE_CACHE_PREFIX = "data/bbs-connect-cache-";
const IMPORT_DOWNLOAD_PATH = "data/bbs-connect-import.txt";
const MAX_SOURCE_CHARACTERS = 2_000_000;

function parseJson(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    }
    catch (error) {
        return fallback;
    }
}

function normalizeCatalog(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (raw.schemaVersion !== 1 || !Array.isArray(raw.connections)) return null;
    let migrated = false;
    const connections = raw.connections.flatMap((connection) => {
        const path = String(connection?.path || "").replaceAll("\\", "/");
        if (!path.startsWith(LEGACY_CONNECTION_DIRECTORY)) return [connection];
        migrated = true;
        // The sole bundled legacy local source was a development system test. It no longer exists
        // in the public plugin and should not leave a dead directory entry after migration.
        if (connectionId(connection?.id) === "system-test") return [];
        return [{
            ...connection,
            path: `${CONNECTION_DIRECTORY}${path.slice(LEGACY_CONNECTION_DIRECTORY.length)}`,
        }];
    });
    const ids = connections.map((connection) => normalizeConnection(connection)?.id ?? "");
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return null;
    const rawHiddenIds = raw.hiddenIds ?? [];
    if (!Array.isArray(rawHiddenIds)) return null;
    const hiddenIds = rawHiddenIds.map(connectionId);
    if (hiddenIds.some((id) => !id) || new Set(hiddenIds).size !== hiddenIds.length) return null;
    return {
        catalog: {
            schemaVersion: 1,
            connections,
            hiddenIds,
        },
        migrated,
    };
}

function loadConnectionCatalog(ns) {
    const playerSource = ns.read(PLAYER_CATALOG_PATH);
    if (String(playerSource || "").trim()) {
        const result = normalizeCatalog(parseJson(playerSource, null));
        if (!result) {
            throw new Error(`${PLAYER_CATALOG_PATH} is not a valid BBS Connect schemaVersion 1 catalog.`);
        }
        return {
            catalog: result.catalog,
            needsInitialWrite: result.migrated,
        };
    }

    // A private seed is copied into runtime-owned data only on first use. Once that file exists,
    // Catalog UI changes remain authoritative and source staging cannot restore removed entries.
    const seedResult = normalizeCatalog(parseJson(ns.read(CATALOG_SEED_PATH), null));
    return {
        catalog: seedResult?.catalog ?? { schemaVersion: 1, connections: [], hiddenIds: [] },
        needsInitialWrite: true,
    };
}

function connectionId(value) {
    const id = String(value || "").trim().toLowerCase();
    return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(id) ? id : "";
}

function labelFromId(id) {
    return id.replace(/[-_]+/g, " ").toUpperCase();
}

function idFromLabel(value) {
    const slug = String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
    return connectionId(slug) || "imported-game";
}

function uniqueConnectionId(label, connections) {
    const base = idFromLabel(label);
    const used = new Set(connections.map((connection) => connection.id));
    if (!used.has(base)) return base;
    for (let suffix = 2; suffix < 10_000; suffix++) {
        const id = `${base.slice(0, Math.max(1, 64 - String(suffix).length - 1))}-${suffix}`;
        if (!used.has(id)) return id;
    }
    throw new Error("Unable to allocate a unique connection id.");
}

export function normalizeImportUrl(value) {
    const original = String(value || "").trim();
    let parsed;
    try {
        parsed = new globalThis.URL(original);
    }
    catch (error) {
        throw new Error("Enter a valid HTTPS source-file URL.");
    }
    if (parsed.protocol !== "https:") throw new Error("Only HTTPS source-file URLs are supported.");

    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (host === "github.com") {
        const blobIndex = segments.indexOf("blob");
        if (blobIndex !== 2 || segments.length < 5) {
            throw new Error("GitHub links must point to a file using /owner/repository/blob/revision/path.");
        }
        return {
            endpoint: `https://raw.githubusercontent.com/${segments[0]}/${segments[1]}/${segments.slice(3).join("/")}`,
            sourceUrl: original,
        };
    }
    if (host === "gitlab.com") {
        const blobIndex = segments.indexOf("blob");
        if (blobIndex < 2 || segments[blobIndex - 1] !== "-" || segments.length <= blobIndex + 2) {
            throw new Error("GitLab links must point to a file using /-/blob/revision/path.");
        }
        const rawSegments = [...segments];
        rawSegments[blobIndex] = "raw";
        return { endpoint: `https://gitlab.com/${rawSegments.join("/")}`, sourceUrl: original };
    }
    if (host === "bitbucket.org" && segments[2] === "src") {
        if (segments.length < 5) throw new Error("Bitbucket links must point to a source file.");
        const rawSegments = [...segments];
        rawSegments[2] = "raw";
        return { endpoint: `https://bitbucket.org/${rawSegments.join("/")}`, sourceUrl: original };
    }
    return { endpoint: parsed.href, sourceUrl: original };
}

export function normalizeConnection(raw) {
    const id = connectionId(raw?.id);
    if (!id || (raw?.protocol && raw.protocol !== "quickserve")) return null;
    const endpoint = String(raw?.endpoint || "").trim();
    const path = String(raw?.path || "").replaceAll("\\", "/").trim();
    const validEndpoint = endpoint === "" || endpoint.startsWith("https://");
    const validPath = path === "" || (path.startsWith(CONNECTION_DIRECTORY) && path.endsWith(CONNECTION_EXTENSION));
    if (!validEndpoint || !validPath || (endpoint === "" && path === "")) return null;
    return {
        id,
        label: String(raw?.label || labelFromId(id)).trim() || labelFromId(id),
        protocol: "quickserve",
        endpoint,
        path,
        sourceUrl: String(raw?.sourceUrl || endpoint).trim(),
        license: String(raw?.license || "").trim(),
        description: String(raw?.description || "QuickServe remote system.").trim(),
        sourcePatches: normalizeSourcePatches(raw?.sourcePatches),
        refreshPolicy: raw?.refreshPolicy === "manual" ? "manual" : "connect",
        // Catalog entries stay available for validation and future re-enabling, but an explicit
        // false keeps this connection out of the player's selectable directory.
        visible: raw?.visible !== false,
    };
}

function normalizeApplication(raw) {
    const id = connectionId(raw?.id);
    if (!id || typeof raw?.component !== "function" || typeof raw?.load !== "function") return null;
    const protocol = String(raw?.protocol || "application").trim().toLowerCase();
    return {
        connection: {
            id,
            label: String(raw?.label || labelFromId(id)).trim() || labelFromId(id),
            protocol: protocol || "application",
            status: String(raw?.status || "LOCAL").trim().toUpperCase() || "LOCAL",
            kind: "application",
            sourceUrl: String(raw?.sourceUrl || "").trim(),
            license: String(raw?.license || "").trim(),
            description: String(raw?.description || "Locally installed BBS application.").trim(),
        },
        component: raw.component,
        load: raw.load,
    };
}

function compareConnections(left, right) {
    const leftIsSystemTest = left.id === "system-test";
    const rightIsSystemTest = right.id === "system-test";
    if (leftIsSystemTest !== rightIsSystemTest) return leftIsSystemTest ? 1 : -1;
    return left.label.localeCompare(right.label, undefined, { sensitivity: "base", numeric: true })
        || left.id.localeCompare(right.id);
}

function buildBbsConnections(ns, catalog, applicationDefinitions = [], includeHidden = false) {
    const connections = new Map();
    const hiddenIds = new Set(catalog.hiddenIds ?? []);
    for (const raw of applicationDefinitions) {
        const application = normalizeApplication(raw);
        if (application && !connections.has(application.connection.id)) {
            connections.set(application.connection.id, { ...application.connection, origin: "application" });
        }
    }
    for (const raw of (Array.isArray(catalog?.connections) ? catalog.connections : [])) {
        const connection = normalizeConnection(raw);
        if (connection && !connections.has(connection.id)) {
            connections.set(connection.id, { ...connection, origin: "player" });
        }
    }
    for (const path of ns.ls("home", CONNECTION_DIRECTORY)) {
        const normalizedPath = String(path).replaceAll("\\", "/");
        if (!normalizedPath.endsWith(CONNECTION_EXTENSION)) continue;
        const filename = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1, -CONNECTION_EXTENSION.length);
        const id = connectionId(filename);
        if (!id || connections.has(id)) continue;
        connections.set(id, {
            ...normalizeConnection({
                id,
                label: labelFromId(id),
                path: normalizedPath,
                description: "Locally installed QuickServe remote system.",
            }), origin: "local"
        });
    }
    return [...connections.values()]
        .map((connection) => ({ ...connection, visible: connection.visible !== false && !hiddenIds.has(connection.id) }))
        .filter((connection) => includeHidden || connection?.visible !== false)
        .sort(compareConnections);
}

export function loadBbsConnections(ns, applicationDefinitions = []) {
    return buildBbsConnections(ns, loadConnectionCatalog(ns).catalog, applicationDefinitions);
}

function loadSavedData(ns) {
    const parsed = parseJson(ns.read(SAVE_STATE_FILE), {});
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
        .filter(([id, data]) => connectionId(id) && typeof data === "string"));
}

function validateSource(connection, source) {
    const text = applySourcePatches(source, connection.sourcePatches, connection.label);
    if (text.trim() === "") throw new Error(`No QuickServe source was found for ${connection.label}.`);
    if (text.length > MAX_SOURCE_CHARACTERS) {
        throw new Error(`${connection.label} exceeds the ${MAX_SOURCE_CHARACTERS.toLocaleString()} character source limit.`);
    }
    return text;
}

async function loadConnectionSource(ns, connection) {
    if (connection.path) return validateSource(connection, ns.read(connection.path));
    const cachePath = `${REMOTE_CACHE_PREFIX}${connection.id}.txt`;
    if (connection.refreshPolicy === "manual") {
        const installedSource = ns.read(cachePath);
        if (installedSource) return validateSource(connection, installedSource);
    }
    let downloadError = "";
    try {
        const downloaded = await ns.wget(connection.endpoint, cachePath, "home");
        if (!downloaded) downloadError = "The remote host did not return a usable response.";
    }
    catch (error) {
        downloadError = error instanceof Error ? error.message : String(error);
    }
    const cachedSource = ns.read(cachePath);
    if (cachedSource) return validateSource(connection, cachedSource);
    throw new Error(downloadError || `Unable to download ${connection.endpoint}.`);
}

/**
 * Owns Netscript-backed catalog, source, and save operations for either a tail or workspace host.
 * UI callbacks only enqueue work; poll() performs all Netscript calls from the process main loop.
 */
export function createBbsConnectService(ns, options = {}) {
    const applicationDefinitions = [...(options.applications ?? [])]
        .map(normalizeApplication)
        .filter(Boolean);
    const applications = new Map(applicationDefinitions.map((application) => [application.connection.id, application]));
    const applicationResources = new Map();
    const catalogState = loadConnectionCatalog(ns);
    const applicationConnections = applicationDefinitions.map((application) => ({
        ...application.connection,
        component: application.component,
        load: application.load,
    }));
    let allConnections = buildBbsConnections(ns, catalogState.catalog, applicationConnections, true);
    let connections = allConnections.filter((connection) => connection.visible !== false);
    const savedData = loadSavedData(ns);
    const pendingRequests = [];
    let saveDirty = false;
    let catalogDirty = catalogState.needsInitialWrite;
    let disposed = false;

    const refreshConnections = () => {
        allConnections = buildBbsConnections(ns, catalogState.catalog, applicationConnections, true);
        connections = allConnections.filter((connection) => connection.visible !== false);
        return { connections: [...connections], allConnections: [...allConnections] };
    };

    const enqueue = (type, payload = {}) => {
        if (disposed) return Promise.reject(new Error("BBS Connect service has stopped."));
        return new Promise((resolve, reject) => pendingRequests.push({ type, ...payload, resolve, reject }));
    };

    const bridge = {
        requestConnection: (connection) => enqueue("connection", { connection }),
        prepareImport: (url) => enqueue("prepare-import", { url }),
        installImport: (prepared) => enqueue("install-import", { prepared }),
        setConnectionVisible: (id, visible) => enqueue("set-visible", { id, visible }),
        removeConnection: (id) => enqueue("remove", { id }),
        persist: (id, data) => {
            const normalizedId = connectionId(id);
            if (disposed || !normalizedId || typeof data !== "string") return;
            savedData[normalizedId] = data;
            saveDirty = true;
        },
    };

    const writeCatalog = async () => {
        await ns.write(PLAYER_CATALOG_PATH, JSON.stringify(catalogState.catalog, null, 4), "w");
        catalogDirty = false;
    };

    const flush = async () => {
        let wrote = false;
        if (catalogDirty) {
            await writeCatalog();
            wrote = true;
        }
        if (saveDirty) {
            await ns.write(SAVE_STATE_FILE, JSON.stringify(savedData), "w");
            saveDirty = false;
            wrote = true;
        }
        return wrote;
    };

    return {
        bridge,
        get connections() { return connections; },
        get allConnections() { return allConnections; },
        flush,
        poll: async () => {
            while (pendingRequests.length > 0) {
                const request = pendingRequests.shift();
                try {
                    if (request.type === "prepare-import") {
                        const normalizedUrl = normalizeImportUrl(request.url);
                        const downloaded = await ns.wget(normalizedUrl.endpoint, IMPORT_DOWNLOAD_PATH, "home");
                        if (!downloaded) throw new Error("The remote host did not return a usable response.");
                        const source = validateSource({ label: "Imported QuickServe source", sourcePatches: [] }, ns.read(IMPORT_DOWNLOAD_PATH));
                        request.resolve({ ...normalizedUrl, source });
                        continue;
                    }
                    if (request.type === "install-import") {
                        const prepared = request.prepared ?? {};
                        const source = validateSource({ label: prepared.name || "Imported QuickServe source", sourcePatches: [] }, prepared.source);
                        const id = uniqueConnectionId(prepared.name, allConnections);
                        const entry = {
                            id,
                            visible: true,
                            label: String(prepared.name || labelFromId(id)).trim() || labelFromId(id),
                            protocol: "quickserve",
                            endpoint: String(prepared.endpoint || "").trim(),
                            sourceUrl: String(prepared.sourceUrl || prepared.endpoint || "").trim(),
                            license: "User imported; not verified",
                            description: "Player-imported QuickServe connection.",
                            refreshPolicy: "manual",
                        };
                        if (!normalizeConnection(entry)) throw new Error("The imported connection metadata is invalid.");
                        await ns.write(`${REMOTE_CACHE_PREFIX}${id}.txt`, source, "w");
                        catalogState.catalog.connections.push(entry);
                        catalogState.catalog.hiddenIds = catalogState.catalog.hiddenIds.filter((candidate) => candidate !== id);
                        catalogDirty = true;
                        await writeCatalog();
                        const refreshed = refreshConnections();
                        request.resolve({
                            connection: refreshed.connections.find((candidate) => candidate.id === id),
                            ...refreshed,
                        });
                        continue;
                    }
                    if (request.type === "set-visible") {
                        const id = connectionId(request.id);
                        if (!id || !allConnections.some((connection) => connection.id === id)) throw new Error("Connection not found.");
                        const rawEntry = catalogState.catalog.connections.find((candidate) => connectionId(candidate?.id) === id);
                        if (rawEntry) rawEntry.visible = request.visible === true;
                        const hiddenIds = new Set(catalogState.catalog.hiddenIds);
                        if (request.visible === true) hiddenIds.delete(id);
                        else hiddenIds.add(id);
                        catalogState.catalog.hiddenIds = [...hiddenIds].sort();
                        catalogDirty = true;
                        await writeCatalog();
                        request.resolve(refreshConnections());
                        continue;
                    }
                    if (request.type === "remove") {
                        const id = connectionId(request.id);
                        const previousLength = catalogState.catalog.connections.length;
                        catalogState.catalog.connections = catalogState.catalog.connections
                            .filter((candidate) => connectionId(candidate?.id) !== id);
                        if (!id || catalogState.catalog.connections.length === previousLength) {
                            throw new Error("Only player-catalog connections can be removed.");
                        }
                        catalogState.catalog.hiddenIds = [...new Set([...catalogState.catalog.hiddenIds, id])].sort();
                        catalogDirty = true;
                        await writeCatalog();
                        request.resolve(refreshConnections());
                        continue;
                    }
                    if (request.connection.kind === "application") {
                        const application = applications.get(request.connection.id);
                        if (!application) throw new Error(`${request.connection.label} is not installed.`);
                        if (!applicationResources.has(request.connection.id)) {
                            applicationResources.set(request.connection.id, Promise.resolve()
                                .then(() => application.load(ns))
                                .then((props) => ({
                                    kind: "application",
                                    component: application.component,
                                    props: props && typeof props === "object" ? props : {},
                                })));
                        }
                        request.resolve(await applicationResources.get(request.connection.id));
                        continue;
                    }
                    const source = await loadConnectionSource(ns, request.connection);
                    request.resolve({ kind: "quickserve", source, savedData: savedData[request.connection.id] || "" });
                }
                catch (error) {
                    request.reject(error);
                }
            }
            await flush();
        },
        shutdown: () => {
            if (disposed) return;
            disposed = true;
            const error = new Error("BBS Connect service has stopped.");
            while (pendingRequests.length > 0) pendingRequests.shift().reject(error);
        },
    };
}
