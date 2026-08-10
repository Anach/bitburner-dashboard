import { formatMoney, formatRam } from "dashboard/libs/format-utils.js";

export function formatNetworkMapMetric(primary, secondary, format, context = {}) {
    const left = Number(primary) || 0;
    const right = Number(secondary) || 0;
    if (format === "xpSuitability") {
        if (context.rooted === false) return "Blocked · no root";
        if (context.eligible === false) {
            const requiredSkill = Math.max(0, Number(context.requiredSkill) || 0);
            return `Blocked · requires ${requiredSkill.toLocaleString()} skill`;
        }
        if (!Number.isFinite(Number(primary)) || Number(primary) <= 0) return "Eligible · score unavailable";
        const score = Number(primary) >= 10 ? Number(primary).toFixed(1) : Number(primary).toFixed(3);
        return `${context.selected ? "Selected" : "Eligible"} · ${score} XP/s/thread${context.estimated ? " (estimate)" : ""}`;
    }
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
