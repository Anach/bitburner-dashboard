import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});

export function configureDashboardPanels({ getTheme, getStyles } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

// No accent dot: it read as confusingly close to the service-status dots elsewhere in the
// dashboard, once those existed. Every call site still passes an `accent` prop; it's simply
// ignored now rather than stripped from ~12 call sites for a purely cosmetic change. The wrapper
// div stretches (flex: 1 1 auto) so a title node with its own internal flex layout (e.g. the Start
// Order card's title + right-aligned "Combined total" figure) can reach the card's true right edge.
export function Card({ title, subtitle, children, widgetStyles }) {
    const react = getReact();
    const styles = widgetStyles ?? getWidgetStyles();
    if (!react) return null;
    return (
        <section data-dashboard-theme-role="card-frame" style={styles.card}>
            <div style={styles.cardHeader}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <div data-dashboard-theme-role="data-heading" style={styles.cardTitle}>{title}</div>
                    {subtitle ? <div style={{ ...styles.muted, marginTop: "4px" }}>{subtitle}</div> : null}
                </div>
            </div>
            <div style={styles.cardBody}>{children}</div>
        </section>
    );
}

// Matches the same success/warn/danger hues this component already borders itself with, plus every
// other "warn" surface in the dashboard (renderHealthBadge, menuItemButtonActiveWarn, etc.) - a
// warn-toned value (e.g. a network-child status stuck on "waiting-for-ram") now reads as a blocker
// in the value text itself, not just a faint border tint. Neutral is left as this component's
// existing default color, unchanged.
const BADGE_LINE_VALUE_TONE_COLORS = {
    success: "#6ee7a8",
    warn: "#ffd88a",
    danger: "#ff9a9a",
};

export function BadgeLine({ label, value, tone = "neutral", sourceLabel }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const valueColor = BADGE_LINE_VALUE_TONE_COLORS[tone];
    return (
        <div data-dashboard-theme-role="data-row" style={{ ...styles.item, borderColor: tone === "success" ? "rgba(110, 231, 168, 0.25)" : tone === "warn" ? "rgba(255, 198, 92, 0.25)" : tone === "danger" ? "rgba(255, 122, 122, 0.25)" : "rgba(125, 160, 212, 0.12)" }}>
            <div data-dashboard-theme-role="data-heading" style={styles.itemTitle}>{label}</div>
            <div data-dashboard-theme-role="data-value" style={valueColor ? { ...styles.itemDetail, color: valueColor } : styles.itemDetail}>{value}</div>
            {sourceLabel ? <div style={styles.homeMetricSource}>via {sourceLabel}</div> : null}
        </div>
    );
}
