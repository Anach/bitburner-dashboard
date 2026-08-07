export function buildDashboardWorkerCommand(ns, command, context = {}) {
    if (command?.kind === "dashboard") {
        const workerCommand = { kind: "dashboard", actionId: command.actionId };
        if (command.actionId === context.restartDashboardActionId) {
            workerCommand.dashboardPid = context.getDashboardPid?.(ns);
            workerCommand.args = context.getDashboardRestartArgs?.(ns);
        }
        return workerCommand;
    }
    if (command?.kind === "script") {
        const execution = context.resolveScriptActionExecution?.(command.actionId, command.filename);
        if (!execution || !["start", "stop", "restart"].includes(execution.executeType)) return null;
        if (command.filename === context.dashboardScript && execution.executeType === "restart") {
            return buildDashboardWorkerCommand(ns, {
                kind: "dashboard",
                actionId: context.restartDashboardActionId,
            }, context);
        }
        return {
            kind: "script",
            actionId: execution.executeType,
            filename: command.filename,
            args: context.getScriptLaunchArgs?.(command.filename),
        };
    }
    if (command?.kind === "file") {
        const view = context.getFileActionView?.(command.viewId);
        if (!view) throw new Error("File Manager view is unavailable.");
        const workerCommand = {
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
            workerCommand.stalePaths = manifest.staleFiles;
        }
        return workerCommand;
    }
    return null;
}
