const MAX_SOURCE_PATCHES = 16;
const MAX_PATCH_TEXT_CHARACTERS = 1_000;

export function normalizeSourcePatches(rawPatches) {
    if (!Array.isArray(rawPatches)) return [];
    return rawPatches.slice(0, MAX_SOURCE_PATCHES).map((rawPatch) => {
        const find = String(rawPatch?.find ?? "");
        const replace = String(rawPatch?.replace ?? "");
        const occurrences = Math.floor(Number(rawPatch?.occurrences ?? 1));
        if (!find || find.length > MAX_PATCH_TEXT_CHARACTERS || replace.length > MAX_PATCH_TEXT_CHARACTERS
            || !Number.isInteger(occurrences) || occurrences < 1 || occurrences > 20) {
            return null;
        }
        return { find, replace, occurrences };
    }).filter(Boolean);
}

export function applySourcePatches(source, patches, label = "QuickServe source") {
    let patched = String(source ?? "");
    for (const patch of normalizeSourcePatches(patches)) {
        const segments = patched.split(patch.find);
        const found = segments.length - 1;
        if (found !== patch.occurrences) {
            throw new Error(`${label} compatibility patch expected ${patch.occurrences} exact match${patch.occurrences === 1 ? "" : "es"}, but found ${found}.`);
        }
        patched = segments.join(patch.replace);
    }
    return patched;
}


