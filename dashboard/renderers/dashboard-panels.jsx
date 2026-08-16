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

export function BadgeLine({ label, value, tone = "neutral", sourceLabel }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    return (
        <div data-dashboard-theme-role="data-row" style={{ ...styles.item, borderColor: tone === "success" ? "rgba(110, 231, 168, 0.25)" : tone === "warn" ? "rgba(255, 198, 92, 0.25)" : tone === "danger" ? "rgba(255, 122, 122, 0.25)" : "rgba(125, 160, 212, 0.12)" }}>
            <div data-dashboard-theme-role="data-heading" style={styles.itemTitle}>{label}</div>
            <div data-dashboard-theme-role="data-value" style={styles.itemDetail}>{value}</div>
            {sourceLabel ? <div style={styles.homeMetricSource}>via {sourceLabel}</div> : null}
        </div>
    );
}
