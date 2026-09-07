export function dispatchDashboardActions(ns, commands, handlers = {}) {
    if (!Array.isArray(commands)) return { deferredCommands: [], continuation: null };

    for (let index = 0; index < commands.length; index += 1) {
        const command = commands[index];
        if (!command || typeof command !== "object") continue;
        const actionName = typeof command.kind === "string" ? command.kind : "unknown";
        const handler = handlers[actionName];
        if (typeof handler !== "function") continue;

        try {
            const result = handler(command, ns);
            if (result?.deferRemaining === true) {
                return {
                    deferredCommands: commands.slice(index + 1),
                    continuation: result.continuation ?? null,
                };
            }
        } catch (error) {
            if (typeof handlers.onError !== "function") continue;
            handlers.onError(command, error);
        }
    }
    return { deferredCommands: [], continuation: null };
}
