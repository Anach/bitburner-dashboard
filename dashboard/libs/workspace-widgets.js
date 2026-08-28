import { isServiceVisibleInMenu } from "dashboard/libs/dashboard-options.js";

const DASHBOARD_WORKSPACE_WIDGET_TYPES = new Set(["player-stats"]);
const DASHBOARD_WIDGET_HEADER_ACTION_ICONS = new Set(["mail"]);

function readDashboardWidgetHeaderBadgeValue(telemetry, key) {
    if (typeof key !== "string" || key.length === 0) return null;
    const value = key.split(".").reduce((current, segment) => current?.[segment], telemetry);
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : null;
}

export function selectDashboardWidgetHeaderActions(services, targetWidgetType, options = {}, telemetryByServiceId = {}) {
    const targetType = String(targetWidgetType ?? "");
    return (Array.isArray(services) ? services : []).flatMap((service) => {
        if (!isServiceVisibleInMenu(service?.id, options)) return [];
        const contributions = service?.pluginMetadata?.widgetHeaderActions;
        if (!Array.isArray(contributions)) return [];
        return contributions.flatMap((contribution) => {
            if (!contribution || typeof contribution !== "object" || contribution.enabled === false) return [];
            if (typeof contribution.id !== "string" || contribution.targetWidgetType !== targetType) return [];
            if (!DASHBOARD_WIDGET_HEADER_ACTION_ICONS.has(contribution.icon)) return [];
            if (typeof contribution.label !== "string" || typeof contribution.navigateToServiceId !== "string") return [];
            return [{
                ...contribution,
                badgeValue: readDashboardWidgetHeaderBadgeValue(
                    telemetryByServiceId?.[service.id],
                    contribution.badgeKey
                ),
                contributionServiceId: service.id,
                contributionSourceLabel: service.menuLabel,
            }];
        });
    }).sort((left, right) => {
        const orderDifference = (Number(left.order) || 0) - (Number(right.order) || 0);
        return orderDifference || left.id.localeCompare(right.id);
    });
}

export function selectDashboardWorkspaceWidgets(services, selectedService, selectedItem, activeView = null) {
    // Full-window views own the complete dashboard surface. Do not derive workspace-widget
    // visibility from the service that happened to be selected before the view was opened.
    if (activeView) return [];

    const selectedMenuGroup = String(selectedService?.menuGroup ?? "");
    if (!selectedMenuGroup) return [];

    return (Array.isArray(services) ? services : []).flatMap((service) => {
        const contributions = service?.pluginMetadata?.workspaceWidgets;
        if (!Array.isArray(contributions)) return [];
        return contributions.flatMap((contribution) => {
            if (!contribution || typeof contribution !== "object" || contribution.enabled === false) return [];
            if (typeof contribution.id !== "string" || !DASHBOARD_WORKSPACE_WIDGET_TYPES.has(contribution.type)) return [];
            if (Array.isArray(contribution.menuGroups) && !contribution.menuGroups.includes(selectedMenuGroup)) return [];
            if (Array.isArray(contribution.excludeMenuGroups) && contribution.excludeMenuGroups.includes(selectedMenuGroup)) return [];
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
