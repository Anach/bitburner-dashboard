import { SCRIPT_ACTION_IDS } from "dashboard/libs/action-ids.js";
import { normalizeActionTone } from "dashboard/libs/action-tones.js";

const BUILTIN_SCRIPT_ACTIONS = [
    {
        actionId: SCRIPT_ACTION_IDS.START,
        tone: "success",
        label: "Start",
        executeType: "start",
        includeOnDashboardScript: false,
        disableWhen: "running",
    },
    {
        actionId: SCRIPT_ACTION_IDS.STOP,
        tone: "danger",
        label: "Stop",
        executeType: "stop",
        includeOnDashboardScript: false,
        disableWhen: "stopped",
    },
    {
        actionId: SCRIPT_ACTION_IDS.RESTART,
        tone: "warn",
        label: "Restart",
        executeType: "restart",
        includeOnDashboardScript: true,
    },
    {
        actionId: SCRIPT_ACTION_IDS.EDIT_VIM,
        tone: "info",
        label: "Edit in vim",
        executeType: "editor",
        editorName: "vim",
        includeOnDashboardScript: true,
    },
    {
        actionId: SCRIPT_ACTION_IDS.EDIT_NANO,
        tone: "info",
        label: "Edit in nano",
        executeType: "editor",
        editorName: "nano",
        includeOnDashboardScript: true,
    },
];

// Add per-file dashboard actions here without touching UI wiring.
// Supported fields:
// actionId, label, executeType ("terminal-hint"|"editor"|"start"|"stop"|"restart"),
// commandTemplate (for terminal-hint, supports ${filename}), editorName, icon,
// tone ("neutral"|"success"|"info"|"warn"|"danger"),
// includeOnDashboardScript, showWhen ("always"|"running"|"stopped"), disableWhen ("running"|"stopped"), id.
export const SCRIPT_CUSTOM_ACTIONS_BY_FILE = {
    // "automation/infiltrate.js": [
    //     {
    //         actionId: "open-infiltration-log",
    //         label: "Open infiltration log",
    //         executeType: "terminal-hint",
    //         commandTemplate: "cat /logs/infiltration.txt",
    //     },
    // ],
};

const SHOW_WHEN_VALUES = new Set(["always", "running", "stopped"]);
function isDashboardScript(filename) {
    return filename === "dashboard/automation-dashboard.jsx";
}

function shouldShowAction(action, running) {
    const showWhen = SHOW_WHEN_VALUES.has(action.showWhen) ? action.showWhen : "always";
    if (showWhen === "running") return running;
    if (showWhen === "stopped") return !running;
    return true;
}

function shouldDisableAction(action, running) {
    if (action.disableWhen === "running") return running;
    if (action.disableWhen === "stopped") return !running;
    return false;
}

function normalizeCustomAction(filename, customAction) {
    if (!customAction || typeof customAction !== "object") return null;
    if (typeof customAction.actionId !== "string" || customAction.actionId.length === 0) return null;
    if (typeof customAction.label !== "string" || customAction.label.length === 0) return null;

    return {
        actionId: customAction.actionId,
        label: customAction.label,
        icon: typeof customAction.icon === "string" ? customAction.icon : "",
        tone: normalizeActionTone(customAction.tone),
        executeType: customAction.executeType ?? "terminal-hint",
        commandTemplate: customAction.commandTemplate,
        editorName: customAction.editorName,
        includeOnDashboardScript: customAction.includeOnDashboardScript !== false,
        showWhen: customAction.showWhen,
        disableWhen: customAction.disableWhen,
        id: typeof customAction.id === "string" && customAction.id.length > 0 ? customAction.id : `${customAction.actionId}:${filename}`,
    };
}

function getCustomActionsForFile(filename, options = {}) {
    const customActionsByFile = {
        ...SCRIPT_CUSTOM_ACTIONS_BY_FILE,
        ...(options?.customActionsByFile ?? {}),
    };
    if (!customActionsByFile || typeof customActionsByFile !== "object") return [];

    const rawActions = customActionsByFile[filename];
    if (!Array.isArray(rawActions) || rawActions.length === 0) return [];

    return rawActions
        .map((customAction) => normalizeCustomAction(filename, customAction))
        .filter(Boolean);
}

function getActionCatalog(filename, options = {}) {
    return [...BUILTIN_SCRIPT_ACTIONS, ...getCustomActionsForFile(filename, options)];
}

export function buildScriptActions(script, options = {}) {
    const filename = script?.filename ?? script?.id ?? "";
    if (!filename) return [];

    const running = Boolean(script?.running);
    const includeDisabledStates = Boolean(options?.includeDisabledStates);
    const dashboardScript = isDashboardScript(filename);

    return getActionCatalog(filename, options)
        .filter((action) => (dashboardScript ? action.includeOnDashboardScript !== false : true))
        .filter((action) => shouldShowAction(action, running))
        .map((action) => ({
            id: action.id ?? `${action.actionId}:${filename}`,
            icon: typeof action.icon === "string" ? action.icon : "",
            tone: normalizeActionTone(action.tone),
            label: action.label,
            kind: "script",
            actionId: action.actionId,
            filename,
            disabled: includeDisabledStates ? shouldDisableAction(action, running) : false,
        }));
}

export function resolveScriptActionExecution(actionId, filename, options = {}) {
    if (!actionId || !filename) return null;

    const action = getActionCatalog(filename, options).find((entry) => entry.actionId === actionId);
    if (!action) return null;

    if (action.executeType === "editor") {
        if (!action.editorName) return null;
        return {
            executeType: "editor",
            commandText: `${action.editorName} ${filename}`,
        };
    }

    if (action.executeType === "terminal-hint") {
        const template = typeof action.commandTemplate === "string" && action.commandTemplate.length > 0
            ? action.commandTemplate
            : `${action.actionId} ${filename}`;
        return {
            executeType: "terminal-hint",
            commandText: template.replace("${filename}", filename),
        };
    }

    if (action.executeType === "start" || action.executeType === "stop" || action.executeType === "restart") {
        return { executeType: action.executeType };
    }

    return null;
}
