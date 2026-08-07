export function formatMoney(value) {
    if (!Number.isFinite(value)) return "$0";
    return `$${Math.floor(value).toLocaleString()}`;
}

export function formatSignedMoney(value) {
    if (!Number.isFinite(value)) return "$0";
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.floor(Math.abs(value)).toLocaleString()}`;
}

export function formatRam(value) {
    if (!Number.isFinite(value) || value < 0) return "0 GB";
    if (value >= 1024) {
        const tbValue = value / 1024;
        const roundedTb = tbValue >= 100 ? Math.round(tbValue) : Math.round(tbValue * 10) / 10;
        return `${roundedTb.toLocaleString()} TB`;
    }

    const roundedGb = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${roundedGb.toLocaleString()} GB`;
}
