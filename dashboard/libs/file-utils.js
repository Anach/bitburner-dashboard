const SCRIPT_EXTENSIONS = new Set(["js", "jsx", "ts", "tsx"]);
const EDITABLE_EXTENSIONS = new Set(["js", "jsx", "ts", "tsx", "txt", "json", "css"]);
const READABLE_EXTENSIONS = new Set([...EDITABLE_EXTENSIONS, "lit", "msg"]);

export function normalizeFilePath(value) {
    return String(value ?? "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "")
        .replace(/\/{2,}/g, "/");
}

export function getFileName(path) {
    const normalized = normalizeFilePath(path);
    if (!normalized) return "";
    const separatorIndex = normalized.lastIndexOf("/");
    return separatorIndex >= 0 ? normalized.slice(separatorIndex + 1) : normalized;
}

export function getFileDirectory(path) {
    const normalized = normalizeFilePath(path);
    const separatorIndex = normalized.lastIndexOf("/");
    return separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : "";
}

export function getParentDirectory(path) {
    return getFileDirectory(normalizeFilePath(path));
}

export function joinFilePath(directory, name) {
    const left = normalizeFilePath(directory);
    const right = normalizeFilePath(name);
    return left && right ? `${left}/${right}` : left || right;
}

export function getFileExtension(path) {
    const name = getFileName(path);
    const extensionIndex = name.lastIndexOf(".");
    return extensionIndex > 0 ? name.slice(extensionIndex + 1).toLowerCase() : "";
}

export function getFileKind(path) {
    const extension = getFileExtension(path);
    if (SCRIPT_EXTENSIONS.has(extension)) return "script";
    if (extension === "txt" || extension === "json" || extension === "css") return "data";
    if (extension === "lit") return "literature";
    if (extension === "msg") return "message";
    if (extension === "cct") return "contract";
    if (extension === "exe") return "program";
    if (extension === "cache") return "cache";
    return extension || "file";
}

export function isScriptFile(path) {
    return SCRIPT_EXTENSIONS.has(getFileExtension(path));
}

export function isReadableFile(path) {
    return READABLE_EXTENSIONS.has(getFileExtension(path));
}

export function isEditableFile(path) {
    return EDITABLE_EXTENSIONS.has(getFileExtension(path));
}

export function isMovableFile(path) {
    return EDITABLE_EXTENSIONS.has(getFileExtension(path));
}

export function isDeletableFile(path) {
    return getFileExtension(path) !== "msg";
}

export function isValidManagedFilePath(path) {
    const normalized = normalizeFilePath(path);
    if (!normalized || normalized !== String(path ?? "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")) return false;
    return normalized.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function isPathInFolders(path, folders = []) {
    const normalizedPath = normalizeFilePath(path);
    return (Array.isArray(folders) ? folders : []).some((folder) => {
        const normalizedFolder = normalizeFilePath(folder);
        return normalizedFolder && (normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`));
    });
}

function normalizeManifestList(value) {
    if (!Array.isArray(value)) return [];
    const normalized = value
        .map((entry) => {
            if (typeof entry === "string") return normalizeFilePath(entry);
            if (!entry || typeof entry !== "object") return "";
            return normalizeFilePath(entry.path ?? entry.filename ?? entry.file);
        })
        .filter(Boolean);
    return [...new Set(normalized)];
}

function readObjectPath(source, key) {
    if (!source || typeof source !== "object" || typeof key !== "string" || !key) return undefined;
    return key.split(".").reduce((value, segment) => {
        if (!value || typeof value !== "object" || !(segment in value)) return undefined;
        return value[segment];
    }, source);
}

export function normalizeFileManifest(rawManifest, config = {}) {
    if (!rawManifest || typeof rawManifest !== "object") {
        return {
            available: false,
            currentFiles: [],
            previousFiles: [],
            staleFiles: [],
            generatedAt: 0,
        };
    }

    const currentFiles = normalizeManifestList(readObjectPath(rawManifest, config.currentFilesKey ?? "files"));
    const previousFiles = normalizeManifestList(readObjectPath(rawManifest, config.previousFilesKey ?? "previousFiles"));
    const explicitStaleFiles = normalizeManifestList(readObjectPath(rawManifest, config.staleFilesKey ?? "staleFiles"));
    const currentSet = new Set(currentFiles);
    const staleFiles = [...new Set([
        ...explicitStaleFiles,
        ...previousFiles.filter((path) => !currentSet.has(path)),
    ])];
    const generatedAt = Number(readObjectPath(rawManifest, config.generatedAtKey ?? "generatedAt")) || 0;

    return {
        available: true,
        currentFiles,
        previousFiles,
        staleFiles,
        generatedAt,
    };
}

export function classifyFileEntries(entries = [], manifest) {
    const normalizedManifest = manifest?.available === undefined ? normalizeFileManifest(manifest) : manifest;
    const currentSet = new Set(normalizedManifest?.currentFiles ?? []);
    const staleSet = new Set(normalizedManifest?.staleFiles ?? []);
    const existingPaths = new Set();
    const classified = [];

    for (const entry of Array.isArray(entries) ? entries : []) {
        const path = normalizeFilePath(entry?.path ?? entry?.filename);
        if (!path) continue;
        existingPaths.add(path);
        classified.push({
            ...entry,
            path,
            name: entry?.name || getFileName(path),
            directory: getFileDirectory(path),
            exists: entry?.exists !== false,
            syncStatus: currentSet.has(path)
                ? "tracked"
                : staleSet.has(path)
                    ? "stale"
                    : "unmanaged",
        });
    }

    for (const path of currentSet) {
        if (existingPaths.has(path)) continue;
        classified.push({
            path,
            name: getFileName(path),
            directory: getFileDirectory(path),
            extension: getFileExtension(path),
            kind: getFileKind(path),
            exists: false,
            running: false,
            runningThreads: 0,
            ramPerThread: 0,
            modifiedAt: 0,
            syncStatus: "missing",
        });
    }

    return classified;
}

export function isProtectedFile(entry, protection = {}) {
    if (!entry || typeof entry !== "object") return true;
    if (entry.running && protection.protectRunning !== false) return true;
    const path = normalizeFilePath(entry.path);
    const exactPaths = new Set((Array.isArray(protection.paths) ? protection.paths : []).map(normalizeFilePath));
    if (exactPaths.has(path)) return true;
    return (Array.isArray(protection.prefixes) ? protection.prefixes : []).some((prefix) => {
        const normalizedPrefix = normalizeFilePath(prefix);
        return normalizedPrefix && (path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`));
    });
}

function summarizeDirectory(files) {
    return files.reduce((summary, entry) => {
        summary.fileCount += 1;
        if (entry.running) summary.runningCount += 1;
        if (entry.protected) summary.protectedCount += 1;
        if (entry.syncStatus === "stale") summary.staleCount += 1;
        if (entry.syncStatus === "missing") summary.missingCount += 1;
        if (entry.syncStatus === "tracked") summary.trackedCount += 1;
        return summary;
    }, {
        fileCount: 0,
        runningCount: 0,
        protectedCount: 0,
        staleCount: 0,
        missingCount: 0,
        trackedCount: 0,
    });
}

export function buildFilePaneEntries(files = [], directory = "", options = {}) {
    const currentDirectory = normalizeFilePath(directory);
    const prefix = currentDirectory ? `${currentDirectory}/` : "";
    const query = String(options.query ?? "").trim().toLowerCase();
    const statusFilter = String(options.statusFilter ?? "all").toLowerCase();
    const showHidden = options.showHidden !== false;
    const hiddenFolders = Array.isArray(options.hiddenFolders) ? options.hiddenFolders : [];
    const browsingHiddenFolder = isPathInFolders(currentDirectory, hiddenFolders);
    const matchingFiles = (Array.isArray(files) ? files : []).filter((entry) => {
        const path = normalizeFilePath(entry?.path);
        if (!path.startsWith(prefix)) return false;
        const remainder = path.slice(prefix.length);
        if (!remainder) return false;
        if (!showHidden && isPathInFolders(path, hiddenFolders)) return false;
        const matchesStatus = statusFilter === "all"
            || (statusFilter === "running" ? Boolean(entry.running) : entry.syncStatus === statusFilter);
        const matchesQuery = !query || path.toLowerCase().includes(query);
        return matchesStatus && matchesQuery;
    });

    const directories = new Map();
    const directFiles = [];
    for (const entry of matchingFiles) {
        const remainder = entry.path.slice(prefix.length);
        const separatorIndex = remainder.indexOf("/");
        if (separatorIndex < 0) {
            directFiles.push({
                ...entry,
                id: `file:${entry.path}`,
                entryType: "file",
                hidden: !browsingHiddenFolder && isPathInFolders(entry.path, hiddenFolders),
            });
            continue;
        }

        const name = remainder.slice(0, separatorIndex);
        const path = joinFilePath(currentDirectory, name);
        const directoryFiles = directories.get(path) ?? [];
        directoryFiles.push(entry);
        directories.set(path, directoryFiles);
    }

    const directoryEntries = [...directories.entries()].map(([path, descendantFiles]) => ({
        id: `directory:${path}`,
        entryType: "directory",
        path,
        name: getFileName(path),
        hidden: !browsingHiddenFolder && isPathInFolders(path, hiddenFolders),
        ...summarizeDirectory(descendantFiles),
    }));

    directoryEntries.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
    directFiles.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));

    return [
        ...(currentDirectory ? [{
            id: `parent:${currentDirectory}`,
            entryType: "parent",
            path: getParentDirectory(currentDirectory),
            name: "..",
        }] : []),
        ...directoryEntries,
        ...directFiles,
    ];
}

export function buildArchivePath(path, archiveRoot = "trashbin") {
    return joinFilePath(archiveRoot, normalizeFilePath(path));
}
