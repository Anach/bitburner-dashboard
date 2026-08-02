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
