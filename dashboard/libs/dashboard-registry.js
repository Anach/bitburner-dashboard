import { isServiceVisibleInMenu, normalizeHideUnqualifiedPluginsMode } from "dashboard/libs/dashboard-options.js";
import { isHiddenByQualificationMode } from "dashboard/libs/plugin-requirements.js";

export function validateDashboardServices(services = [], menuGroupIds, strictMode = false) {
    const issues = [];
    const validServices = [];
    const seenIds = new Set();

    for (const service of services) {
        if (!service || typeof service !== "object") {
            issues.push("Service entry is not an object.");
            continue;
        }
        if (typeof service.id !== "string" || service.id.length === 0) {
            issues.push("Service is missing a valid id.");
            continue;
        }
        if (seenIds.has(service.id)) {
            issues.push(`Duplicate service id: ${service.id}`);
            continue;
        }
        seenIds.add(service.id);
        if (!(menuGroupIds instanceof Set) || !menuGroupIds.has(service.menuGroup)) {
            issues.push(`Service ${service.id} references unknown menu group: ${service.menuGroup}`);
            continue;
        }
        if (typeof service.menuLabel !== "string" || service.menuLabel.length === 0) {
            issues.push(`Service ${service.id} is missing menuLabel.`);
            continue;
        }
        if (service.subviews != null && !Array.isArray(service.subviews)) {
            issues.push(`Service ${service.id} has non-array subviews.`);
            continue;
        }
        if (Array.isArray(service.subviews)) {
            const panelIds = new Set();
            for (const panel of service.subviews) {
                if (!panel || typeof panel.id !== "string" || typeof panel.label !== "string") {
                    issues.push(`Service ${service.id} has invalid subview.`);
                    continue;
                }
                panelIds.add(panel.id);
            }
            if (service.defaultPanelId && !panelIds.has(service.defaultPanelId)) {
                issues.push(`Service ${service.id} defaultPanelId is not present in subviews.`);
                if (strictMode) continue;
            }
        }
        validServices.push(service);
    }

    return { services: validServices, byId: new Map(validServices.map((service) => [service.id, service])), issues };
}

export function validateDashboardViews(views = [], menuGroupIds, viewRenderers, homeWidgetTypes) {
    const validViews = [];
    const seenIds = new Set();
    for (const view of views) {
        if (!view || typeof view !== "object") continue;
        if (typeof view.id !== "string" || !view.id || seenIds.has(view.id)) continue;
        if (!(menuGroupIds instanceof Set) || !menuGroupIds.has(view.menuGroup)) continue;
        if (!(viewRenderers instanceof Set) || !viewRenderers.has(view.renderer)) continue;
        if (!Array.isArray(view.widgets)) continue;
        const widgetIds = new Set();
        const widgets = view.widgets.filter((widget) => {
            const valid = widget
                && typeof widget === "object"
                && widget.enabled !== false
                && typeof widget.id === "string"
                && widget.id.length > 0
                && !widgetIds.has(widget.id)
                && homeWidgetTypes instanceof Set
                && homeWidgetTypes.has(widget.type);
            if (valid) widgetIds.add(widget.id);
            return valid;
        });
        seenIds.add(view.id);
        validViews.push({ ...view, widgets });
    }
    return { views: validViews, byId: new Map(validViews.map((view) => [view.id, view])) };
}

export function applyDashboardViewWidgetContributions(views = [], services = []) {
    const widgetsByViewId = new Map();
    const layoutByViewId = new Map();
    for (const service of services) {
        const contributions = service?.pluginMetadata?.viewWidgets;
        if (!Array.isArray(contributions)) continue;
        for (const contribution of contributions) {
            const viewId = typeof contribution?.viewId === "string" ? contribution.viewId : "";
            if (!viewId) continue;
            const { viewId: ignoredViewId, viewLayout, ...widget } = contribution;
            if (viewLayout && typeof viewLayout === "object" && !Array.isArray(viewLayout)) {
                layoutByViewId.set(viewId, { ...(layoutByViewId.get(viewId) ?? {}), ...viewLayout });
            }
            const widgets = widgetsByViewId.get(viewId) ?? [];
            widgets.push(widget);
            widgetsByViewId.set(viewId, widgets);
        }
    }
    return views.map((view) => ({
        ...view,
        layout: { ...(view?.layout ?? {}), ...(layoutByViewId.get(view?.id) ?? {}) },
        widgets: [...(Array.isArray(view?.widgets) ? view.widgets : []), ...(widgetsByViewId.get(view?.id) ?? [])],
    }));
}

export function getDefaultSelectedServiceId(services = [], menuGroups = []) {
    for (const group of menuGroups) {
        const service = services.find((candidate) => candidate.menuGroup === group.id);
        if (service) return service.id;
    }
    return services[0]?.id ?? "";
}

export function buildDashboardMenuGroups(services = [], menuGroups = [], options = {}, pluginRequirements = {}) {
    const hideMode = normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode);
    return menuGroups.map((group) => ({
        id: group.id,
        title: group.title,
        items: services
            .filter((service) => service.menuGroup === group.id && service.menuVisible !== false)
            .filter((service) => isServiceVisibleInMenu(service.id, options))
            .filter((service) => !isHiddenByQualificationMode(pluginRequirements?.[service.id], hideMode))
            .map((service) => ({ id: service.id, label: service.menuLabel, alwaysVisible: Boolean(service.alwaysVisible) })),
    }));
}

// Some plugins (Mailbox, Network Map, File Manager, Script Log) hide their own service entry
// (menuVisible: false) and instead surface a full-window VIEW as the actual clickable menu
// item - hiding the service itself would have no visible effect for those, so callers that
// need to target "whatever actually shows in the nav" look up the view backed by a service id.
export function findAssociatedViewForService(views = [], serviceId) {
    if (typeof serviceId !== "string" || !serviceId) return null;
    return views.find((view) => view?.data?.serviceId === serviceId) ?? null;
}

// Views with no backing service (e.g. File Manager, Script Log) never get discovered as a
// "plugin script" - there's no running process to point at. They still need a selectable row
// in the Plugins list so their left-nav menu entry can be hidden/shown like everything else.
export function getViewOnlyPluginEntries(views = []) {
    return views
        .filter((view) => typeof view?.data?.serviceId !== "string" || !view.data.serviceId)
        .map((view) => ({
            id: `view:${view.id}`,
            label: view.menuLabel,
            running: undefined,
            daemon: false,
            viewOnly: true,
            viewId: view.id,
        }));
}

export function isViewQualified(view, pluginRequirements, hideMode) {
    const serviceId = view?.data?.serviceId;
    if (typeof serviceId !== "string" || !serviceId) return true;
    return !isHiddenByQualificationMode(pluginRequirements?.[serviceId], hideMode);
}
