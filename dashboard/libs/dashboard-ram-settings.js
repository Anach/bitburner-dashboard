export const DASHBOARD_RAM_OPTIONS_SCHEMA_VERSION = 1;
export const LEGACY_DECORATIVE_RESERVED_HOME_RAM_GB = 1024;
export const DASHBOARD_RAM_LIMIT_MODE_GB = "Exact GB";
export const DASHBOARD_RAM_LIMIT_MODE_PERCENT = "Percentage";
export const DASHBOARD_RAM_LIMIT_MODES = [
    DASHBOARD_RAM_LIMIT_MODE_GB,
    DASHBOARD_RAM_LIMIT_MODE_PERCENT,
];

export function normalizeDashboardRamSetting(value, fallback = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return Math.floor(numeric);
    const fallbackNumeric = Number(fallback);
    return Number.isFinite(fallbackNumeric) && fallbackNumeric >= 0 ? Math.floor(fallbackNumeric) : 0;
}

export function normalizeDashboardRamLimitMode(value, fallback = DASHBOARD_RAM_LIMIT_MODE_GB) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "exact gb" || normalized === "gb") return DASHBOARD_RAM_LIMIT_MODE_GB;
    if (normalized === "percentage" || normalized === "percent" || normalized === "%") {
        return DASHBOARD_RAM_LIMIT_MODE_PERCENT;
    }
    return fallback;
}

export function normalizeDashboardRamPercent(value, fallback = 0) {
    const numeric = Math.floor(Number(value));
    if (Number.isFinite(numeric) && numeric >= 0) return Math.min(100, numeric);
    const fallbackNumeric = Math.floor(Number(fallback));
    return Number.isFinite(fallbackNumeric) && fallbackNumeric >= 0
        ? Math.min(100, fallbackNumeric)
        : 0;
}

export function resolveDashboardRamLimit(totalHomeRam, options = {}) {
    const mode = normalizeDashboardRamLimitMode(options.mode);
    const exactGb = normalizeDashboardRamSetting(options.exactGb);
    const percent = normalizeDashboardRamPercent(options.percent);
    const normalizedTotalRam = Math.max(0, Number(totalHomeRam) || 0);
    const effectiveLimit = mode === DASHBOARD_RAM_LIMIT_MODE_PERCENT
        ? (percent > 0 ? normalizedTotalRam * percent / 100 : 0)
        : exactGb;
    return { mode, exactGb, percent, effectiveLimit };
}

// Before Home RAM safeguards were enforced, reservedHomeRam defaulted to 1024 as a decorative
// display value. Existing option files retained that value after enforcement was introduced,
// silently blocking every new service on smaller Home servers. The schema marker distinguishes
// that legacy default from a user deliberately choosing 1024 GB under the current behavior.
export function resolveReservedHomeRamSetting(options = {}, fallback = 0) {
    const normalizedFallback = normalizeDashboardRamSetting(fallback);
    const reservedHomeRam = normalizeDashboardRamSetting(options?.reservedHomeRam, normalizedFallback);
    const schemaVersion = normalizeDashboardRamSetting(options?.dashboardRamOptionsSchemaVersion);
    if (
        schemaVersion < DASHBOARD_RAM_OPTIONS_SCHEMA_VERSION
        && reservedHomeRam === LEGACY_DECORATIVE_RESERVED_HOME_RAM_GB
    ) {
        return normalizedFallback;
    }
    return reservedHomeRam;
}

export function resolveReservedHomeRamLimit(totalHomeRam, options = {}, fallback = 0) {
    return resolveDashboardRamLimit(totalHomeRam, {
        mode: options?.reservedHomeRamLimitMode,
        exactGb: resolveReservedHomeRamSetting(options, fallback),
        percent: options?.reservedHomeRamPercent,
    });
}

export function resolveServiceStartupRamLimit(totalHomeRam, options = {}, fallback = 0) {
    return resolveDashboardRamLimit(totalHomeRam, {
        mode: options?.serviceStartupRamLimitMode,
        exactGb: normalizeDashboardRamSetting(options?.serviceStartupRamLimit, fallback),
        percent: options?.serviceStartupRamLimitPercent,
    });
}
