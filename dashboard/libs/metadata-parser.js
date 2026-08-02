export function findJsonObjectEnd(sourceText, startIndex) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < sourceText.length; index++) {
        const character = sourceText[index];
        if (inString) {
            if (escaped) escaped = false;
            else if (character === "\\") escaped = true;
            else if (character === '"') inString = false;
            continue;
        }

        if (character === '"') inString = true;
        else if (character === "{") depth += 1;
        else if (character === "}") {
            depth -= 1;
            if (depth === 0) return index;
        }
    }

    return -1;
}

export function parseDashboardMetadataFromSource(sourceText, declaration) {
    if (typeof sourceText !== "string" || sourceText.length === 0) return null;
    if (typeof declaration !== "string" || declaration.length === 0) return null;
    const declarationIndex = sourceText.indexOf(declaration);
    if (declarationIndex < 0) return null;
    const objectStart = sourceText.indexOf("{", declarationIndex + declaration.length);
    if (objectStart < 0) return null;
    const objectEnd = findJsonObjectEnd(sourceText, objectStart);
    if (objectEnd < 0) return null;

    try {
        const parsed = JSON.parse(sourceText.slice(objectStart, objectEnd + 1));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
        return null;
    }
}
