import {
    DASHBOARD_THEME_MODE_DASHBOARD,
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

export const DASHBOARD_PLAYER_HUD_MODE_AUTO = "Auto";
export const DASHBOARD_PLAYER_HUD_MODE_SHOWN = "Shown";
export const DASHBOARD_PLAYER_HUD_MODE_HIDDEN = "Hidden";
export const DEFAULT_IGNORED_SCRIPT_FOLDERS = ["dashboard", "libs", "trashbin"];
export const DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION = normalizeScriptFolders(DEFAULT_IGNORED_SCRIPT_FOLDERS);
export const DEFAULT_IGNORED_SCRIPT_FILES_OPTION = "";

export function getServiceAutostartOptionKey(serviceId) {
    return `serviceAutostart:${serviceId}`;
}

export function isServiceAutostartEnabled(serviceId, options) {
    return getObject(options)[getServiceAutostartOptionKey(serviceId)] !== false;
}

function isDaemonEligible(pluginMetadata) {
    return pluginMetadata?.daemon !== false;
}

function getObject(value) {
    return value && typeof value === "object" ? value : {};
}

export function normalizeDashboardPlayerHudMode(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === DASHBOARD_PLAYER_HUD_MODE_SHOWN.toLowerCase()) return DASHBOARD_PLAYER_HUD_MODE_SHOWN;
    if (normalized === DASHBOARD_PLAYER_HUD_MODE_HIDDEN.toLowerCase()) return DASHBOARD_PLAYER_HUD_MODE_HIDDEN;
    return DASHBOARD_PLAYER_HUD_MODE_AUTO;
}

export function getDefaultDashboardOptions(services = []) {
    const defaults = {
        reservedHomeRam: 1024,
        dashboardThemeMode: DASHBOARD_THEME_MODE_DASHBOARD,
        dashboardTextSizeMode: DASHBOARD_TEXT_SIZE_COMFORTABLE,
        dashboardPlayerHudMode: DASHBOARD_PLAYER_HUD_MODE_AUTO,
        dashboardWindowStartupMode: DASHBOARD_STARTUP_MODE_REMEMBER,
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
        if (typeof service.id === "string" && service.id && isDaemonEligible(service.pluginMetadata)) {
            defaults[getServiceAutostartOptionKey(service.id)] = true;
        }
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
        reservedHomeRam: Number(rawOptions.reservedHomeRam) >= 0 ? Math.floor(Number(rawOptions.reservedHomeRam)) : defaults.reservedHomeRam,
        dashboardThemeMode: normalizeDashboardThemeMode(rawOptions.dashboardThemeMode ?? defaults.dashboardThemeMode),
        dashboardTextSizeMode: normalizeDashboardTextSizeMode(rawOptions.dashboardTextSizeMode ?? defaults.dashboardTextSizeMode),
        dashboardPlayerHudMode: normalizeDashboardPlayerHudMode(rawOptions.dashboardPlayerHudMode ?? defaults.dashboardPlayerHudMode),
        dashboardWindowStartupMode: normalizeDashboardStartupMode(rawOptions.dashboardWindowStartupMode ?? defaults.dashboardWindowStartupMode),
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
            normalized[autostartKey] = rawOptions[autostartKey] !== false;
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
