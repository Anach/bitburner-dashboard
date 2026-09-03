import { isServiceVisibleInMenu } from "dashboard/libs/dashboard-options.js";
import { isOptionLabelMap } from "dashboard/libs/plugin-integration.js";

const DASHBOARD_WORKSPACE_WIDGET_TYPES = new Set(["player-stats"]);
const DASHBOARD_WIDGET_HEADER_ACTION_ICONS = new Set(["mail"]);
// Where a dashboardOptions contribution asks to be rendered. A contribution that omits placement
// keeps the original behavior (the global Dashboard Options panel), so this stays additive for any
// descriptor written before placement existed.
export const DASHBOARD_OPTION_CONTRIBUTION_PLACEMENTS = new Set(["dashboard-options", "system-overview"]);
export const DEFAULT_DASHBOARD_OPTION_CONTRIBUTION_PLACEMENT = "dashboard-options";

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

export function buildPluginDashboardOptionInputs(
    services,
    optionValues = {},
    placement = DEFAULT_DASHBOARD_OPTION_CONTRIBUTION_PLACEMENT
) {
    const targetPlacement = DASHBOARD_OPTION_CONTRIBUTION_PLACEMENTS.has(placement)
        ? placement
        : DEFAULT_DASHBOARD_OPTION_CONTRIBUTION_PLACEMENT;
    return (Array.isArray(services) ? services : []).flatMap((service) => {
        // Same guard selectDashboardWidgetHeaderActions uses: a service hidden from the menu should
        // not leave one of its controls stranded in a global panel.
        if (!isServiceVisibleInMenu(service?.id, optionValues)) return [];
        const contributions = service?.pluginMetadata?.dashboardOptions;
        if (!Array.isArray(contributions)) return [];
        return contributions.flatMap((contribution) => {
            if (!contribution || typeof contribution !== "object" || contribution.enabled === false) return [];
            if (typeof contribution.id !== "string" || typeof contribution.label !== "string") return [];
            if (typeof contribution.optionKey !== "string") return [];
            const contributionPlacement = typeof contribution.placement === "string"
                ? contribution.placement
                : DEFAULT_DASHBOARD_OPTION_CONTRIBUTION_PLACEMENT;
            if (contributionPlacement !== targetPlacement) return [];
            // A select's choice list normally reaches the renderer as `options`, translated from a
            // descriptor's `values` by buildPluginIntegrationInputs. Contributions skip that path, so
            // resolve the same list from the plugin's own option definition rather than making a
            // contribution restate an enum its descriptor already declares.
            const optionDefinition = service?.pluginMetadata?.options?.[contribution.optionKey];
            const declaredValues = optionDefinition?.values;
            const resolvedOptions = Array.isArray(contribution.options)
                ? contribution.options
                : (Array.isArray(declaredValues) ? declaredValues : null);
            // Display-only labels resolve from the same option definition the panel inputs use, so
            // one setting reads identically wherever it is surfaced. The stored value stays the id.
            const resolvedLabels = isOptionLabelMap(contribution.optionLabels)
                ? contribution.optionLabels
                : (isOptionLabelMap(optionDefinition?.labels) ? optionDefinition.labels : null);
            return [{
                ...contribution,
                ...(resolvedOptions ? { options: resolvedOptions } : {}),
                ...(resolvedLabels ? { optionLabels: resolvedLabels } : {}),
                value: optionValues?.[contribution.optionKey],
                contributionServiceId: service.id,
            }];
        });
    }).sort((left, right) => {
        const orderDifference = (Number(left.order) || 0) - (Number(right.order) || 0);
        return orderDifference || left.id.localeCompare(right.id);
    });
}
