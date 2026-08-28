function normalizeScriptPaths(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((entry) => typeof entry === "string" && entry.length > 0))];
}

// managedScripts is a lifecycle field: it means a child is managed on Home. Network offloading
// therefore cannot leave a script in that array solely so Start Order can keep displaying its RAM.
// capacityPlanningScripts is the placement-independent declaration for that display; the fallback
// preserves every older descriptor that still uses managedScripts for both purposes.
export function getStartOrderChildScripts(pluginMetadata) {
    if (Array.isArray(pluginMetadata?.capacityPlanningScripts)) {
        return normalizeScriptPaths(pluginMetadata.capacityPlanningScripts);
    }
    return normalizeScriptPaths(pluginMetadata?.managedScripts);
}

export function sumStartOrderChildRam(pluginMetadata, ramByFilename) {
    const ramLookup = ramByFilename instanceof Map ? ramByFilename : new Map();
    return getStartOrderChildScripts(pluginMetadata)
        .reduce((sum, childFile) => sum + (ramLookup.get(childFile) ?? 0), 0);
}
