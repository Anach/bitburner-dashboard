const API_SOURCE_FILES = {
    singularity: 4,
    bladeburner: 7,
    gang: 2,
    corporation: 3,
    sleeve: 10,
    stanek: 13,
    darknet: 15,
    hacknetServers: 9,
};

export const CAPABILITY_SNAPSHOT_FILE = "data/dashboard_capabilities.json";
export const CAPABILITY_SNAPSHOT_MAX_AGE_MS = 90 * 1000;

function getMapValue(mapLike, key) {
    if (mapLike instanceof Map) return Number(mapLike.get(key)) || 0;
    if (mapLike && typeof mapLike === "object") return Number(mapLike[key]) || 0;
    return 0;
}

// Pure form for callers that already need reset information for other work. Reusing that object
// avoids both another runtime probe and the unrelated Stock/file checks in a full capability
// snapshot. Keep the API-to-Source-File mapping here so every integration uses the same rule.
export function hasApiAccessFromResetInfo(resetInfo, apiId) {
    const sourceFile = API_SOURCE_FILES[apiId];
    if (!Number.isFinite(sourceFile)) return false;

    const info = resetInfo && typeof resetInfo === "object" ? resetInfo : {};
    return Number(info.currentNode) === sourceFile
        || getMapValue(info.ownedSF, sourceFile) >= 1;
}

// A lightweight capability probe for scripts that only need to gate one API-backed worker.
// Unlike buildCapabilitySnapshot(), this does not touch the Stock API or enumerate Home files,
// so importing it into a small parent daemon adds only getResetInfo() to that daemon's RAM bill.
export function hasApiAccess(ns, apiId) {
    try {
        return hasApiAccessFromResetInfo(ns.getResetInfo(), apiId);
    } catch (error) {
        return false;
    }
}

export function createCapabilitySnapshotTelemetry(snapshot, generatedAt = Date.now()) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    return {
        generatedAt,
        currentNode: Number(source.currentNode) || 0,
        lastNodeReset: Number(source.lastNodeReset) || 0,
        apis: Object.fromEntries(Object.keys(API_SOURCE_FILES).map((apiId) => [
            apiId,
            isCapabilityRequirementMet({ type: "api", id: apiId }, source),
        ])),
    };
}

// Cheap launcher-side access: the Service Supervisor already pays for the complete capability
// snapshot, so managed services consume its fresh boolean instead of each retaining its own
// getResetInfo() call. Missing/stale/malformed data fails closed and remains distinguishable from
// a confirmed locked API, allowing launchers to report that they are waiting for the supervisor.
export function readApiAccessSnapshot(ns, apiId, now = Date.now()) {
    try {
        if (!ns.fileExists(CAPABILITY_SNAPSHOT_FILE, "home")) {
            return { available: false, hasAccess: false, status: "Waiting for Service Supervisor capabilities" };
        }
        const raw = ns.read(CAPABILITY_SNAPSHOT_FILE);
        const snapshot = raw ? JSON.parse(raw) : null;
        const generatedAt = Number(snapshot?.generatedAt) || 0;
        if (!snapshot || now - generatedAt > CAPABILITY_SNAPSHOT_MAX_AGE_MS) {
            return { available: false, hasAccess: false, status: "Waiting for fresh Service Supervisor capabilities" };
        }
        if (!snapshot.apis || typeof snapshot.apis[apiId] !== "boolean") {
            return { available: false, hasAccess: false, status: "Waiting for complete Service Supervisor capabilities" };
        }
        return {
            available: true,
            hasAccess: snapshot.apis[apiId],
            status: snapshot.apis[apiId] ? "Available" : "Locked",
            generatedAt,
            currentNode: Number(snapshot.currentNode) || 0,
            lastNodeReset: Number(snapshot.lastNodeReset) || 0,
        };
    } catch (error) {
        return { available: false, hasAccess: false, status: "Waiting for valid Service Supervisor capabilities" };
    }
}

export function buildCapabilitySnapshot(ns, knownHomeFiles) {
    let resetInfo = {};
    try {
        resetInfo = ns.getResetInfo() ?? {};
    } catch (error) {
        resetInfo = {};
    }

    const stockAccess = {
        wse: false,
        tix: false,
        "4s": false,
        "4s-tix": false,
    };
    try {
        stockAccess.wse = Boolean(ns.stock.hasWseAccount());
    } catch (error) {
        stockAccess.wse = false;
    }
    try {
        stockAccess.tix = Boolean(ns.stock.hasTixApiAccess());
    } catch (error) {
        stockAccess.tix = false;
    }
    try {
        stockAccess["4s"] = Boolean(ns.stock.has4SData());
    } catch (error) {
        stockAccess["4s"] = false;
    }
    try {
        stockAccess["4s-tix"] = Boolean(ns.stock.has4SDataTixApi());
    } catch (error) {
        stockAccess["4s-tix"] = false;
    }

    const homeFiles = new Set(Array.isArray(knownHomeFiles) ? knownHomeFiles : []);
    if (!Array.isArray(knownHomeFiles)) {
        try {
            for (const filename of ns.ls("home") ?? []) homeFiles.add(filename);
        } catch (error) {
            // Keep an empty file snapshot.
        }
    }

    return {
        currentNode: Number(resetInfo.currentNode) || 0,
        lastNodeReset: Number(resetInfo.lastNodeReset) || 0,
        ownedSourceFiles: resetInfo.ownedSF,
        ownedAugmentations: resetInfo.ownedAugs,
        homeFiles,
        stockAccess,
    };
}

export function isCapabilityRequirementMet(requirement, snapshot) {
    if (!requirement || typeof requirement !== "object") return false;

    if (requirement.type === "api") {
        const sourceFile = API_SOURCE_FILES[requirement.id];
        return Number.isFinite(sourceFile)
            && (snapshot.currentNode === sourceFile || getMapValue(snapshot.ownedSourceFiles, sourceFile) >= 1);
    }

    if (requirement.type === "sourceFile") {
        const sourceFile = Number(requirement.id);
        const minimumLevel = Math.max(1, Number(requirement.level) || 1);
        return getMapValue(snapshot.ownedSourceFiles, sourceFile) >= minimumLevel;
    }

    if (requirement.type === "augmentation") {
        return getMapValue(snapshot.ownedAugmentations, String(requirement.id)) >= 1;
    }

    if (requirement.type === "program") {
        return snapshot.homeFiles.has(String(requirement.id));
    }

    if (requirement.type === "stock") {
        return Boolean(snapshot.stockAccess[requirement.id]);
    }

    if (requirement.type === "bitNode") {
        return snapshot.currentNode === Number(requirement.id);
    }

    return false;
}

export function areCapabilityRequirementsMet(requirements, snapshot) {
    if (!Array.isArray(requirements)) return false;
    return requirements.every((requirement) => {
        return requirement?.required === false || isCapabilityRequirementMet(requirement, snapshot);
    });
}
