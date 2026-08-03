import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);

export function configureDashboardShell({ getTheme } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

export function DashboardShell({ dashboardTheme, dashboardLayout, widgetStyles, children }) {
    const react = getReact();
    if (!react) return null;
    return <div data-dashboard-theme-role="app-frame" style={{
        ...widgetStyles.shell,
        fontFamily: dashboardTheme.typography.fontFamily,
        lineHeight: dashboardTheme.typography.lineHeight,
        height: `${dashboardLayout.contentHeight}px`,
        minHeight: `${dashboardLayout.contentHeight}px`,
        maxHeight: `${dashboardLayout.contentHeight}px`,
    }}>
        {children}
    </div>;
}