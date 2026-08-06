import {
    DASHBOARD_ACTION_WORKER_RESULT_FILE,
    normalizeActionWorkerEnvelope,
} from "dashboard/libs/action-worker-contract.js";
import { DASHBOARD_ACTION_IDS, SCRIPT_ACTION_IDS } from "dashboard/libs/action-ids.js";
import {
    buildArchivePath,
    getFileName,
    isDeletableFile,
    isEditableFile,
    isMovableFile,
    isProtectedFile,
    joinFilePath,
} from "dashboard/libs/file-utils.js";
import { isScriptFileIgnored, isScriptInFolders } from "dashboard/libs/script-folders.js";
import { restartHomeScript, startHomeScript, stopHomeScript } from "dashboard/libs/runtime-actions.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": false
};

const DASHBOARD_SCRIPT = "dashboard/automation-dashboard.jsx";
const SERVICE_SUPERVISOR_SCRIPT = "dashboard/service-supervisor.js";
const AUTOSTART_PAUSE_FILE = "data/autostart_paused.txt";

// Each "Kill Local"/"Kill Remote" pair targets its own category's exact filename set (sent by
// the client as command.filenames) rather than a folder/name heuristic - Core Modules,
// Integrations, and Plugins are separate menu panels now and must only ever kill their own
// scripts. Killing home-run Integrations/Plugins also stops the supervisor first so it doesn't
// immediately relaunch what was just killed on its next ~30s cycle; Core Modules doesn't need
// that special case since the supervisor script itself is already part of its own filename set.
const SCOPED_KILL_LIST_ACTIONS = {
    [DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_HOME_SCRIPTS]: { hosts: "home", label: "core module" },
    [DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_REMOTE_SCRIPTS]: { hosts: "remote", label: "core module" },
    [DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_HOME_SCRIPTS]: { hosts: "home", label: "integration", stopsSupervisor: true },
    [DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_REMOTE_SCRIPTS]: { hosts: "remote", label: "integration" },
    [DASHBOARD_ACTION_IDS.KILL_PLUGINS_HOME_SCRIPTS]: { hosts: "home", label: "plugin", stopsSupervisor: true },
    [DASHBOARD_ACTION_IDS.KILL_PLUGINS_REMOTE_SCRIPTS]: { hosts: "remote", label: "plugin" },
};

function writeResult(ns, requestId, result) {
    ns.write(DASHBOARD_ACTION_WORKER_RESULT_FILE, JSON.stringify({
        requestId,
        ...result,
    }), "w");
}

function success(message, tone = "success", details = {}) {
    return { ok: true, message, tone, ...details };
}

function getReachableServers(ns) {
    const visited = new Set(["home"]);
    const queue = ["home"];
    while (queue.length > 0) {
        const host = queue.shift();
        let neighbors = [];
        try {
            neighbors = ns.scan(host) ?? [];
        } catch (error) {
            neighbors = [];
        }
        for (const neighbor of neighbors) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            queue.push(neighbor);
        }
    }
    return [...visited];
}

function killMatchingProcesses(ns, hosts, matcher, excludedPids = []) {
    const excluded = new Set(excludedPids);
    let killedCount = 0;
    let serverCount = 0;
    for (const host of hosts) {
        let hostKills = 0;
        let processes = [];
        try {
            processes = ns.ps(host) ?? [];
        } catch (error) {
            continue;
        }
        for (const process of processes) {
            if (excluded.has(process?.pid) || !matcher(process?.filename, host)) continue;
            try {
                if (ns.kill(process.pid)) {
                    killedCount += 1;
                    hostKills += 1;
                }
            } catch (error) {
                // Processes can exit while the action snapshot is being handled.
            }
        }
        if (hostKills > 0) serverCount += 1;
    }
    return { killedCount, serverCount };
}

function performScriptAction(ns, command) {
    const { actionId, filename, args } = command;
    const result = actionId === SCRIPT_ACTION_IDS.START
        ? startHomeScript(ns, filename, ...args)
        : actionId === SCRIPT_ACTION_IDS.STOP
            ? stopHomeScript(ns, filename)
            : restartHomeScript(ns, filename, ...args);
    const labels = {
        missing: `Cannot ${actionId} ${filename} (missing file).`,
        started: `Started ${filename}.`,
        stopped: `Stopped ${filename}.`,
        restarted: `Restarted ${filename}.`,
        "already-running": `${filename} is already running.`,
        "not-running": `${filename} is not running.`,
        "failed-to-stop": `Could not stop ${filename}; restart was cancelled.`,
        failed: `Failed to ${actionId} ${filename}.`,
    };
    const ok = ["started", "stopped", "restarted", "already-running", "not-running"].includes(result.status);
    return {
        ok,
        status: result.status,
        message: labels[result.status] ?? `Failed to ${actionId} ${filename}.`,
        tone: ["started", "stopped", "restarted"].includes(result.status) ? "success" : ok ? "info" : "warning",
        kind: "script",
        actionId,
        filename,
        applyOptions: ["start", "restart"].includes(actionId) && ["started", "restarted", "already-running"].includes(result.status),
    };
}

function performDashboardKillAction(ns, command) {
    const actionId = command.actionId;
    const allHosts = getReachableServers(ns);
    const remoteHosts = allHosts.filter((host) => host !== "home");
    const excludeWorker = [ns.pid];
    if (actionId === DASHBOARD_ACTION_IDS.KILL_ALL_HOME_SCRIPTS) {
        const result = killMatchingProcesses(ns, ["home"], (filename) => filename !== DASHBOARD_SCRIPT, excludeWorker);
        return success(`Killed ${result.killedCount} home script${result.killedCount === 1 ? "" : "s"} (dashboard preserved).`, "warning", result);
    }
    if (actionId === DASHBOARD_ACTION_IDS.KILL_ALL_REMOTE_SCRIPTS) {
        const result = killMatchingProcesses(ns, remoteHosts, () => true);
        return success(`Killed ${result.killedCount} script${result.killedCount === 1 ? "" : "s"} across ${result.serverCount} remote server${result.serverCount === 1 ? "" : "s"}.`, "warning", result);
    }
    if (actionId === DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS
        || actionId === DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS) {
        const pluginFiles = new Set(command.pluginFiles);
        const matcher = (filename) => typeof filename === "string"
            && filename !== DASHBOARD_SCRIPT
            && !pluginFiles.has(filename)
            && !isScriptInFolders(filename, command.ignoredFolders)
            && !isScriptFileIgnored(filename, command.ignoredFiles);
        const hosts = actionId === DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS ? ["home"] : remoteHosts;
        const result = killMatchingProcesses(ns, hosts, matcher, excludeWorker);
        const location = hosts[0] === "home" ? "on home" : `across ${result.serverCount} remote server${result.serverCount === 1 ? "" : "s"}`;
        return success(`Killed ${result.killedCount} script${result.killedCount === 1 ? "" : "s"} from Script List ${location}.`, "warning", result);
    }
    const scopedKillAction = SCOPED_KILL_LIST_ACTIONS[actionId];
    if (scopedKillAction) {
        const filenames = new Set(command.filenames);
        let supervisorStopped = false;
        if (scopedKillAction.stopsSupervisor) {
            supervisorStopped = stopHomeScript(ns, SERVICE_SUPERVISOR_SCRIPT).status === "stopped";
        }
        const hosts = scopedKillAction.hosts === "home" ? ["home"] : remoteHosts;
        const result = killMatchingProcesses(ns, hosts, (filename) => filename !== DASHBOARD_SCRIPT && filenames.has(filename), excludeWorker);
        const location = scopedKillAction.hosts === "home" ? "on home" : `across ${result.serverCount} remote server${result.serverCount === 1 ? "" : "s"}`;
        const supervisorSummary = supervisorStopped ? " Integration supervisor stopped." : "";
        return success(`Killed ${result.killedCount} ${scopedKillAction.label} script${result.killedCount === 1 ? "" : "s"} ${location}.${supervisorSummary}`, "warning", result);
    }
    if (actionId === DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS) {
        const remoteResult = killMatchingProcesses(ns, remoteHosts, () => true);
        const homeResult = killMatchingProcesses(ns, ["home"], (filename) => filename !== DASHBOARD_SCRIPT, excludeWorker);
        const killedCount = remoteResult.killedCount + homeResult.killedCount;
        // Kill All is a deliberate "stop everything" action - the supervisor (just killed
        // along with everything else) would otherwise relaunch every autostart-enabled
        // service the instant it's restarted for any reason. Pause it until the user
        // explicitly clicks Start integrations again.
        ns.write(AUTOSTART_PAUSE_FILE, "1", "w");
        return success(`Killed ${killedCount} script${killedCount === 1 ? "" : "s"} across home and all reachable servers (dashboard preserved). Autostart paused.`, "warning", {
            killedCount,
        });
    }
    throw new Error(`Unknown dashboard kill action: ${actionId}`);
}

function isProtected(ns, path, protection) {
    let running = false;
    try {
        running = ns.scriptRunning(path, "home");
    } catch (error) {
        running = false;
    }
    return path === DASHBOARD_SCRIPT || isProtectedFile({ path, running }, protection);
}

function requireSource(ns, path) {
    if (!ns.fileExists(path, "home")) throw new Error(`File does not exist: ${path}`);
    return path;
}

function requireTarget(ns, path) {
    if (ns.fileExists(path, "home")) throw new Error(`Destination already exists: ${path}`);
    return path;
}

function moveFile(ns, sourcePath, targetPath, protection) {
    const source = requireSource(ns, sourcePath);
    const target = requireTarget(ns, targetPath);
    if (isProtected(ns, source, protection)) throw new Error(`File is running or protected: ${source}`);
    if (!isMovableFile(source) || !isEditableFile(target)) {
        throw new Error("Move and rename support is limited to scripts and editable text files.");
    }
    ns.mv("home", source, target);
    if (!ns.fileExists(target, "home")) throw new Error(`Move failed: ${source}`);
    return { source, target };
}

function deleteFile(ns, path, protection) {
    const source = requireSource(ns, path);
    if (isProtected(ns, source, protection)) throw new Error(`File is running or protected: ${source}`);
    if (!isDeletableFile(source)) throw new Error(`This file type cannot be deleted through Netscript: ${source}`);
    if (!ns.rm(source, "home")) throw new Error(`Delete failed: ${source}`);
    return source;
}

function performFileAction(ns, command) {
    const { actionId, protection } = command;
    if (actionId === "copy") {
        const source = requireSource(ns, command.path);
        const target = requireTarget(ns, command.target);
        if (!isEditableFile(source) || !isEditableFile(target)) throw new Error("Copy support is limited to scripts and editable text files.");
        ns.write(target, ns.read(source), "w");
        if (!ns.fileExists(target, "home")) throw new Error(`Copy failed: ${source}`);
        return success(`Copied ${source} to ${target}.`, "success", { actionId, path: source, target, viewId: command.viewId, kind: "file" });
    }
    if (actionId === "move" || actionId === "archive") {
        const target = actionId === "archive" ? buildArchivePath(command.path, command.archiveRoot) : command.target;
        const moved = moveFile(ns, command.path, target, protection);
        const verb = actionId === "archive" ? "Archived" : "Moved";
        return success(`${verb} ${moved.source} to ${moved.target}.`, "success", { actionId, path: moved.source, target: moved.target, viewId: command.viewId, kind: "file" });
    }
    if (actionId === "delete") {
        const source = deleteFile(ns, command.path, protection);
        return success(`Deleted ${source}.`, "warning", { actionId, path: source, viewId: command.viewId, kind: "file" });
    }

    let completedCount = 0;
    const skipped = [];
    const reservedTargets = new Set();
    const stalePaths = new Set(command.stalePaths ?? []);
    for (const path of command.paths) {
        try {
            if (actionId === "delete-many") {
                deleteFile(ns, path, protection);
            } else if (actionId === "copy-many") {
                const source = requireSource(ns, path);
                if (!isEditableFile(source)) throw new Error(`Copy support is limited to scripts and editable text files: ${source}`);
                const target = joinFilePath(command.target, getFileName(source));
                if (!target || target === source || reservedTargets.has(target)) throw new Error(`Invalid copy destination: ${source}`);
                requireTarget(ns, target);
                ns.write(target, ns.read(source), "w");
                if (!ns.fileExists(target, "home")) throw new Error(`Copy failed: ${source}`);
                reservedTargets.add(target);
            } else {
                if (actionId === "archive-many" && !stalePaths.has(path)) throw new Error(`File is not stale: ${path}`);
                const target = actionId === "archive-many"
                    ? buildArchivePath(path, command.archiveRoot)
                    : joinFilePath(command.target, getFileName(path));
                if (!target || reservedTargets.has(target)) throw new Error(`Invalid move destination: ${path}`);
                moveFile(ns, path, target, protection);
                reservedTargets.add(target);
            }
            completedCount += 1;
        } catch (error) {
            skipped.push(path);
        }
    }
    const verb = actionId === "copy-many" ? "Copied" : actionId === "move-many" ? "Moved" : actionId === "delete-many" ? "Deleted" : "Archived";
    const noun = actionId === "archive-many" ? "stale file" : actionId === "delete-many" ? "selected file" : "selected file";
    const message = `${verb} ${completedCount} ${noun}${completedCount === 1 ? "" : "s"}${skipped.length > 0 ? `; skipped ${skipped.length}` : ""}.`;
    return {
        ok: completedCount > 0 || skipped.length === 0,
        message,
        tone: skipped.length > 0 ? "warning" : actionId === "delete-many" ? "warning" : "success",
        kind: "file",
        actionId,
        viewId: command.viewId,
        completedCount,
        skipped,
    };
}

function performDashboardAction(ns, command) {
    if (command.actionId === DASHBOARD_ACTION_IDS.START_INTEGRATIONS) {
        if (ns.fileExists(AUTOSTART_PAUSE_FILE, "home")) ns.rm(AUTOSTART_PAUSE_FILE, "home");
        return performScriptAction(ns, { kind: "script", actionId: SCRIPT_ACTION_IDS.START, filename: SERVICE_SUPERVISOR_SCRIPT, args: [] });
    }
    return performDashboardKillAction(ns, command);
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    let requestId = "invalid";
    let envelope = null;
    try {
        envelope = normalizeActionWorkerEnvelope(ns.args[0]);
        requestId = envelope.requestId;
    } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
        writeResult(ns, requestId, { ok: false, message, tone: "error" });
        return;
    }

    const { command } = envelope;
    if (command.kind === "dashboard" && command.actionId === DASHBOARD_ACTION_IDS.RESTART_DASHBOARD) {
        writeResult(ns, requestId, success("Restarting dashboard...", "info"));
        if (!ns.kill(command.dashboardPid)) {
            writeResult(ns, requestId, { ok: false, message: "Could not stop the dashboard for restart.", tone: "error" });
            return;
        }
        ns.spawn(DASHBOARD_SCRIPT, { threads: 1, spawnDelay: 0 }, ...command.args);
        return;
    }

    try {
        const result = command.kind === "script"
            ? performScriptAction(ns, command)
            : command.kind === "file"
                ? performFileAction(ns, command)
                : performDashboardAction(ns, command);
        writeResult(ns, requestId, result);
        if (result.terminateDashboard) ns.scriptKill(DASHBOARD_SCRIPT, "home");
    } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
        try {
            writeResult(ns, requestId, { ok: false, message, tone: "error" });
        } catch (writeError) {
            ns.tprint(`[DASHBOARD WORKER] ${message}`);
        }
    }
}