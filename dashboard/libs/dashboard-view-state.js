let interactionStateKey = "";
let dragActiveKey = "";

export function configureDashboardViewState({ interactionKey, dragKey } = {}) {
    if (typeof interactionKey === "string") interactionStateKey = interactionKey;
    if (typeof dragKey === "string") dragActiveKey = dragKey;
}

export function getDashboardViewValue(source, key) {
    if (!source || typeof source !== "object" || typeof key !== "string" || !key) return undefined;
    return key.split(".").reduce((value, segment) => {
        if (!value || typeof value !== "object" || !(segment in value)) return undefined;
        return value[segment];
    }, source);
}

export function getDashboardViewInteractionState(viewId) {
    const registry = globalThis[interactionStateKey];
    if (!registry || typeof registry !== "object") return {};
    const saved = registry[viewId];
    return saved && typeof saved === "object" ? saved : {};
}

export function saveDashboardViewInteractionState(viewId, state) {
    const registry = globalThis[interactionStateKey];
    globalThis[interactionStateKey] = {
        ...(registry && typeof registry === "object" ? registry : {}),
        [viewId]: state,
    };
}

export function setDashboardViewDragActiveState(isActive) {
    globalThis[dragActiveKey] = Boolean(isActive);
}
