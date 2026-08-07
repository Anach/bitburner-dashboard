function normalizeFolder(folder) {
    return String(folder ?? "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");
}

export function parseScriptFolders(rawFolders) {
    const candidates = Array.isArray(rawFolders)
        ? rawFolders
        : String(rawFolders ?? "").split(/[,;\n]/);
    const folders = new Set();

    for (const candidate of candidates) {
        const normalized = normalizeFolder(candidate);
        if (normalized) folders.add(normalized);
    }

    return [...folders].sort((left, right) => left.localeCompare(right));
}

export function normalizeScriptFolders(rawFolders) {
    return parseScriptFolders(rawFolders).join(", ");
}

export function parseScriptFiles(rawFiles) {
    return parseScriptFolders(rawFiles);
}

export function normalizeScriptFiles(rawFiles) {
    return parseScriptFiles(rawFiles).join(", ");
}

export function isScriptFileHidden(filename, files) {
    if (typeof filename !== "string" || !Array.isArray(files) || files.length === 0) return false;
    const normalizedFilename = filename.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    return files.includes(normalizedFilename);
}

export function isScriptInFolders(filename, folders) {
    if (typeof filename !== "string" || !Array.isArray(folders) || folders.length === 0) return false;
    const normalizedFilename = filename.replace(/\\/g, "/").replace(/^\/+/, "");
    return folders.some((folder) => normalizedFilename === folder || normalizedFilename.startsWith(`${folder}/`));
}
