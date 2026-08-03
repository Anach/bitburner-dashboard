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

export function Card({ title, accent, subtitle, children, widgetStyles }) {
    const react = getReact();
    const styles = widgetStyles ?? getWidgetStyles();
    if (!react) return null;
    return (
        <section data-dashboard-theme-role="card-frame" style={styles.card}>
            <div style={styles.cardHeader}>
                <div>
                    <div data-dashboard-theme-role="data-heading" style={styles.cardTitle}>{title}</div>
                    {subtitle ? <div style={{ ...styles.muted, marginTop: "4px" }}>{subtitle}</div> : null}
                </div>
                <div style={{ ...styles.cardAccent, background: accent }} />
            </div>
            <div style={styles.cardBody}>{children}</div>
        </section>
    );
}

export function BadgeLine({ label, value, tone = "neutral" }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    return (
        <div data-dashboard-theme-role="data-row" style={{ ...styles.item, borderColor: tone === "success" ? "rgba(110, 231, 168, 0.25)" : tone === "warn" ? "rgba(255, 198, 92, 0.25)" : tone === "danger" ? "rgba(255, 122, 122, 0.25)" : "rgba(125, 160, 212, 0.12)" }}>
            <div data-dashboard-theme-role="data-heading" style={styles.itemTitle}>{label}</div>
            <div data-dashboard-theme-role="data-value" style={styles.itemDetail}>{value}</div>
        </div>
    );
}
