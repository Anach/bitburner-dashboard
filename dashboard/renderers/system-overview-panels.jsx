import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import { RamGauge } from "dashboard/renderers/dashboard-metrics.jsx";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});
let formatResourceValue = () => "n/a";

export function configureSystemOverviewPanels({ getTheme, getStyles, formatResource } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
    if (typeof formatResource === "function") formatResourceValue = formatResource;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

export function HomePanel({ title, subtitle = "", children, widgetStyles }) {
    const react = getReact();
    const styles = widgetStyles ?? getWidgetStyles();
    if (!react) return null;
    return (
        <section data-dashboard-theme-role="card-frame" style={styles.homePanel}>
            <div style={styles.homePanelHeader}>
                <div style={styles.homePanelTitle}>{title}</div>
                {subtitle ? <div style={styles.homePanelSubtitle}>{subtitle}</div> : null}
            </div>
            {children}
        </section>
    );
}

export function PluginRuntimeWarning({ statuses = [] }) {
    const react = getReact();
    if (!react) return null;
    const stoppedStatuses = (Array.isArray(statuses) ? statuses : [])
        .filter((status) => status?.requiresRuntime && !status?.running);
    if (stoppedStatuses.length === 0) return null;

    const serviceNames = stoppedStatuses
        .map((status) => String(status.label ?? status.serviceId ?? "Plugin"))
        .join(", ");
    return (
        <div
            role="status"
            style={{
                marginBottom: "8px",
                padding: "6px 8px",
                color: "#ffd17a",
                fontSize: "9px",
                lineHeight: 1.35,
                border: "1px solid rgba(255, 198, 92, 0.35)",
                borderRadius: "6px",
                background: "rgba(34, 24, 10, 0.92)",
            }}
        >
            <strong>{serviceNames}</strong> {stoppedStatuses.length === 1 ? "service is" : "services are"} stopped. Showing cached data.
        </div>
    );
}

function getHomeTonePalette(tone = "neutral") {
    const palettes = {
        neutral: { accent: "#9ab0cc", border: "rgba(125, 160, 212, 0.2)", glow: "rgba(125, 160, 212, 0.08)" },
        info: { accent: "#8fc5ff", border: "rgba(108, 180, 255, 0.3)", glow: "rgba(108, 180, 255, 0.1)" },
        success: { accent: "#8ef0b5", border: "rgba(110, 231, 168, 0.3)", glow: "rgba(110, 231, 168, 0.1)" },
        warn: { accent: "#ffd17a", border: "rgba(255, 198, 92, 0.32)", glow: "rgba(255, 198, 92, 0.1)" },
        danger: { accent: "#ff9a9a", border: "rgba(255, 122, 122, 0.34)", glow: "rgba(255, 122, 122, 0.1)" },
    };
    return palettes[tone] ?? palettes.neutral;
}

export function HomeMetricCard({ metric }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const palette = getHomeTonePalette(metric?.tone);
    return (
        <div title={`${metric?.label ?? "Metric"}: ${metric?.value ?? "n/a"}`} style={{ ...styles.homeMetric, borderColor: palette.border, background: `linear-gradient(140deg, ${palette.glow}, rgba(5, 9, 8, 0.82) 58%)`, boxShadow: `inset 0 -2px 0 ${palette.accent}` }}>
            <div style={styles.homeMetricLabel}>{metric?.label ?? "Metric"}</div>
            <div data-dashboard-theme-role="stat-value" style={{ ...styles.homeMetricValue, color: palette.accent }}>{metric?.value ?? "n/a"}</div>
            {metric?.sourceLabel ? <div style={styles.homeMetricSource}>{metric.sourceLabel}</div> : null}
        </div>
    );
}

export function HomeHealthRing({ counts }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const segments = [
        { id: "danger", label: "Danger", count: Math.max(0, Number(counts?.danger) || 0), color: "#ff7a7a" },
        { id: "warn", label: "Warning", count: Math.max(0, Number(counts?.warn) || 0), color: "#ffc65c" },
        { id: "healthy", label: "Healthy", count: Math.max(0, Number(counts?.healthy) || 0), color: "#6ee7a8" },
    ];
    const total = segments.reduce((sum, segment) => sum + segment.count, 0);
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const ringSegments = segments.map((segment) => {
        const length = total > 0 ? (segment.count / total) * circumference : 0;
        const ring = { ...segment, length, offset };
        offset += length;
        return ring;
    });
    return (
        <div style={styles.homeHealthLayout}>
            <div style={{ position: "relative", width: "108px", height: "108px" }}>
                <svg viewBox="0 0 108 108" width="108" height="108" aria-label={`${total} monitored services`}>
                    <circle cx="54" cy="54" r={radius} fill="rgba(4, 8, 7, 0.86)" stroke="rgba(125, 160, 212, 0.14)" strokeWidth="10" />
                    {ringSegments.filter((segment) => segment.length > 0).map((segment) => <circle key={segment.id} cx="54" cy="54" r={radius} fill="none" stroke={segment.color} strokeWidth="10" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 54 54)" />)}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ color: "#e7fff0", fontSize: "20px", fontWeight: 800 }}>{total}</div>
                    <div style={{ color: "#6c8b78", fontSize: "7px", letterSpacing: "0.12em" }}>SERVICES</div>
                </div>
            </div>
            <div style={styles.homeHealthLegend}>{segments.map((segment) => <div key={segment.id} style={styles.homeHealthLegendRow}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: segment.color }} />
                <span>{segment.label}</span><span style={{ color: segment.color, fontWeight: 800 }}>{segment.count}</span>
            </div>)}</div>
        </div>
    );
}

export function HomeGaugeCard({ gauge, size = 84 }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const used = Math.max(0, Number(gauge?.used) || 0);
    const total = Math.max(0, Number(gauge?.total) || 0);
    const valueFormat = gauge?.valueFormat ?? "number";
    return <div style={styles.homeGaugeCard}>
        <RamGauge {...gauge} size={size} />
        <div style={styles.homeGaugeValue}>{formatResourceValue(used, valueFormat)} / {formatResourceValue(total, valueFormat)}</div>
    </div>;
}

export function HomeServiceLandscape({ groups, healthById }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    return <div style={styles.homeServiceGrid}>{(Array.isArray(groups) ? groups : []).map((group) => {
        const counts = (group.services ?? []).reduce((result, service) => {
            const level = healthById?.[service.id]?.level ?? "neutral";
            if (level === "danger") result.danger += 1;
            else if (level === "warn") result.warn += 1;
            else result.healthy += 1;
            return result;
        }, { danger: 0, warn: 0, healthy: 0 });
        const total = group.services?.length ?? 0;
        const segments = [{ id: "danger", count: counts.danger, color: "#ff7a7a" }, { id: "warn", count: counts.warn, color: "#ffc65c" }, { id: "healthy", count: counts.healthy, color: "#6ee7a8" }];
        return <div key={group.id} style={styles.homeServiceRow}>
            <div style={styles.homeServiceLabel}><span>{group.title}</span><span>{total}</span></div>
            <div style={styles.homeServiceBar} title={`${group.title}: ${counts.healthy} healthy, ${counts.warn} warning, ${counts.danger} danger`}>
                {segments.filter((segment) => segment.count > 0).map((segment) => <span key={segment.id} style={{ width: `${total > 0 ? (segment.count / total) * 100 : 0}%`, background: segment.color, boxShadow: `0 0 8px ${segment.color}44` }} />)}
            </div>
        </div>;
    })}</div>;
}
