import {
    DASHBOARD_THEME_MODE_GAME,
    DASHBOARD_TEXT_SIZE_COMFORTABLE,
    normalizeDashboardTextSizeMode,
    normalizeDashboardThemeMode,
} from "dashboard/libs/theme-adapter.js";
import {
    DASHBOARD_STARTUP_MODE_REMEMBER,
    DASHBOARD_WINDOW_MODE_WINDOWED,
    DEFAULT_TAIL_HEIGHT,
    DEFAULT_TAIL_TITLE_HEIGHT,
    DEFAULT_TAIL_WIDTH,
    normalizeDashboardStartupMode,
    normalizeDashboardWindowMode,
} from "dashboard/libs/tail-layout.js";
import {
    getPluginIntegrationDefaultOptions,
    normalizePluginIntegrationOptions,
} from "dashboard/libs/plugin-integration.js";
import {
    normalizeScriptFiles,
    normalizeScriptFolders,
    parseScriptFolders,
} from "dashboard/libs/script-folders.js";

export const DEFAULT_IGNORED_SCRIPT_FOLDERS = ["dashboard", "libs", "trashbin"];
export const DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION = normalizeScriptFolders(DEFAULT_IGNORED_SCRIPT_FOLDERS);
export const DEFAULT_IGNORED_SCRIPT_FILES_OPTION = "";

export function getServiceAutostartOptionKey(serviceId) {
    return `serviceAutostart:${serviceId}`;
}

// Autostart defaults OFF for every daemon (integration or bare script) until the user
// explicitly opts in via its toggle - nothing gets to assume it's safe to auto-launch.
export function isServiceAutostartEnabled(serviceId, options) {
    return getObject(options)[getServiceAutostartOptionKey(serviceId)] === true;
}

export function getServiceMenuVisibilityOptionKey(serviceId) {
    return `serviceMenuVisible:${serviceId}`;
}

// Unlike autostart, menu visibility defaults ON - hiding is something the user opts out of
// per service to declutter the nav list, independent of whether it's currently running.
// This is a user-configurable runtime preference, distinct from the descriptor's own static
// menuVisible/alwaysVisible flags, which the plugin/integration author controls in code.
export function isServiceVisibleInMenu(serviceId, options) {
    return getObject(options)[getServiceMenuVisibilityOptionKey(serviceId)] !== false;
}

export const HIDE_UNQUALIFIED_PLUGINS_MODE_NONE = "None";
export const HIDE_UNQUALIFIED_PLUGINS_MODE_SINGULARITY = "Singularity";
export const HIDE_UNQUALIFIED_PLUGINS_MODES = [HIDE_UNQUALIFIED_PLUGINS_MODE_NONE, HIDE_UNQUALIFIED_PLUGINS_MODE_SINGULARITY];

// Global switch: which capability gate, if any, should hide plugins/integrations with an unmet
// *required* requirement from the left-nav menu entirely, on top of the per-service hide/show
// flag above. Scoped to a single named capability rather than "any unmet requirement" because
// today Singularity is the only gate worth blanket-hiding for; add more mode values (and their
// requirement mapping in plugin-requirements.js) as other capability-gated plugins show up.
export function normalizeHideUnqualifiedPluginsMode(value) {
    return HIDE_UNQUALIFIED_PLUGINS_MODES.includes(value) ? value : HIDE_UNQUALIFIED_PLUGINS_MODE_NONE;
}

function isDaemonEligible(pluginMetadata) {
    return pluginMetadata?.daemon !== false;
}

function getObject(value) {
    return value && typeof value === "object" ? value : {};
}

export function getDefaultDashboardOptions(services = []) {
    const defaults = {
        reservedHomeRam: 1024,
        dashboardThemeMode: DASHBOARD_THEME_MODE_GAME,
        dashboardTextSizeMode: DASHBOARD_TEXT_SIZE_COMFORTABLE,
        dashboardWindowStartupMode: DASHBOARD_STARTUP_MODE_REMEMBER,
        hideUnqualifiedPluginsMode: HIDE_UNQUALIFIED_PLUGINS_MODE_NONE,
        dashboardLastWindowMode: DASHBOARD_WINDOW_MODE_WINDOWED,
        dashboardWindowedX: -1,
        dashboardWindowedY: -1,
        dashboardWindowedWidth: DEFAULT_TAIL_WIDTH,
        dashboardWindowedHeight: DEFAULT_TAIL_HEIGHT,
        ignoredScriptFolders: DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION,
        ignoredScriptFiles: DEFAULT_IGNORED_SCRIPT_FILES_OPTION,
    };
    for (const service of services) {
        Object.assign(defaults, getPluginIntegrationDefaultOptions(service.pluginMetadata));
        // No autostart default seeded here: it stays unset (off) until the user's own
        // toggle click writes an explicit true into the options file.
    }
    return defaults;
}

function migrateIgnoredScriptFolders(rawFolders) {
    const migrated = parseScriptFolders(rawFolders).map((folder) => {
        if (folder === "dashboard-core" || folder === "dashboard-integrations" || folder === "dashboard-libs") {
            return "dashboard";
        }
        return folder;
    });
    return normalizeScriptFolders(migrated);
}

export function normalizeDashboardOptions(rawOptions = {}, services = []) {
    const defaults = getDefaultDashboardOptions(services);
    const normalizeGeometryNumber = (value, fallback, minimum = Number.NEGATIVE_INFINITY) => {
        if (value === null || value === undefined || value === "") return fallback;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? Math.max(minimum, Math.floor(numeric)) : fallback;
    };
    const normalized = {
        // Carry through any key this function doesn't explicitly know about (per-service
        // menu-visibility flags, per-bare-script autostart flags keyed by filename, etc.) -
        // otherwise every save silently drops anything not enumerated below.
        ...rawOptions,
        reservedHomeRam: Number(rawOptions.reservedHomeRam) >= 0 ? Math.floor(Number(rawOptions.reservedHomeRam)) : defaults.reservedHomeRam,
        dashboardThemeMode: normalizeDashboardThemeMode(rawOptions.dashboardThemeMode ?? defaults.dashboardThemeMode),
        dashboardTextSizeMode: normalizeDashboardTextSizeMode(rawOptions.dashboardTextSizeMode ?? defaults.dashboardTextSizeMode),
        dashboardWindowStartupMode: normalizeDashboardStartupMode(rawOptions.dashboardWindowStartupMode ?? defaults.dashboardWindowStartupMode),
        hideUnqualifiedPluginsMode: normalizeHideUnqualifiedPluginsMode(rawOptions.hideUnqualifiedPluginsMode ?? defaults.hideUnqualifiedPluginsMode),
        dashboardLastWindowMode: normalizeDashboardWindowMode(rawOptions.dashboardLastWindowMode ?? defaults.dashboardLastWindowMode),
        dashboardWindowedX: normalizeGeometryNumber(rawOptions.dashboardWindowedX, defaults.dashboardWindowedX, -1),
        dashboardWindowedY: normalizeGeometryNumber(rawOptions.dashboardWindowedY, defaults.dashboardWindowedY, -1),
        dashboardWindowedWidth: normalizeGeometryNumber(rawOptions.dashboardWindowedWidth, defaults.dashboardWindowedWidth, 150),
        dashboardWindowedHeight: normalizeGeometryNumber(rawOptions.dashboardWindowedHeight, defaults.dashboardWindowedHeight, DEFAULT_TAIL_TITLE_HEIGHT),
        ignoredScriptFolders: migrateIgnoredScriptFolders(
            rawOptions.ignoredScriptFolders === undefined
                ? defaults.ignoredScriptFolders
                : rawOptions.ignoredScriptFolders
        ),
        ignoredScriptFiles: normalizeScriptFiles(
            rawOptions.ignoredScriptFiles === undefined
                ? defaults.ignoredScriptFiles
                : rawOptions.ignoredScriptFiles
        ),
    };
    for (const service of services) {
        Object.assign(normalized, normalizePluginIntegrationOptions(service.pluginMetadata, rawOptions));
        if (typeof service.id === "string" && service.id && isDaemonEligible(service.pluginMetadata)) {
            const autostartKey = getServiceAutostartOptionKey(service.id);
            normalized[autostartKey] = rawOptions[autostartKey] === true;
        }
    }
    return normalized;
}

export function dashboardOptionsEqual(leftOptions, rightOptions, services = []) {
    const left = normalizeDashboardOptions(leftOptions, services);
    const right = normalizeDashboardOptions(rightOptions, services);
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => left[key] === right[key]);
}
