const DASHBOARD_TAIL_TITLE_CSS = `
.drag > .MuiTypography-root:has([data-automation-dashboard-tail-title]) {
    flex: 1 1 auto;
    min-width: 0;
    margin-right: 0 !important;
}
.drag > .MuiTypography-root:has([data-automation-dashboard-tail-title])
    > .MuiTypography-root:has(> [data-automation-dashboard-tail-title]) {
    display: block;
    min-width: 0;
    width: 100%;
}
[data-automation-dashboard-tail-restart]:hover {
    background: rgba(128, 128, 128, 0.18) !important;
}
[data-automation-dashboard-tail-restart]:focus-visible {
    outline: 1px solid currentColor;
    outline-offset: -2px;
}
`;

function stopTitleControlEvent(event, preventDefault = false) {
    if (preventDefault) event?.preventDefault?.();
    event?.stopPropagation?.();
}

export function buildDashboardTailTitle(react, title = "Automation Dashboard", onRestart = null) {
    const label = String(title ?? "Automation Dashboard");
    if (!react?.createElement) return label;
    const element = react.createElement;
    return element(
        react.Fragment,
        null,
        element("style", null, DASHBOARD_TAIL_TITLE_CSS),
        element(
            "span",
            {
                "data-automation-dashboard-tail-title": "",
                style: {
                    alignItems: "center",
                    display: "flex",
                    height: "33px",
                    minWidth: 0,
                    width: "100%",
                },
            },
            element("span", {
                style: {
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                },
            }, label),
            element(
                "button",
                {
                    "aria-label": "Restart dashboard",
                    "data-automation-dashboard-tail-restart": "",
                    onClick: (event) => {
                        stopTitleControlEvent(event, true);
                        if (typeof onRestart === "function") onRestart();
                    },
                    onMouseDown: (event) => stopTitleControlEvent(event),
                    onTouchStart: (event) => stopTitleControlEvent(event),
                    style: {
                        alignItems: "center",
                        alignSelf: "stretch",
                        background: "transparent",
                        border: "none",
                        borderLeft: "1px solid rgba(128, 128, 128, 0.45)",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        flex: "0 0 33px",
                        font: "inherit",
                        fontSize: "24px",
                        justifyContent: "center",
                        lineHeight: 1,
                        margin: 0,
                        padding: 0,
                        width: "33px",
                    },
                    title: "Restart dashboard",
                    type: "button",
                },
                element("span", { "aria-hidden": "true", style: { transform: "translateY(-1px)" } }, "↻")
            )
        )
    );
}
