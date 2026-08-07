export function finiteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

export function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
