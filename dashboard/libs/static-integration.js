function getObject(value) {
    return value && typeof value === "object" ? value : {};
}

// Metadata-only integrations create ordinary dashboard services without inventing a Netscript
// process. They are useful for lookup/reference panels assembled from descriptor contributions.
export function buildStaticIntegrationService(plugin) {
    const integration = getObject(plugin?.metadata);
    const panels = Array.isArray(integration.panels) ? integration.panels : [];
    const defaultPanelId = integration.defaultPanelId ?? panels[0]?.id ?? "status";

    return {
        id: integration.serviceId,
        menuGroup: integration.menuGroup,
        menuLabel: integration.menuLabel,
        alwaysVisible: integration.alwaysVisible !== false,
        rendererKey: "plugin.static",
        defaultPanelId,
        subviews: panels.map(({ id, label }) => ({ id, label })),
        getPanels: () => panels.map(({ id, label }) => ({ id, label })),
        panelMeta: Object.fromEntries(
            panels.map(({ id, label, ...metadata }) => [id, { title: label, ...metadata }])
        ),
    };
}
