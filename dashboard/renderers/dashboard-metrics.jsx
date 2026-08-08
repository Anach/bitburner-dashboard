import { formatRam } from "dashboard/libs/format-utils.js";
import { getTelemetryFreshnessTooltip } from "dashboard/libs/telemetry-freshness.js";
import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});
let getRamHealthLevel = () => "neutral";
let formatUtilizationPercent = () => "0%";

export function configureDashboardMetrics({ getTheme, getStyles, getRamHealth, formatPercent } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
    if (typeof getRamHealth === "function") getRamHealthLevel = getRamHealth;
    if (typeof formatPercent === "function") formatUtilizationPercent = formatPercent;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

export function TonePill({ label, value, tone = "neutral", sourceLabel, state = "live", ageText }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const tones = {
        neutral: { border: "rgba(125, 160, 212, 0.18)", value: "#eef5ff" },
        warn: { border: "rgba(255, 198, 92, 0.35)", value: "#ffd88a" },
        danger: { border: "rgba(255, 122, 122, 0.35)", value: "#ffb0b0" },
        success: { border: "rgba(110, 231, 168, 0.35)", value: "#baf6d2" },
        info: { border: "rgba(108, 180, 255, 0.35)", value: "#c8e0ff" },
    };
    // A stale/missing stat is muted to the pill's own neutral entry rather than a new palette -
    // this repo already has multiple independently-duplicated tone maps, no need for a fourth.
    const muted = state !== "live";
    const style = muted ? tones.neutral : (tones[tone] ?? tones.neutral);
    const subtext = sourceLabel || "";
    const tooltip = getTelemetryFreshnessTooltip(state, { sourceLabel, ageText });

    return (
        <div title={tooltip || undefined} data-dashboard-theme-role="quick-stat" style={{ ...styles.pill, borderColor: style.border, opacity: muted ? 0.7 : 1 }}>
            <div style={styles.pillLabel}>{label}</div>
            <div data-dashboard-theme-role="stat-value" style={{ ...styles.pillValue, color: style.value }}>{value}</div>
            {subtext ? <div style={styles.homeMetricSource}>{subtext}</div> : null}
        </div>
    );
}

export function RamGauge({ label, shortLabel, used: rawUsed, total: rawTotal, ratio: rawRatio, valueFormat = "ram", size: rawSize = 60, offline = false }) {
    const react = getReact();
    if (!react) return null;
    const used = Math.max(0, Number(rawUsed) || 0);
    const total = Math.max(0, Number(rawTotal) || 0);
    const size = Math.max(48, Math.min(120, Math.floor(Number(rawSize) || 60)));
    const center = size / 2;
    const strokeWidth = Math.max(5, Math.round(size * 0.066));
    const radius = center - strokeWidth - 2;
    const configuredRatio = Number(rawRatio);
    const ratio = Number.isFinite(configuredRatio) && configuredRatio >= 0
        ? configuredRatio
        : total > 0
            ? used / total
            : 0;
    const hasCapacity = total > 0;
    // Offline zeroes the visible fill too, same "don't show stale data" treatment as an offline
    // graph's history line - only the grey outline remains, not a ring implying a live reading.
    const clampedRatio = offline ? 0 : Math.max(0, Math.min(1, ratio));
    const health = getRamHealthLevel({ ratio });
    const stroke = offline || !hasCapacity
        ? "#759875"
        : health === "danger"
            ? "#ff7a7a"
            : health === "warn"
                ? "#ffc65c"
                : "#6ee7a8";
    const circumference = 2 * Math.PI * radius;
    const percentage = offline ? "Offline" : hasCapacity ? formatUtilizationPercent(ratio) : "n/a";
    const formattedUsed = valueFormat === "ram" ? formatRam(used) : used.toLocaleString();
    const formattedTotal = valueFormat === "ram" ? formatRam(total) : total.toLocaleString();
    const title = offline
        ? `${label}: offline`
        : hasCapacity
            ? `${label}: ${formattedUsed} / ${formattedTotal} (${percentage})`
            : `${label}: no capacity`;

    return (
        <div role="meter" aria-label={`${label} utilization`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100, ratio * 100)} title={title} style={{ position: "relative", width: `${size}px`, height: `${size}px`, flex: "0 0 auto", opacity: offline ? 0.7 : 1 }}>
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" style={{ display: "block", transform: "rotate(-90deg)" }}>
                <circle cx={center} cy={center} r={radius} fill="rgba(8, 8, 8, 0.96)" stroke="rgba(125, 160, 212, 0.18)" strokeWidth={strokeWidth} />
                <circle cx={center} cy={center} r={radius} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - clampedRatio) }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.05, pointerEvents: "none" }}>
                <div style={{ color: stroke, fontSize: percentage.length > 5 ? `${Math.max(9, size * 0.14)}px` : `${Math.max(10, size * 0.16)}px`, fontWeight: 800 }}>{percentage}</div>
                <div style={{ color: "#7fda7f", fontSize: `${Math.max(7, size * 0.095)}px`, letterSpacing: "0.08em", marginTop: "2px" }}>{shortLabel}</div>
            </div>
        </div>
    );
}

// A compact horizontal alternative to RamGauge - same underlying data/health logic, but several
// of these stack vertically in the space one circular dial used to take, for places (the top
// quick-stat row) where N dial columns would otherwise cost N times the width of a single stat
// tile instead of just one.
// No source line here (unlike RamGauge/HomeGaugeCard) - this compact bar stacks several to a
// narrow column in the top quick-stat row, with no room for a third line per gauge.
export function RamGaugeBar({ label, shortLabel, used: rawUsed, total: rawTotal, ratio: rawRatio, valueFormat = "ram", offline = false }) {
    const react = getReact();
    if (!react) return null;
    const used = Math.max(0, Number(rawUsed) || 0);
    const total = Math.max(0, Number(rawTotal) || 0);
    const configuredRatio = Number(rawRatio);
    const ratio = Number.isFinite(configuredRatio) && configuredRatio >= 0
        ? configuredRatio
        : total > 0
            ? used / total
            : 0;
    const hasCapacity = total > 0;
    // Offline zeroes the visible fill too, same "don't show stale data" treatment as an offline
    // graph's history line - only the empty track remains, not a bar implying a live reading.
    const clampedRatio = offline ? 0 : Math.max(0, Math.min(1, ratio));
    const health = getRamHealthLevel({ ratio });
    const barColor = offline || !hasCapacity
        ? "#759875"
        : health === "danger"
            ? "#ff7a7a"
            : health === "warn"
                ? "#ffc65c"
                : "#6ee7a8";
    const percentage = offline ? "Offline" : hasCapacity ? formatUtilizationPercent(ratio) : "n/a";
    const formattedUsed = valueFormat === "ram" ? formatRam(used) : used.toLocaleString();
    const formattedTotal = valueFormat === "ram" ? formatRam(total) : total.toLocaleString();
    const title = offline
        ? `${label}: offline`
        : hasCapacity
            ? `${label}: ${formattedUsed} / ${formattedTotal} (${percentage})`
            : `${label}: no capacity`;

    return (
        <div role="meter" aria-label={`${label} utilization`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100, ratio * 100)} title={title} style={{ display: "flex", flexDirection: "column", gap: "1px", width: "100%", opacity: offline ? 0.7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "4px", fontSize: "8px", lineHeight: 1, letterSpacing: "0.04em" }}>
                <span style={{ color: "#7fda7f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shortLabel}</span>
                <span style={{ color: barColor, fontWeight: 700, whiteSpace: "nowrap" }}>{percentage}</span>
            </div>
            <div style={{ position: "relative", height: "5px", borderRadius: "3px", background: "rgba(125, 160, 212, 0.16)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${clampedRatio * 100}%`, background: barColor, borderRadius: "3px" }} />
            </div>
        </div>
    );
}
