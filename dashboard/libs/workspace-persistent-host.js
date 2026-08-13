const DASHBOARD_PERSISTENT_WORKSPACE_HOSTS_KEY = "__dashboard_persistent_workspace_hosts_v1";

function getPersistentHosts() {
    const current = globalThis[DASHBOARD_PERSISTENT_WORKSPACE_HOSTS_KEY];
    if (current instanceof Map) return current;
    const hosts = new Map();
    globalThis[DASHBOARD_PERSISTENT_WORKSPACE_HOSTS_KEY] = hosts;
    return hosts;
}

function providerKey(provider) {
    return `${String(provider?.id || "")}:${Number(provider?.registrationId) || 0}`;
}

/**
 * Returns a DOM/React root whose lifetime belongs to the registered provider rather than the
 * dashboard's repeatedly replaced printRaw tree. Reattaching moves the same live root.
 */
export function getDashboardPersistentWorkspaceHost(provider, dependencies = {}) {
    if (!provider?.persistent) return null;
    const documentApi = dependencies.documentApi ?? globalThis.document;
    const reactDom = dependencies.reactDom ?? globalThis.ReactDOM;
    if (typeof documentApi?.createElement !== "function"
        || typeof reactDom?.render !== "function"
        || typeof reactDom?.unmountComponentAtNode !== "function") return null;

    const hosts = getPersistentHosts();
    const key = providerKey(provider);
    const existing = hosts.get(key);
    if (existing) return existing;

    const container = documentApi.createElement("div");
    container.dataset.dashboardWorkspaceProvider = String(provider.id);
    Object.assign(container.style, {
        boxSizing: "border-box",
        display: "flex",
        flex: "1 1 auto",
        width: "100%",
        height: "100%",
        minWidth: "0",
        minHeight: "0",
        overflow: "hidden",
    });

    let disposed = false;
    let focusedElement = null;
    let removeDisposer = () => {};
    const host = {
        container,
        attach(parent) {
            if (disposed || typeof parent?.appendChild !== "function") return false;
            parent.appendChild(container);
            return true;
        },
        render(node) {
            if (disposed) return false;
            reactDom.render(node, container);
            return true;
        },
        prepareDetach() {
            if (disposed) return false;
            const activeElement = documentApi.activeElement;
            focusedElement = activeElement && container.contains?.(activeElement)
                ? activeElement
                : null;
            // Keep the provider's React root mounted, but remove its container from the visible
            // workspace. Otherwise selecting another persistent provider appends that provider
            // beside this one until the dashboard tree is replaced.
            container.remove?.();
            return Boolean(focusedElement);
        },
        restoreFocus() {
            if (disposed || !focusedElement) return false;
            const target = focusedElement;
            focusedElement = null;
            if (!container.contains?.(target) || typeof target.focus !== "function") return false;
            try {
                target.focus({ preventScroll: true });
            } catch (error) {
                target.focus();
            }
            return true;
        },
        dispose() {
            if (disposed) return false;
            disposed = true;
            focusedElement = null;
            removeDisposer();
            try {
                reactDom.unmountComponentAtNode(container);
            } finally {
                container.remove?.();
                hosts.delete(key);
            }
            return true;
        },
    };
    removeDisposer = provider.registerHostDisposer?.(host.dispose) ?? removeDisposer;
    hosts.set(key, host);
    return host;
}
