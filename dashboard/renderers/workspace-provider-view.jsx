import {
    getDashboardWorkspaceProvider,
    getDashboardWorkspaceProviderRegistryRevision,
    subscribeDashboardWorkspaceProviders,
} from "dashboard/libs/workspace-provider.js";
import { getDashboardPersistentWorkspaceHost } from "dashboard/libs/workspace-persistent-host.js";

let React = null;
let WorkspaceProviderErrorBoundary = null;

export function configureWorkspaceProviderView({ react } = {}) {
    if (react && react !== React) {
        React = react;
        WorkspaceProviderErrorBoundary = class extends React.Component {
            constructor(props) {
                super(props);
                this.state = { error: null };
            }

            static getDerivedStateFromError(error) {
                return { error };
            }

            componentDidUpdate(previousProps) {
                if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
                    this.setState({ error: null });
                }
            }

            render() {
                if (!this.state.error) return this.props.children;
                return <WorkspaceStatus
                    tone="danger"
                    title="Workspace Error"
                    message={this.state.error instanceof Error
                        ? (this.state.error.stack || this.state.error.message)
                        : String(this.state.error)}
                />;
            }
        };
    }
}

function WorkspaceStatus({ title, message, tone = "neutral" }) {
    const color = tone === "danger" ? "#ff8080" : tone === "warn" ? "#ffd88a" : "#9ca3af";
    return <div style={{
        boxSizing: "border-box",
        display: "flex",
        flex: "1 1 auto",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 0,
        padding: "24px",
        border: "1px solid rgba(80, 100, 80, 0.55)",
        color,
        overflow: "auto",
    }}>
        <div style={{ marginBottom: "8px", color: tone === "danger" ? "#ff8080" : "#00ff00", fontWeight: 700 }}>
            {title}
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>{message}</div>
    </div>;
}

function PersistentWorkspaceProvider({ provider, dashboardTheme, onInputFocusChange }) {
    const mountRef = React.useRef(null);
    const host = getDashboardPersistentWorkspaceHost(provider);
    const ProviderComponent = provider.component;
    const resetKey = `${provider.id}:${provider.registrationId}`;

    React.useLayoutEffect(() => {
        if (!host?.attach(mountRef.current)) return;
        host.render(<WorkspaceProviderErrorBoundary resetKey={resetKey}>
            <ProviderComponent
                controller={provider.controller}
                dashboardTheme={dashboardTheme}
                host="dashboard"
                onInputFocusChange={onInputFocusChange}
            />
        </WorkspaceProviderErrorBoundary>);
        host.restoreFocus();
        // Detach, but deliberately do not unmount, on dashboard refresh or navigation. Provider
        // unregister owns final disposal; the next dashboard tree reattaches this same live root.
        return () => host.prepareDetach();
    }, [host, provider, dashboardTheme, onInputFocusChange, resetKey]);

    if (!host) return <WorkspaceStatus
        tone="danger"
        title="Persistent Workspace Unavailable"
        message={`The ReactDOM host required by ${provider.title} is unavailable.`}
    />;

    return <div ref={mountRef} style={{
        boxSizing: "border-box",
        display: "flex",
        flex: "1 1 auto",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
    }} />;
}

export function WorkspaceProviderView({ providerId, dashboardTheme, onInputFocusChange }) {
    if (!React || !WorkspaceProviderErrorBoundary) return null;
    const [, setRegistryRevision] = React.useState(getDashboardWorkspaceProviderRegistryRevision);
    React.useEffect(() => subscribeDashboardWorkspaceProviders(setRegistryRevision), []);
    const provider = getDashboardWorkspaceProvider(providerId);

    React.useEffect(() => {
        if (!provider) return undefined;
        let detach = null;
        try {
            detach = provider.onAttach?.({ host: "dashboard" }) ?? null;
        } catch (error) {
            return undefined;
        }
        return () => {
            try {
                if (typeof detach === "function") detach();
                else provider.onDetach?.({ host: "dashboard" });
            } catch (error) {
                // Provider teardown is isolated from dashboard navigation.
            }
        };
    }, [provider?.registrationId]);

    if (!provider) {
        return <WorkspaceStatus
            tone="warn"
            title="Starting Workspace"
            message={`Waiting for provider ${providerId} to register.`}
        />;
    }

    const ProviderComponent = provider.component;
    const resetKey = `${provider.id}:${provider.registrationId}`;
    if (provider.persistent) {
        return <PersistentWorkspaceProvider
            provider={provider}
            dashboardTheme={dashboardTheme}
            onInputFocusChange={onInputFocusChange}
        />;
    }
    return <WorkspaceProviderErrorBoundary resetKey={resetKey}>
        <ProviderComponent
            controller={provider.controller}
            dashboardTheme={dashboardTheme}
            host="dashboard"
            onInputFocusChange={onInputFocusChange}
        />
    </WorkspaceProviderErrorBoundary>;
}
