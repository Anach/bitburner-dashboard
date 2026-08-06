import { DASHBOARD_ACTION_IDS } from "dashboard/libs/action-ids.js";
import { normalizeActionTone } from "dashboard/libs/action-tones.js";

const DASHBOARD_ACTION_METADATA = {
    [DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS]: { label: "Kill-All Scripts", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_ALL_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_ALL_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_PLUGINS_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_PLUGINS_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.START_INTEGRATIONS]: { label: "Start integrations", tone: "success" },
};

export const DASHBOARD_ACTION_GROUPS = {
    SCRIPT_LIST_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS,
    ],
    CORE_MODULES_LIST_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_REMOTE_SCRIPTS,
        DASHBOARD_ACTION_IDS.START_INTEGRATIONS,
    ],
    INTEGRATIONS_LIST_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_REMOTE_SCRIPTS,
    ],
    PLUGINS_LIST_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_PLUGINS_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_PLUGINS_REMOTE_SCRIPTS,
    ],
};

export function buildDashboardActions(actionIds = [], options = {}) {
    const actions = [];
    const disabledActionIds = new Set(options.disabledActionIds ?? []);
    const payload = options.payload && typeof options.payload === "object" ? options.payload : null;

    for (const actionId of actionIds) {
        const metadata = DASHBOARD_ACTION_METADATA[actionId];
        if (!metadata) continue;
        actions.push({
            id: actionId,
            kind: "dashboard",
            actionId,
            label: metadata.label,
            icon: metadata.icon ?? "",
            tone: normalizeActionTone(metadata.tone),
            disabled: disabledActionIds.has(actionId),
            ...(payload ? { payload } : {}),
        });
    }

    return actions;
}

// Shared shape for the "Kill Local"/"Kill Remote" pair on a scoped script-list panel (Core
// Modules, Integrations, Plugins): disable whichever side has no matching running target, and
// attach the exact filename set the action-worker should kill (see action-worker-contract.js's
// SCOPED_KILL_LIST_ACTIONS) so each panel only ever kills its own scripts.
export function buildScopedKillListActions(actionGroup, {
    homeActionId,
    remoteActionId,
    hasLocalTargets,
    hasRemoteTargets,
    filenames = [],
    extraDisabledActionIds = [],
} = {}) {
    const disabledActionIds = [
        ...(!hasLocalTargets ? [homeActionId] : []),
        ...(!hasRemoteTargets ? [remoteActionId] : []),
        ...extraDisabledActionIds,
    ];
    return buildDashboardActions(actionGroup, { disabledActionIds, payload: { filenames } });
}
