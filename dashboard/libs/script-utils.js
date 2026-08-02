export function getScriptDisplayName(filename) {
    if (typeof filename !== "string" || filename.length === 0) return "unknown";
    const split = filename.split("/");
    return split[split.length - 1] || filename;
}

export function compareScriptPathsByName(left, right) {
    const leftName = getScriptDisplayName(left).toLowerCase();
    const rightName = getScriptDisplayName(right).toLowerCase();
    if (leftName !== rightName) return leftName.localeCompare(rightName);
    return left.localeCompare(right);
}
