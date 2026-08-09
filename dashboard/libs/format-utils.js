export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "now";

    const totalMinutes = Math.ceil(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

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

export function formatShareBoost(sharePower) {
    if (!Number.isFinite(sharePower)) return "No free RAM";
    const percent = (sharePower - 1) * 100;
    if (percent < 0.05) return "No free RAM";
    return `+${percent.toFixed(1)}% boost`;
}

const COMPACT_NUMBER_UNITS = [
    { threshold: 1e15, suffix: "q" },
    { threshold: 1e12, suffix: "t" },
    { threshold: 1e9, suffix: "b" },
    { threshold: 1e6, suffix: "m" },
    { threshold: 1e3, suffix: "k" },
];

export function formatCompactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    const absolute = Math.abs(numeric);
    const unit = COMPACT_NUMBER_UNITS.find((candidate) => absolute >= candidate.threshold);
    const scaled = unit ? numeric / unit.threshold : numeric;
    const scaledAbsolute = Math.abs(scaled);
    const digits = scaledAbsolute >= 100 ? 0 : scaledAbsolute >= 10 ? 1 : 2;
    const formatted = scaled.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
    return `${formatted}${unit?.suffix ?? ""}`;
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
