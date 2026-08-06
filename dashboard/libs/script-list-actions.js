import { SCRIPT_ACTION_IDS } from "dashboard/libs/action-ids.js";
import { buildScriptActions } from "dashboard/libs/script-actions.js";
import {
    getServiceAutostartOptionKey,
    getServiceMenuVisibilityOptionKey,
    isServiceVisibleInMenu,
} from "dashboard/libs/dashboard-options.js";
import { findAssociatedViewForService } from "dashboard/libs/dashboard-registry.js";

// Autostart defaults off until the user explicitly opts in via this toggle - nothing gets to
// assume it's safe to auto-launch just by having a daemon-eligible descriptor.
export function buildServiceAutostartAction(service, options) {
    if (typeof service?.id !== "string" || !service.id) return null;
    if (!service?.pluginFile) return null;
    if (service?.pluginMetadata?.daemon === false) return null;

    const optionKey = getServiceAutostartOptionKey(service.id);
    const enabled = options?.[optionKey] === true;
    return {
        id: `${service.id}-autostart`,
        label: "Autostart",
        kind: "save-options",
        tone: enabled ? "success" : "neutral",
        tooltip: enabled
            ? `${service.menuLabel} is auto-started and auto-restarted by the Integration Service Supervisor. Click to disable.`
            : `${service.menuLabel} will not be started or restarted automatically (opt-in). Click to enable.`,
        optionOverrides: { [optionKey]: !enabled },
    };
}

// For a script with no dashboard integration at all - just a `DASHBOARD_SCRIPT_METADATA:
// { daemon: true }` header - the Integration Service Supervisor will still autostart/restart
// it (see service-supervisor.js's discoverBareDaemonScripts), keyed by its filename rather
// than a serviceId since none exists. This mirrors buildServiceAutostartAction for that case.
export function buildScriptAutostartAction(script, options) {
    if (typeof script?.filename !== "string" || !script.filename) return null;
    if (script?.daemon !== true) return null;

    const optionKey = getServiceAutostartOptionKey(script.filename);
    const enabled = options?.[optionKey] === true;
    return {
        id: `${script.filename}-autostart`,
        label: "Autostart",
        kind: "save-options",
        tone: enabled ? "success" : "neutral",
        tooltip: enabled
            ? `${script.label ?? script.filename} is auto-started and auto-restarted by the Integration Service Supervisor. Click to disable.`
            : `${script.label ?? script.filename} will not be started or restarted automatically (opt-in). Click to enable.`,
        optionOverrides: { [optionKey]: !enabled },
    };
}

// A user-configurable runtime preference for whether this service shows up as a clickable
// entry in the left-nav menu, independent of its running/stopped state and distinct from the
// descriptor's own static menuVisible/alwaysVisible flags (which the author controls in code).
export function buildServiceMenuVisibilityAction(service, options, views = []) {
    if (typeof service?.id !== "string" || !service.id) return null;
    if (!service?.pluginFile) return null;

    // Some services surface as a left-nav menu entry (directly or via an associated view);
    // others (e.g. Player Stats) surface only as a workspace/system-overview widget column.
    // Either way the same option key is reused as a general visibility flag for the service.
    const associatedView = findAssociatedViewForService(views, service.id);
    const menuTargetId = associatedView?.id ?? service.id;
    const menuTargetLabel = associatedView?.menuLabel ?? service.menuLabel;

    const optionKey = getServiceMenuVisibilityOptionKey(menuTargetId);
    const visible = isServiceVisibleInMenu(menuTargetId, options);
    return {
        id: `${service.id}-menu-visibility`,
        label: visible ? "Hide" : "Show",
        kind: "save-options",
        tone: visible ? "success" : "warn",
        tooltip: visible
            ? `${menuTargetLabel} is visible. Click to hide it - it keeps running in the background either way.`
            : `${menuTargetLabel} is hidden. Click to show it again.`,
        optionOverrides: { [optionKey]: !visible },
    };
}

// Views with no backing service (e.g. File Manager, Script Log) get a synthetic Plugins-list
// row (see dashboard-registry.js's getViewOnlyPluginEntries) whose only meaningful action is
// hiding/showing its own left-nav menu entry directly by view id.
export function buildViewOnlyPluginVisibilityAction(entry, options) {
    if (typeof entry?.viewId !== "string" || !entry.viewId) return null;
    const optionKey = getServiceMenuVisibilityOptionKey(entry.viewId);
    const visible = isServiceVisibleInMenu(entry.viewId, options);
    return {
        id: `${entry.id}-menu-visibility`,
        label: visible ? "Hide" : "Show",
        kind: "save-options",
        tone: visible ? "success" : "warn",
        tooltip: visible
            ? `${entry.label} is shown in the left-nav menu. Click to hide it.`
            : `${entry.label} is hidden from the left-nav menu. Click to show it again.`,
        optionOverrides: { [optionKey]: !visible },
    };
}

export function buildScriptListActions(selectedScript, dashboardOptions, scriptActionOptions, services = [], views = []) {
    if (selectedScript?.viewOnly) {
        const visibilityAction = buildViewOnlyPluginVisibilityAction(selectedScript, dashboardOptions);
        return visibilityAction ? [visibilityAction] : [];
    }
    const baseActions = buildScriptActions(selectedScript, scriptActionOptions);
    if (!selectedScript?.filename) return baseActions;
    const matchedService = services.find((service) => service.pluginFile === selectedScript.filename);
    const autostartAction = matchedService
        ? buildServiceAutostartAction(matchedService, dashboardOptions)
        : buildScriptAutostartAction(selectedScript, dashboardOptions);
    // Menu visibility only makes sense for a real registered service - a bare daemon script
    // was never shown in the left-nav menu to begin with.
    const menuVisibilityAction = matchedService ? buildServiceMenuVisibilityAction(matchedService, dashboardOptions, views) : null;
    const extraActions = [autostartAction, menuVisibilityAction].filter(Boolean);
    if (extraActions.length === 0) return baseActions;

    // Slot these right after Restart, ahead of the Edit actions, rather than tacking them
    // onto the very end of the row.
    const restartIndex = baseActions.findIndex((action) => action.actionId === SCRIPT_ACTION_IDS.RESTART);
    const insertAt = restartIndex >= 0 ? restartIndex + 1 : baseActions.length;
    return [...baseActions.slice(0, insertAt), ...extraActions, ...baseActions.slice(insertAt)];
}
