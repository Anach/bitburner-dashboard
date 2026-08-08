// Shared three-state classifier for a single telemetry-backed stat: whether it has live data,
// stale (last-known) data because its backing service isn't running, or no data at all because
// the service has never run. Deliberately not folded into plugin-integration.js - this needs
// nothing from the plugin-metadata schema and should stay reusable by any future per-service
// panel, not just the System Overview overview-line builders.
export const TELEMETRY_FRESHNESS_STATES = { LIVE: "live", STALE: "stale", MISSING: "missing" };

export function getTelemetryFreshnessState({ hasStats, requiresRuntime = true, running = false } = {}) {
    if (!hasStats) return TELEMETRY_FRESHNESS_STATES.MISSING;
    return requiresRuntime && !running ? TELEMETRY_FRESHNESS_STATES.STALE : TELEMETRY_FRESHNESS_STATES.LIVE;
}

// Hover-tooltip text (a stat's last-data-time doesn't fit inline on a tile this small - it goes
// here instead, along with the source attribution and a fuller staleness/missing explanation).
export function getTelemetryFreshnessTooltip(state, { sourceLabel, ageText } = {}) {
    const parts = [];
    if (sourceLabel) parts.push(sourceLabel);
    if (state === TELEMETRY_FRESHNESS_STATES.STALE) parts.push(ageText ? `Stopped - last data ${ageText}` : "Stopped");
    else if (state === TELEMETRY_FRESHNESS_STATES.MISSING) parts.push("Not started yet");
    return parts.join(" · ");
}
