export function selectDashboardViewItems(items, widget) {
    const candidates = Array.isArray(items) ? items : [];
    let selected = candidates;

    if (widget?.includeSystem === false) {
        selected = selected.filter((item) => item?.sourceKind !== "system");
    }
    if (Array.isArray(widget?.serviceIds) && widget.serviceIds.length > 0) {
        const serviceIds = new Set(widget.serviceIds.filter((value) => typeof value === "string"));
        selected = selected.filter((item) => serviceIds.has(item?.serviceId));
    }
    if (Array.isArray(widget?.menuGroups) && widget.menuGroups.length > 0) {
        const menuGroups = new Set(widget.menuGroups.filter((value) => typeof value === "string"));
        selected = selected.filter((item) => menuGroups.has(item?.menuGroup));
    }
    if (Array.isArray(widget?.itemIds) && widget.itemIds.length > 0) {
        const byId = new Map(selected.map((item) => [item.id, item]));
        selected = widget.itemIds.map((itemId) => byId.get(itemId)).filter(Boolean);
    }

    const maximum = Math.floor(Number(widget?.maxItems));
    return Number.isFinite(maximum) && maximum >= 0 ? selected.slice(0, maximum) : selected;
}

export function selectDashboardViewServiceGroups(groups, widget) {
    const menuGroups = Array.isArray(widget?.menuGroups) && widget.menuGroups.length > 0
        ? new Set(widget.menuGroups.filter((value) => typeof value === "string"))
        : null;
    const serviceIds = Array.isArray(widget?.serviceIds) && widget.serviceIds.length > 0
        ? new Set(widget.serviceIds.filter((value) => typeof value === "string"))
        : null;

    return (Array.isArray(groups) ? groups : [])
        .filter((group) => !menuGroups || menuGroups.has(group.id))
        .map((group) => ({
            ...group,
            services: serviceIds
                ? group.services.filter((service) => serviceIds.has(service.id))
                : group.services,
        }))
        .filter((group) => group.services.length > 0);
}
