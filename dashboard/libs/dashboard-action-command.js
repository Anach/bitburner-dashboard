export function buildDashboardActionCommand(ns, command, context = {}) {
    if (command?.kind === "dashboard") {
        const actionCommand = { kind: "dashboard", actionId: command.actionId };
        if (command.actionId === context.restartDashboardActionId) {
            actionCommand.args = context.getDashboardRestartArgs?.(ns);
        }
        return actionCommand;
    }
    if (command?.kind === "script") {
        const execution = context.resolveScriptActionExecution?.(command.actionId, command.filename);
        if (!execution || !["start", "stop", "restart"].includes(execution.executeType)) return null;
        if (command.filename === context.dashboardScript && execution.executeType === "restart") {
            return buildDashboardActionCommand(ns, {
                kind: "dashboard",
                actionId: context.restartDashboardActionId,
            }, context);
        }
        const managedProcesses = context.getManagedProcessPaths?.(command.filename) ?? {};
        const launchOptions = context.getScriptLaunchOptions?.(command.filename) ?? {};
        return {
            kind: "script",
            actionId: execution.executeType,
            filename: command.filename,
            args: context.getScriptLaunchArgs?.(command.filename),
            temporary: launchOptions.temporary === true,
            closeTailOnRestart: launchOptions.closeTailOnRestart === true,
            managedScripts: managedProcesses.home ?? [],
            managedNetworkScripts: managedProcesses.network ?? [],
        };
    }
    if (command?.kind === "file") {
        const view = context.getFileActionView?.(command.viewId);
        if (!view) throw new Error("File Manager view is unavailable.");
        const actionCommand = {
            ...command,
            protection: view.protection ?? {},
            archiveRoot: context.normalizeFilePath?.(view?.archive?.root ?? "trashbin") || "trashbin",
        };
        if (command.actionId === "archive-many") {
            const manifest = context.normalizeFileManifest?.(
                context.loadFileManagerManifest?.(ns, view),
                view.manifest ?? {}
            );
            if (!manifest?.available) throw new Error("Cleanup requires a deployment manifest.");
            actionCommand.stalePaths = manifest.staleFiles;
        }
        return actionCommand;
    }
    return null;
}
