function dashboardCabinetTheme(dashboardTheme) {
    const gameTheme = dashboardTheme?.gameTheme ?? {};
    return {
        primary: String(gameTheme.primary || "#00ff00"),
        primarydark: String(gameTheme.primarydark || "#007700"),
        secondary: String(gameTheme.secondary || "#cccccc"),
        info: String(gameTheme.info || "#66aaff"),
        error: String(gameTheme.error || "#ff4444"),
        disabled: String(gameTheme.disabled || gameTheme.secondary || "#777777"),
        background: String(gameTheme.backgroundprimary || "#000000"),
        surface: String(gameTheme.backgroundsecondary || gameTheme.backgroundprimary || "#000000"),
        button: String(gameTheme.button || gameTheme.backgroundsecondary || "transparent"),
    };
}

/** Responsive scripts-owned cabinet host for the dashboard's persistent workspace adapter. */
export function DashboardWorkspaceCabinet({ cabinet, cabinetProps = {}, dashboardTheme }) {
    const React = globalThis.React;
    const rootRef = React.useRef(null);
    const typography = dashboardTheme?.typography ?? {};
    const layoutRef = React.useRef({
        width: 1,
        height: 1,
        fontFamily: String(typography.fontFamily || '"Lucida Console", "Consolas", monospace'),
        fontSize: Number(typography.rootFontSize) || 16,
        lineHeight: Number(typography.lineHeight) || 1.5,
    });
    const themeRef = React.useRef(dashboardCabinetTheme(dashboardTheme));
    themeRef.current = dashboardCabinetTheme(dashboardTheme);

    React.useLayoutEffect(() => {
        const element = rootRef.current;
        if (!element) return undefined;
        const measure = () => {
            layoutRef.current = {
                width: Math.max(1, element.clientWidth),
                height: Math.max(1, element.clientHeight),
                fontFamily: String(typography.fontFamily || '"Lucida Console", "Consolas", monospace'),
                fontSize: Number(typography.rootFontSize) || 16,
                lineHeight: Number(typography.lineHeight) || 1.5,
            };
        };
        measure();
        if (typeof globalThis.ResizeObserver === "function") {
            const observer = new globalThis.ResizeObserver(measure);
            observer.observe(element);
            return () => observer.disconnect();
        }
        const timer = globalThis.setInterval(measure, 250);
        return () => globalThis.clearInterval(timer);
    }, [typography.fontFamily, typography.rootFontSize, typography.lineHeight]);

    return React.createElement("div", {
        ref: rootRef,
        style: {
            boxSizing: "border-box",
            display: "flex",
            flex: "1 1 auto",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            background: themeRef.current.background,
        },
    }, React.createElement(cabinet, {
        ...cabinetProps,
        embedded: true,
        layoutRef,
        themeRef,
    }));
}


