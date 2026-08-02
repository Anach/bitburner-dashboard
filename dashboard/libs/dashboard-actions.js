import { DASHBOARD_ACTION_IDS } from "dashboard/libs/action-ids.js";
import { normalizeActionTone } from "dashboard/libs/action-tones.js";

const DASHBOARD_ACTION_METADATA = {
    [DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS]: { label: "Kill-All Scripts", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_ALL_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_ALL_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_PLUGIN_LIST_HOME_SCRIPTS]: { label: "Kill Local", tone: "danger" },
    [DASHBOARD_ACTION_IDS.KILL_PLUGIN_LIST_REMOTE_SCRIPTS]: { label: "Kill Remote", tone: "danger" },
    [DASHBOARD_ACTION_IDS.START_INTEGRATIONS]: { label: "Start integrations", tone: "success" },
    [DASHBOARD_ACTION_IDS.START_SERVICES]: { label: "Start init-services", tone: "success" },
};

export const DASHBOARD_ACTION_GROUPS = {
    SCRIPT_LIST_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS,
        DASHBOARD_ACTION_IDS.START_SERVICES,
    ],
    PLUGIN_LIST_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_PLUGIN_LIST_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_PLUGIN_LIST_REMOTE_SCRIPTS,
        DASHBOARD_ACTION_IDS.START_INTEGRATIONS,
    ],
    SCRIPT_CONTROLS: [
        DASHBOARD_ACTION_IDS.KILL_ALL_HOME_SCRIPTS,
        DASHBOARD_ACTION_IDS.KILL_ALL_REMOTE_SCRIPTS,
        DASHBOARD_ACTION_IDS.START_SERVICES,
    ],
};

export function buildDashboardActions(actionIds = [], options = {}) {
    const actions = [];
    const disabledActionIds = new Set(options.disabledActionIds ?? []);

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
        });
    }

    return actions;
}
