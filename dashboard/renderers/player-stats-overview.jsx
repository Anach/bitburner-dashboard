import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});
let getTonePalette = () => ({ accent: "#9ab0cc" });
const DASHBOARD_HUD_THEME_COLORS = {
    hp: "#ff7a7a",
    money: "#ffd17a",
    hack: "#8ef0b5",
    combat: "#e4f8e9",
    cha: "#c084fc",
    int: "#8fc5ff",
    rep: "#e4f8e9",
    primary: "#8ef0b5",
    secondary: "#9ab0a0",
    maplocation: "#e4f8e9",
};

export function configurePlayerStatsOverview({ getTheme, getStyles, getTone } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
    if (typeof getTone === "function") getTonePalette = getTone;
}

function getThemeColor(theme, themeColor, fallback) {
    const key = String(themeColor ?? "").trim().toLowerCase();
    if (!key) return fallback;
    if (theme?.followGame && typeof theme?.gameTheme?.[key] === "string") return theme.gameTheme[key];
    return DASHBOARD_HUD_THEME_COLORS[key] ?? fallback;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

export function PlayerStatsOverview({ definitions, dashboardTheme, groupIds, orientation = "horizontal" }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const selectedGroupIds = Array.isArray(groupIds) && groupIds.length > 0
        ? new Set(groupIds.filter((value) => typeof value === "string"))
        : null;
    const groups = (Array.isArray(definitions) ? definitions : [])
        .flatMap((definition) => definition.groups ?? [])
        .filter((group) => !selectedGroupIds || selectedGroupIds.has(group.sourceId));
    const vertical = String(orientation).trim().toLowerCase() === "vertical";

    return <div style={{ ...styles.homePlayerGroupGrid, ...(vertical ? { gridTemplateColumns: "1fr", gap: "8px" } : {}) }}>
        {groups.map((group) => <section key={group.id} style={styles.homePlayerGroup}>
            <div data-dashboard-theme-role="data-heading" style={{ ...styles.heading, marginBottom: "3px" }}>{group.title}</div>
            <div style={{ ...styles.homePlayerStatGrid, ...(vertical ? { gridTemplateColumns: "1fr", gap: "1px" } : {}) }}>
                {group.items.map((item) => {
                    const palette = getTonePalette(item.tone);
                    const itemColor = getThemeColor(dashboardTheme, item.themeColor, palette.accent);
                    const itemThemeRole = item.themeColor ? `player-stat-${item.themeColor}` : "";
                    const hasProgress = Number.isFinite(item.progress);
                    const progress = hasProgress ? Math.max(0, Math.min(1, Number(item.progress))) : 0;
                    return <div key={item.id} title={`${item.label}: ${item.value}`} style={styles.homePlayerStat}>
                        <div style={styles.homePlayerStatLine}>
                            <div data-dashboard-theme-role={itemThemeRole} style={{ ...styles.pillLabel, marginBottom: 0, color: itemColor }}>{item.label}</div>
                            <div data-dashboard-theme-role={itemThemeRole} style={{ color: itemColor, minWidth: 0, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
                        </div>
                        {hasProgress ? <div style={{ height: "3px", marginTop: "3px", overflow: "hidden", background: "rgba(125, 160, 212, 0.16)" }}>
                            <div data-dashboard-theme-role={itemThemeRole} style={{ width: `${progress * 100}%`, height: "100%", background: itemColor }} />
                        </div> : null}
                    </div>;
                })}
            </div>
        </section>)}
    </div>;
}
