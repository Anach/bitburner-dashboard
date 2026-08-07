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
