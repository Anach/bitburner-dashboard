export function buildWorkspaceIntegrationService(plugin) {
    const integration = plugin?.metadata ?? {};
    const filename = plugin?.filename ?? "";
    const serviceId = plugin?.serviceId ?? "";
    const workspaceId = typeof integration.workspaceId === "string" && integration.workspaceId
        ? integration.workspaceId
        : serviceId;
    const menuLabel = plugin?.menuLabel || serviceId || "Workspace";

    return {
        id: serviceId,
        menuGroup: plugin?.menuGroup,
        menuLabel,
        alwaysVisible: plugin?.alwaysVisible,
        rendererKey: "plugin.workspace",
        defaultPanelId: "",
        subviews: [],
        getPanels: () => [],
        getHealth: ({ homeScripts }) => {
            const running = (homeScripts ?? []).some((script) => script?.filename === filename && script?.running);
            return {
                level: "neutral",
                summary: running
                    ? `${menuLabel} workspace provider is running.`
                    : `${menuLabel} starts when its workspace is opened.`,
                panels: {},
                panelSummaries: {},
            };
        },
        workspaceId,
    };
}
