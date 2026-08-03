import { formatMoney, formatRam } from "dashboard/libs/format-utils.js";

export function formatNetworkMapMetric(primary, secondary, format) {
    const left = Number(primary) || 0;
    const right = Number(secondary) || 0;
    if (format === "ramRatio") return `${formatRam(left)} / ${formatRam(right)}`;
    if (format === "moneyRatio") return `${formatMoney(left)} / ${formatMoney(right)}`;
    if (format === "ratio") return `${left.toLocaleString()} / ${right.toLocaleString()}`;
    if (format === "percent") return `${(left * 100).toFixed(1)}%`;
    if (format === "decimal") return left.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (format === "boolean") return primary ? "Yes" : "No";
    if (format === "ram") return formatRam(left);
    if (format === "money") return formatMoney(left);
    if (format === "number") return left.toLocaleString();
    return secondary === undefined ? String(primary ?? "n/a") : `${primary ?? 0} / ${secondary ?? 0}`;
}
