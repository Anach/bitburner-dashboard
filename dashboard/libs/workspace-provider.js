const DASHBOARD_WORKSPACE_PROVIDER_REGISTRY_KEY = "__dashboard_workspace_provider_registry_v1";
const DASHBOARD_WORKSPACE_PROVIDER_ID_PATTERN = /^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/;

function getRegistry() {
    const current = globalThis[DASHBOARD_WORKSPACE_PROVIDER_REGISTRY_KEY];
    if (current?.providers instanceof Map && current?.listeners instanceof Set) return current;

    const registry = {
        providers: new Map(),
        listeners: new Set(),
        nextRegistrationId: 1,
        revision: 0,
    };
    globalThis[DASHBOARD_WORKSPACE_PROVIDER_REGISTRY_KEY] = registry;
    return registry;
}

function notifyRegistry(registry) {
    registry.revision += 1;
    for (const listener of [...registry.listeners]) {
        try {
            listener(registry.revision);
        } catch (error) {
            // One broken observer must not prevent other dashboard hosts from updating.
        }
    }
}

export function normalizeDashboardWorkspaceProviderId(value) {
    const id = typeof value === "string" ? value.trim() : "";
    return DASHBOARD_WORKSPACE_PROVIDER_ID_PATTERN.test(id) ? id : "";
}

export function registerDashboardWorkspaceProvider(definition) {
    const registry = getRegistry();
    const id = normalizeDashboardWorkspaceProviderId(definition?.id);
    if (!id) throw new Error("Dashboard workspace provider requires a valid id.");
    if (typeof definition?.component !== "function") {
        throw new Error(`Dashboard workspace provider ${id} requires a React component.`);
    }
    if (registry.providers.has(id)) {
        throw new Error(`Dashboard workspace provider ${id} is already registered.`);
    }

    const ownerToken = {};
    const hostDisposers = new Set();
    let registered = true;
    const provider = Object.freeze({
        id,
        registrationId: registry.nextRegistrationId++,
        title: typeof definition.title === "string" ? definition.title : id,
        component: definition.component,
        controller: definition.controller ?? null,
        persistent: definition.persistent === true,
        onAttach: typeof definition.onAttach === "function" ? definition.onAttach : null,
        onDetach: typeof definition.onDetach === "function" ? definition.onDetach : null,
        registerHostDisposer(disposer) {
            if (!registered || typeof disposer !== "function") return () => {};
            hostDisposers.add(disposer);
            return () => hostDisposers.delete(disposer);
        },
        ownerToken,
    });
    registry.providers.set(id, provider);
    notifyRegistry(registry);

    return {
        id,
        registrationId: provider.registrationId,
        unregister() {
            if (!registered) return false;
            registered = false;
            const current = registry.providers.get(id);
            if (current?.ownerToken !== ownerToken) return false;
            for (const dispose of [...hostDisposers]) {
                try {
                    dispose();
                } catch (error) {
                    // A broken host must not prevent the provider process from unregistering.
                }
            }
            hostDisposers["clear"]();
            registry.providers.delete(id);
            notifyRegistry(registry);
            return true;
        },
    };
}

export function getDashboardWorkspaceProvider(providerId) {
    const id = normalizeDashboardWorkspaceProviderId(providerId);
    return id ? getRegistry().providers.get(id) ?? null : null;
}

export function getDashboardWorkspaceProviderRegistryRevision() {
    return getRegistry().revision;
}

export function subscribeDashboardWorkspaceProviders(listener) {
    if (typeof listener !== "function") return () => {};
    const registry = getRegistry();
    registry.listeners.add(listener);
    return () => registry.listeners.delete(listener);
}
