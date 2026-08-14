import { DASHBOARD_ACTION_IDS, SCRIPT_ACTION_IDS } from "./action-ids.js";
import { isValidManagedFilePath, normalizeFilePath } from "./file-utils.js";

const DASHBOARD_ACTIONS = new Set(Object.values(DASHBOARD_ACTION_IDS));
const SCRIPT_ACTIONS = new Set([
    SCRIPT_ACTION_IDS.START,
    SCRIPT_ACTION_IDS.STOP,
    SCRIPT_ACTION_IDS.RESTART,
]);
const FILE_ACTIONS = new Set([
    "copy",
    "move",
    "archive",
    "delete",
    "copy-many",
    "move-many",
    "delete-many",
    "archive-many",
]);

function getObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeScriptArgs(args) {
    if (!Array.isArray(args) || args.length > 64) return [];
    return args.map((arg) => {
        if (["string", "number", "boolean"].includes(typeof arg)) return arg;
        throw new Error("Invalid script argument.");
    });
}

function normalizeManagedPath(value, label, allowEmpty = false) {
    const path = normalizeFilePath(value);
    if (allowEmpty && !path) return "";
    if (!isValidManagedFilePath(path)) throw new Error(`Invalid ${label} path.`);
    return path;
}

function normalizePathList(values) {
    if (!Array.isArray(values) || values.length > 1000) throw new Error("Invalid file path list.");
    return [...new Set(values.map((value) => normalizeManagedPath(value, "file")))];
}

function normalizeProtection(rawProtection) {
    const protection = getObject(rawProtection);
    return {
        protectRunning: protection.protectRunning !== false,
        paths: normalizePathList(Array.isArray(protection.paths) ? protection.paths : []),
        prefixes: normalizePathList(Array.isArray(protection.prefixes) ? protection.prefixes : []),
    };
}

function normalizeDashboardCommand(rawCommand) {
    const actionId = String(rawCommand.actionId ?? "");
    if (!DASHBOARD_ACTIONS.has(actionId)) throw new Error(`Unknown dashboard action: ${actionId || "(missing)"}`);
    const command = { kind: "dashboard", actionId };
    if (actionId === DASHBOARD_ACTION_IDS.RESTART_DASHBOARD) {
        command.args = normalizeScriptArgs(rawCommand.args);
    }
    return command;
}

function normalizeScriptCommand(rawCommand) {
    const actionId = String(rawCommand.actionId ?? "");
    if (!SCRIPT_ACTIONS.has(actionId)) throw new Error(`Unknown script action: ${actionId || "(missing)"}`);
    return {
        kind: "script",
        actionId,
        filename: normalizeManagedPath(rawCommand.filename, "script"),
        args: normalizeScriptArgs(rawCommand.args),
        temporary: rawCommand.temporary === true,
        closeTailOnRestart: rawCommand.closeTailOnRestart === true,
        managedScripts: normalizePathList(Array.isArray(rawCommand.managedScripts) ? rawCommand.managedScripts : []),
        managedNetworkScripts: normalizePathList(Array.isArray(rawCommand.managedNetworkScripts) ? rawCommand.managedNetworkScripts : []),
    };
}

function normalizeFileCommand(rawCommand) {
    const actionId = String(rawCommand.actionId ?? "");
    if (!FILE_ACTIONS.has(actionId)) throw new Error(`Unknown file action: ${actionId || "(missing)"}`);
    const command = {
        kind: "file",
        actionId,
        viewId: String(rawCommand.viewId ?? ""),
        protection: normalizeProtection(rawCommand.protection),
        archiveRoot: normalizeManagedPath(rawCommand.archiveRoot ?? "trashbin", "archive"),
    };
    if (actionId.endsWith("-many")) {
        command.paths = normalizePathList(rawCommand.paths);
    } else {
        command.path = normalizeManagedPath(rawCommand.path, "source");
    }
    if (["copy", "move"].includes(actionId)) {
        command.target = normalizeManagedPath(rawCommand.target, "destination");
    }
    if (["copy-many", "move-many"].includes(actionId)) {
        command.target = normalizeManagedPath(rawCommand.target, "destination", true);
    }
    if (actionId === "archive-many") {
        command.stalePaths = normalizePathList(Array.isArray(rawCommand.stalePaths) ? rawCommand.stalePaths : []);
    }
    return command;
}

export function normalizeDashboardActionCommand(rawCommand) {
    const command = getObject(rawCommand);
    if (command.kind === "dashboard") return normalizeDashboardCommand(command);
    if (command.kind === "script") return normalizeScriptCommand(command);
    if (command.kind === "file") return normalizeFileCommand(command);
    throw new Error(`Unknown dashboard command kind: ${String(command.kind ?? "(missing)")}`);
}
