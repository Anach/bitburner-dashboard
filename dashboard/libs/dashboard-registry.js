import { isServiceVisibleInMenu, normalizeHideUnqualifiedPluginsMode } from "dashboard/libs/dashboard-options.js";
import { isHiddenByQualificationMode } from "dashboard/libs/plugin-requirements.js";

const DASHBOARD_MENU_GROUP_ID_PATTERN = /^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/;
const DEFAULT_DYNAMIC_MENU_GROUP_ORDER = 500;
export const DEFAULT_DASHBOARD_MENU_GROUP_ID = "general";

export function normalizeDashboardMenuGroupId(value) {
    const id = typeof value === "string" ? value.trim() : "";
    return DASHBOARD_MENU_GROUP_ID_PATTERN.test(id) ? id : "";
}

export function resolveDashboardMenuGroupId(value) {
    if (value == null) return DEFAULT_DASHBOARD_MENU_GROUP_ID;
    if (typeof value !== "string") return "";
    const rawId = value.trim();
    return rawId ? normalizeDashboardMenuGroupId(rawId) : DEFAULT_DASHBOARD_MENU_GROUP_ID;
}

export function formatDashboardMenuGroupTitle(value) {
    const id = normalizeDashboardMenuGroupId(value);
    if (!id) return "";
    return id
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[._-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(" ");
}

function finiteMenuGroupOrder(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildDashboardMenuGroupRegistry(services = [], views = [], pinnedGroups = []) {
    const issues = [];
    const candidatesById = new Map();
    const ensureCandidate = (id) => {
        const existing = candidatesById.get(id);
        if (existing) return existing;
        const candidate = {
            id,
            explicitTitles: new Set(),
            explicitOrders: new Set(),
            pinnedTitle: "",
            pinnedOrder: null,
        };
        candidatesById.set(id, candidate);
        return candidate;
    };

    for (const rawGroup of Array.isArray(pinnedGroups) ? pinnedGroups : []) {
        const id = normalizeDashboardMenuGroupId(rawGroup?.id);
        if (!id) {
            issues.push(`Pinned menu group has invalid id: ${String(rawGroup?.id ?? "")}`);
            continue;
        }
        const candidate = ensureCandidate(id);
        candidate.pinnedTitle = typeof rawGroup?.title === "string" && rawGroup.title.trim()
            ? rawGroup.title.trim()
            : formatDashboardMenuGroupTitle(id);
        candidate.pinnedOrder = finiteMenuGroupOrder(rawGroup?.order);
    }

    const contributions = [
        ...(Array.isArray(services) ? services : []),
        ...(Array.isArray(views) ? views : []),
    ];
    for (const contribution of contributions) {
        const id = resolveDashboardMenuGroupId(contribution?.menuGroup);
        if (!id) continue;
        const candidate = ensureCandidate(id);
        if (typeof contribution?.menuGroupLabel === "string" && contribution.menuGroupLabel.trim()) {
            candidate.explicitTitles.add(contribution.menuGroupLabel.trim());
        }
        const order = finiteMenuGroupOrder(contribution?.menuGroupOrder);
        if (order !== null) candidate.explicitOrders.add(order);
    }

    const groups = [...candidatesById.values()].map((candidate) => {
        const titles = [...candidate.explicitTitles].sort((left, right) => left.localeCompare(right));
        const orders = [...candidate.explicitOrders].sort((left, right) => left - right);
        const conflictingTitles = candidate.pinnedTitle
            ? titles.filter((title) => title !== candidate.pinnedTitle)
            : titles.slice(1);
        const conflictingOrders = candidate.pinnedOrder === null
            ? orders.slice(1)
            : orders.filter((order) => order !== candidate.pinnedOrder);
        const selectedTitle = candidate.pinnedTitle || titles[0] || formatDashboardMenuGroupTitle(candidate.id);
        const selectedOrder = candidate.pinnedOrder ?? orders[0] ?? DEFAULT_DYNAMIC_MENU_GROUP_ORDER;
        if (conflictingTitles.length > 0) {
            issues.push(`Menu group ${candidate.id} declares conflicting labels: ${titles.join(", ")}. Using ${selectedTitle}.`);
        }
        if (conflictingOrders.length > 0) {
            issues.push(`Menu group ${candidate.id} declares conflicting order values: ${orders.join(", ")}. Using ${selectedOrder}.`);
        }
        return {
            id: candidate.id,
            title: selectedTitle,
            order: selectedOrder,
        };
    }).sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        const titleOrder = left.title.localeCompare(right.title);
        return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    });

    return { groups, byId: new Map(groups.map((group) => [group.id, group])), issues };
}

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
        const menuGroup = resolveDashboardMenuGroupId(service.menuGroup);
        if (!menuGroup) {
            issues.push(`Service ${service.id} references invalid menu group: ${String(service.menuGroup ?? "")}`);
            continue;
        }
        if (menuGroupIds instanceof Set && !menuGroupIds.has(menuGroup)) {
            issues.push(`Service ${service.id} references unknown menu group: ${menuGroup}`);
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
        validServices.push({ ...service, menuGroup });
    }

    return { services: validServices, byId: new Map(validServices.map((service) => [service.id, service])), issues };
}

export function validateDashboardViews(views = [], menuGroupIds, viewRenderers, homeWidgetTypes) {
    const validViews = [];
    const seenIds = new Set();
    for (const view of views) {
        if (!view || typeof view !== "object") continue;
        if (typeof view.id !== "string" || !view.id || seenIds.has(view.id)) continue;
        const menuGroup = resolveDashboardMenuGroupId(view.menuGroup);
        if (!menuGroup) continue;
        if (menuGroupIds instanceof Set && !menuGroupIds.has(menuGroup)) continue;
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
        validViews.push({ ...view, menuGroup, widgets });
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

export function sortDashboardMenuItems(items = []) {
    return [...items].sort((left, right) => {
        const leftOrder = typeof left?.menuOrder === "number" && Number.isFinite(left.menuOrder)
            ? left.menuOrder
            : 0;
        const rightOrder = typeof right?.menuOrder === "number" && Number.isFinite(right.menuOrder)
            ? right.menuOrder
            : 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        const labelOrder = String(left?.label ?? "").localeCompare(String(right?.label ?? ""));
        return labelOrder !== 0
            ? labelOrder
            : String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
    });
}

export function buildDashboardMenuGroups(services = [], menuGroups = [], options = {}, pluginRequirements = {}) {
    const hideMode = normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode);
    return menuGroups.map((group) => ({
        id: group.id,
        title: group.title,
        items: sortDashboardMenuItems(services
            .filter((service) => service.menuGroup === group.id && service.menuVisible !== false)
            .filter((service) => isServiceVisibleInMenu(service.id, options))
            .filter((service) => !isHiddenByQualificationMode(pluginRequirements?.[service.id], hideMode))
            .map((service) => ({
                id: service.id,
                label: service.menuLabel,
                menuOrder: service.menuOrder,
                alwaysVisible: Boolean(service.alwaysVisible),
            }))),
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
