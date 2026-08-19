import { MailClientView } from "dashboard/renderers/mail-client-view.jsx";
import { MAIL_CLIENT_VIEW_CONFIG } from "dashboard/plugins/mail-client/mail-client-config.js";

export function createMailClientWorkspaceController(initialSnapshot = null) {
    const listeners = new Set();
    const pendingCommands = [];
    let snapshot = initialSnapshot;
    let stopped = false;

    return {
        drainCommands() {
            if (stopped || pendingCommands.length === 0) return [];
            return pendingCommands.splice(0, pendingCommands.length);
        },
        enqueueCommand(command) {
            const normalized = String(command ?? "").trim();
            if (stopped || !normalized) return false;
            pendingCommands.push(normalized);
            return true;
        },
        getSnapshot: () => snapshot,
        publish(nextSnapshot) {
            if (stopped || !nextSnapshot || typeof nextSnapshot !== "object") return false;
            snapshot = nextSnapshot;
            for (const listener of [...listeners]) {
                try {
                    listener(snapshot);
                }
                catch (error) {
                    // A detached view observer must not interfere with mailbox collection.
                }
            }
            return true;
        },
        shutdown() {
            if (stopped) return false;
            stopped = true;
            pendingCommands.length = 0;
            listeners["clear"]();
            return true;
        },
        subscribe(listener) {
            if (stopped || typeof listener !== "function") return () => {};
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export function MailClientWorkspace({ controller, dashboardTheme, onInputFocusChange, manual }) {
    const React = globalThis.React;
    const [telemetry, setTelemetry] = React.useState(controller.getSnapshot);
    React.useEffect(() => controller.subscribe(setTelemetry), [controller]);

    return React.createElement(MailClientView, {
        view: MAIL_CLIENT_VIEW_CONFIG,
        telemetry,
        dashboardTheme,
        embedded: true,
        onCommand: (_serviceId, command) => controller.enqueueCommand(command),
        onInputFocusChange,
        manual,
    });
}
