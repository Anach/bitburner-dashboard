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
