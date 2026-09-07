export const RESET_FILE_MANIFEST_DIRECTORY = "dashboard/reset-files/";
export const RESET_FILE_MANIFEST_FILE = "dashboard/plugins/file-shredder/reset-files.json";
export const RESET_FILE_MANIFEST_VERSION = 1;

export function normalizeResetFilePath(value) {
    const path = typeof value === "string" ? value.trim().replace(/\\/g, "/") : "";
    return /^data\/[A-Za-z0-9_.-]+\.(?:json|txt)$/.test(path) ? path : "";
}

function normalizeDataDirectory(value) {
    const path = typeof value === "string" ? value.trim().replace(/\\/g, "/") : "";
    return /^data\/[A-Za-z0-9_.-]+\/$/.test(path) ? path : "";
}

function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function parseResetFileManifest(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== RESET_FILE_MANIFEST_VERSION) {
        return { files: [], prefixes: [] };
    }
    return {
        files: uniqueSorted((Array.isArray(value.files) ? value.files : []).map(normalizeResetFilePath)),
        prefixes: uniqueSorted((Array.isArray(value.prefixes) ? value.prefixes : []).map(normalizeDataDirectory)),
    };
}

export function loadResetFileManifestContributions(ns) {
    const manifestFiles = [...new Set([
        RESET_FILE_MANIFEST_FILE,
        ...ns.ls("home", RESET_FILE_MANIFEST_DIRECTORY)
            .filter((path) => path.startsWith(RESET_FILE_MANIFEST_DIRECTORY) && path.endsWith(".json")),
    ])];
    const files = [];
    const prefixes = [];
    for (const manifestFile of manifestFiles) {
        try {
            const parsed = JSON.parse(ns.read(manifestFile) || "{}");
            const contribution = parseResetFileManifest(parsed);
            files.push(...contribution.files);
            prefixes.push(...contribution.prefixes);
        } catch (error) {
            // A malformed optional contribution must not prevent cleanup from the remaining sources.
        }
    }
    return { files: uniqueSorted(files), prefixes: uniqueSorted(prefixes), manifestFiles: uniqueSorted(manifestFiles) };
}
