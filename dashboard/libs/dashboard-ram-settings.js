export const DASHBOARD_RAM_OPTIONS_SCHEMA_VERSION = 1;
export const LEGACY_DECORATIVE_RESERVED_HOME_RAM_GB = 1024;

export function normalizeDashboardRamSetting(value, fallback = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return Math.floor(numeric);
    const fallbackNumeric = Number(fallback);
    return Number.isFinite(fallbackNumeric) && fallbackNumeric >= 0 ? Math.floor(fallbackNumeric) : 0;
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
