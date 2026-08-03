export function dispatchDashboardActions(ns, commands, handlers = {}) {
    if (!Array.isArray(commands)) return;

    for (const command of commands) {
        if (!command || typeof command !== "object") continue;
        const actionName = typeof command.kind === "string" ? command.kind : "unknown";
        const handler = handlers[actionName];
        if (typeof handler !== "function") continue;

        try {
            handler(command, ns);
        } catch (error) {
            if (typeof handlers.onError !== "function") continue;
            handlers.onError(command, error);
        }
    }
}
