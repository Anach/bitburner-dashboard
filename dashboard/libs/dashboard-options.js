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
import {
    DASHBOARD_RAM_LIMIT_MODE_GB,
    DASHBOARD_RAM_OPTIONS_SCHEMA_VERSION,
    normalizeDashboardRamLimitMode,
    normalizeDashboardRamPercent,
    normalizeDashboardRamSetting,
    resolveReservedHomeRamSetting,
} from "dashboard/libs/dashboard-ram-settings.js";

export { normalizeDashboardRamSetting };

export const DEFAULT_HIDDEN_SCRIPT_FOLDERS = ["dashboard", "libs", "trashbin"];
export const DEFAULT_HIDDEN_SCRIPT_FOLDERS_OPTION = normalizeScriptFolders(DEFAULT_HIDDEN_SCRIPT_FOLDERS);
export const DEFAULT_HIDDEN_SCRIPT_FILES_OPTION = "";

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

function parseServiceStartOrder(rawOrder) {
    const candidates = Array.isArray(rawOrder) ? rawOrder : String(rawOrder ?? "").split(",");
    const seen = new Set();
    const ids = [];
    for (const candidate of candidates) {
        const id = String(candidate ?? "").trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
    }
    return ids;
}

export function normalizeServiceStartOrder(rawOrder) {
    return parseServiceStartOrder(rawOrder).join(",");
}

// Works against raw, un-normalized options too - service-supervisor.js's own readDashboardOptions
// never calls normalizeDashboardOptions.
export function getServiceStartOrder(options) {
    return parseServiceStartOrder(options?.serviceStartOrder);
}

// items: array of objects each with a .serviceId field, in the current natural/discovery order.
// A .map()+.sort() over the ORIGINAL array, not a rebuild through a Map<serviceId,item> - a
// serviceId can legitimately be "" or collide (integration authors sometimes omit it, the same
// pre-existing gap the Autostart toggle already has), and collapsing through a keyed Map would
// silently drop one of the colliding services from iteration entirely, not just misorder it.
export function sortByServiceStartOrder(items, options) {
    const order = getServiceStartOrder(options);
    if (order.length === 0) return items.slice();
    const rankById = new Map(order.map((id, index) => [id, index]));
    return items
        .map((item, naturalIndex) => ({
            item,
            naturalIndex,
            rank: rankById.has(item.serviceId) ? rankById.get(item.serviceId) : null,
        }))
        .sort((a, b) => {
            if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
            if (a.rank !== null) return -1;
            if (b.rank !== null) return 1;
            return a.naturalIndex - b.naturalIndex;
        })
        .map((entry) => entry.item);
}

export const HIDE_UNQUALIFIED_PLUGINS_MODE_NONE = "None";
export const HIDE_UNQUALIFIED_PLUGINS_MODE_SINGULARITY = "Singularity";
export const HIDE_UNQUALIFIED_PLUGINS_MODES = [HIDE_UNQUALIFIED_PLUGINS_MODE_NONE, HIDE_UNQUALIFIED_PLUGINS_MODE_SINGULARITY];

export const MENU_UNLOCK_GLYPH_SCOPE_BOTH = "Both";
export const MENU_UNLOCK_GLYPH_SCOPE_MAIN = "Main menu only";
export const MENU_UNLOCK_GLYPH_SCOPE_SUBMENUS = "Sub-menus only";
export const MENU_UNLOCK_GLYPH_SCOPES = [
    MENU_UNLOCK_GLYPH_SCOPE_BOTH,
    MENU_UNLOCK_GLYPH_SCOPE_MAIN,
    MENU_UNLOCK_GLYPH_SCOPE_SUBMENUS,
];

export function normalizeMenuUnlockGlyphScope(value) {
    return MENU_UNLOCK_GLYPH_SCOPES.includes(value) ? value : MENU_UNLOCK_GLYPH_SCOPE_BOTH;
}

export function normalizeMenuUnlockGlyphMaxCount(value, fallback = 5) {
    const fallbackValue = Number.isFinite(Number(fallback)) ? Math.floor(Number(fallback)) : 5;
    const numericValue = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallbackValue;
    // Three slots preserve the widest mandatory combination: danger (!!) plus runtime status.
    return Math.min(12, Math.max(3, numericValue));
}

export function normalizeMenuUnlockGlyphOpacity(value, fallback = 0.58) {
    const fallbackValue = Number.isFinite(Number(fallback)) ? Number(fallback) : 0.58;
    const numericValue = Number.isFinite(Number(value)) ? Number(value) : fallbackValue;
    return Math.round(Math.min(1, Math.max(0.1, numericValue)) * 100) / 100;
}

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
        dashboardRamOptionsSchemaVersion: DASHBOARD_RAM_OPTIONS_SCHEMA_VERSION,
        // Was 1024 while this option was purely decorative (displayed, never enforced). Now that
        // service-supervisor.js actually respects it as an autostart RAM headroom floor, a huge
        // default would silently block every autostart daemon on any realistic home RAM size.
        // Defaults to 0 (today's prior behavior - no reservation) so nothing changes unless the
        // user opts in with a higher value, consistent with this project's autostart-is-opt-in
        // convention elsewhere.
        reservedHomeRam: 0,
        reservedHomeRamLimitMode: DASHBOARD_RAM_LIMIT_MODE_GB,
        reservedHomeRamPercent: 0,
        // Aggregate RAM ceiling for service entry scripts managed by the supervisor. Zero keeps
        // the historical unlimited behavior until the user deliberately sets a budget.
        serviceStartupRamLimit: 0,
        serviceStartupRamLimitMode: DASHBOARD_RAM_LIMIT_MODE_GB,
        serviceStartupRamLimitPercent: 0,
        dashboardThemeMode: DASHBOARD_THEME_MODE_GAME,
        dashboardTextSizeMode: DASHBOARD_TEXT_SIZE_COMFORTABLE,
        dashboardWindowStartupMode: DASHBOARD_STARTUP_MODE_REMEMBER,
        dashboardCurrentWorkFocusEnabled: false,
        hideUnqualifiedPluginsMode: HIDE_UNQUALIFIED_PLUGINS_MODE_NONE,
        menuUnlockGlyphsEnabled: true,
        menuUnlockGlyphMaxCount: 5,
        menuUnlockGlyphOpacity: 0.58,
        menuUnlockGlyphScope: MENU_UNLOCK_GLYPH_SCOPE_BOTH,
        dashboardLastWindowMode: DASHBOARD_WINDOW_MODE_WINDOWED,
        dashboardWindowedX: -1,
        dashboardWindowedY: -1,
        dashboardWindowedWidth: DEFAULT_TAIL_WIDTH,
        dashboardWindowedHeight: DEFAULT_TAIL_HEIGHT,
        hiddenScriptFolders: DEFAULT_HIDDEN_SCRIPT_FOLDERS_OPTION,
        hiddenScriptFiles: DEFAULT_HIDDEN_SCRIPT_FILES_OPTION,
        serviceStartOrder: "",
    };
    for (const service of services) {
        Object.assign(defaults, getPluginIntegrationDefaultOptions(service.pluginMetadata));
        // No autostart default seeded here: it stays unset (off) until the user's own
        // toggle click writes an explicit true into the options file.
    }
    return defaults;
}

function migrateHiddenScriptFolders(rawFolders) {
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
        dashboardRamOptionsSchemaVersion: DASHBOARD_RAM_OPTIONS_SCHEMA_VERSION,
        reservedHomeRam: resolveReservedHomeRamSetting(rawOptions, defaults.reservedHomeRam),
        reservedHomeRamLimitMode: normalizeDashboardRamLimitMode(
            rawOptions.reservedHomeRamLimitMode,
            defaults.reservedHomeRamLimitMode,
        ),
        reservedHomeRamPercent: normalizeDashboardRamPercent(
            rawOptions.reservedHomeRamPercent,
            defaults.reservedHomeRamPercent,
        ),
        serviceStartupRamLimit: normalizeDashboardRamSetting(rawOptions.serviceStartupRamLimit, defaults.serviceStartupRamLimit),
        serviceStartupRamLimitMode: normalizeDashboardRamLimitMode(
            rawOptions.serviceStartupRamLimitMode,
            defaults.serviceStartupRamLimitMode,
        ),
        serviceStartupRamLimitPercent: normalizeDashboardRamPercent(
            rawOptions.serviceStartupRamLimitPercent,
            defaults.serviceStartupRamLimitPercent,
        ),
        dashboardThemeMode: normalizeDashboardThemeMode(rawOptions.dashboardThemeMode ?? defaults.dashboardThemeMode),
        dashboardTextSizeMode: normalizeDashboardTextSizeMode(rawOptions.dashboardTextSizeMode ?? defaults.dashboardTextSizeMode),
        dashboardWindowStartupMode: normalizeDashboardStartupMode(rawOptions.dashboardWindowStartupMode ?? defaults.dashboardWindowStartupMode),
        dashboardCurrentWorkFocusEnabled: rawOptions.dashboardCurrentWorkFocusEnabled === true,
        hideUnqualifiedPluginsMode: normalizeHideUnqualifiedPluginsMode(rawOptions.hideUnqualifiedPluginsMode ?? defaults.hideUnqualifiedPluginsMode),
        menuUnlockGlyphsEnabled: rawOptions.menuUnlockGlyphsEnabled !== false,
        menuUnlockGlyphMaxCount: normalizeMenuUnlockGlyphMaxCount(rawOptions.menuUnlockGlyphMaxCount, defaults.menuUnlockGlyphMaxCount),
        menuUnlockGlyphOpacity: normalizeMenuUnlockGlyphOpacity(rawOptions.menuUnlockGlyphOpacity, defaults.menuUnlockGlyphOpacity),
        menuUnlockGlyphScope: normalizeMenuUnlockGlyphScope(rawOptions.menuUnlockGlyphScope ?? defaults.menuUnlockGlyphScope),
        dashboardLastWindowMode: normalizeDashboardWindowMode(rawOptions.dashboardLastWindowMode ?? defaults.dashboardLastWindowMode),
        dashboardWindowedX: normalizeGeometryNumber(rawOptions.dashboardWindowedX, defaults.dashboardWindowedX, -1),
        dashboardWindowedY: normalizeGeometryNumber(rawOptions.dashboardWindowedY, defaults.dashboardWindowedY, -1),
        dashboardWindowedWidth: normalizeGeometryNumber(rawOptions.dashboardWindowedWidth, defaults.dashboardWindowedWidth, 150),
        dashboardWindowedHeight: normalizeGeometryNumber(rawOptions.dashboardWindowedHeight, defaults.dashboardWindowedHeight, DEFAULT_TAIL_TITLE_HEIGHT),
        // Renamed from ignoredScript{Folders,Files} - "ignored" implied these scripts were also
        // exempt from the dashboard's own bulk kill actions, which was never the intent and has
        // since been fixed (they're bulk-killable; only hidden from the Script List display).
        // Falls back to the old key when present and the new one isn't, so an existing save's
        // configured value carries forward instead of silently resetting to defaults.
        hiddenScriptFolders: migrateHiddenScriptFolders(
            rawOptions.hiddenScriptFolders ?? rawOptions.ignoredScriptFolders ?? defaults.hiddenScriptFolders
        ),
        hiddenScriptFiles: normalizeScriptFiles(
            rawOptions.hiddenScriptFiles ?? rawOptions.ignoredScriptFiles ?? defaults.hiddenScriptFiles
        ),
        serviceStartOrder: normalizeServiceStartOrder(rawOptions.serviceStartOrder ?? defaults.serviceStartOrder),
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
