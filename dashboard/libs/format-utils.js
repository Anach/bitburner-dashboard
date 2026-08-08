export function formatMoney(value) {
    if (!Number.isFinite(value)) return "$0";
    return `$${Math.floor(value).toLocaleString()}`;
}

export function formatSignedMoney(value) {
    if (!Number.isFinite(value)) return "$0";
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.floor(Math.abs(value)).toLocaleString()}`;
}

const RAM_UNITS = ["GB", "TB", "PB", "EB"];

export function formatRam(value) {
    if (!Number.isFinite(value) || value < 0) return "0 GB";
    let scaled = value;
    let unitIndex = 0;
    while (scaled >= 1024 && unitIndex < RAM_UNITS.length - 1) {
        scaled /= 1024;
        unitIndex++;
    }
    const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    return `${rounded.toLocaleString()} ${RAM_UNITS[unitIndex]}`;
}

const RELATIVE_AGE_UNITS = [
    { unit: "d", ms: 24 * 60 * 60 * 1000 },
    { unit: "h", ms: 60 * 60 * 1000 },
    { unit: "m", ms: 60 * 1000 },
];

// ms is a plain duration (already-computed now - generatedAt), not a timestamp. Negative deltas
// (clock skew, or generatedAt briefly in the future) fall into the < 1 minute branch below rather
// than rendering a nonsensical negative bucket.
export function formatRelativeAge(ms) {
    if (!Number.isFinite(ms) || ms < 60000) return "just now";
    for (const { unit, ms: unitMs } of RELATIVE_AGE_UNITS) {
        if (ms >= unitMs) return `${Math.floor(ms / unitMs)}${unit} ago`;
    }
    return "just now";
}
