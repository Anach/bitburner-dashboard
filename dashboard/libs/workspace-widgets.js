const DASHBOARD_WORKSPACE_WIDGET_TYPES = new Set(["player-stats"]);

export function selectDashboardWorkspaceWidgets(services, selectedService, selectedItem) {
    const selectedMenuGroup = String(selectedService?.menuGroup ?? "");
    if (!selectedMenuGroup) return [];

    return (Array.isArray(services) ? services : []).flatMap((service) => {
        const contributions = service?.pluginMetadata?.workspaceWidgets;
        if (!Array.isArray(contributions)) return [];
        return contributions.flatMap((contribution) => {
            if (!contribution || typeof contribution !== "object" || contribution.enabled === false) return [];
            if (typeof contribution.id !== "string" || !DASHBOARD_WORKSPACE_WIDGET_TYPES.has(contribution.type)) return [];
            if (Array.isArray(contribution.menuGroups) && !contribution.menuGroups.includes(selectedMenuGroup)) return [];
            if (Array.isArray(contribution.itemIds) && !contribution.itemIds.includes(selectedItem)) return [];
            return [{ ...contribution, contributionServiceId: service.id }];
        });
    });
}

export function buildPluginDashboardOptionInputs(services, optionValues = {}) {
    return (Array.isArray(services) ? services : []).flatMap((service) => {
        const contributions = service?.pluginMetadata?.dashboardOptions;
        if (!Array.isArray(contributions)) return [];
        return contributions.flatMap((contribution) => {
            if (!contribution || typeof contribution !== "object" || contribution.enabled === false) return [];
            if (typeof contribution.id !== "string" || typeof contribution.label !== "string") return [];
            if (typeof contribution.optionKey !== "string") return [];
            return [{
                ...contribution,
                value: optionValues?.[contribution.optionKey],
                contributionServiceId: service.id,
            }];
        });
    });
}