export const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";

/**
 * Read the dashboard option store from a runtime plugin without importing the dashboard UI.
 * Missing or malformed state returns null so opt-in feature gates can fail closed.
 *
 * @param {NS} ns
 */
export function loadPersistedDashboardOptions(ns) {
    try {
        if (!ns.fileExists(DASHBOARD_OPTIONS_FILE, "home")) return null;
        const raw = ns.read(DASHBOARD_OPTIONS_FILE);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        return null;
    }
}

export function readPersistedBoolean(options, key, fallback = false) {
    return typeof options?.[key] === "boolean" ? options[key] : fallback;
}
