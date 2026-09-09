import { loadPersistedDashboardOptions } from "dashboard/libs/persisted-options.js";
import { loadResetFileManifestContributions, normalizeResetFilePath } from "dashboard/plugins/file-shredder/reset-file-manifest.js";

export const FILE_SHREDDER_TELEMETRY_PATH = "data/file_shredder_stats.json";

const PROTECTED_PATHS = new Set([
    FILE_SHREDDER_TELEMETRY_PATH,
    "data/dashboard_options.json",
    "data/deploy_manifest.json",
]);

function getAdditionalPaths(ns) {
    const options = loadPersistedDashboardOptions(ns);
    const configured = typeof options?.filesToClear === "string"
        ? options.filesToClear
        : "";
    return configured.split(",").map(normalizeResetFilePath).filter(Boolean);
}

function collectResetPaths(contributions, additionalPaths) {
    return [...new Set([...(contributions?.files ?? []), ...additionalPaths])]
        .filter((path) => !PROTECTED_PATHS.has(path));
}

function removePathIfPresent(ns, path) {
    if (!ns.fileExists(path, "home")) return 0;
    return ns.rm(path, "home") ? 1 : 0;
}

function clearResetPaths(ns, paths, prefixes) {
    let clearedCount = 0;
    for (const path of paths) clearedCount += removePathIfPresent(ns, path);
    for (const prefix of prefixes) {
        for (const path of ns.ls("home", prefix)) {
            if (!path.startsWith(prefix) || PROTECTED_PATHS.has(path)) continue;
            clearedCount += removePathIfPresent(ns, path);
        }
    }
    return clearedCount;
}

function readCurrentResetMarker(ns) {
    try {
        const resetInfo = ns.getResetInfo() ?? {};
        return {
            lastAugReset: Number(resetInfo.lastAugReset) || 0,
            lastNodeReset: Number(resetInfo.lastNodeReset) || 0,
        };
    } catch (error) {
        return { lastAugReset: 0, lastNodeReset: 0 };
    }
}

function readLastKnownResetState(ns) {
    if (!ns.fileExists(FILE_SHREDDER_TELEMETRY_PATH, "home")) return null;
    try {
        const recorded = JSON.parse(ns.read(FILE_SHREDDER_TELEMETRY_PATH));
        const lastAugReset = Number(recorded?.lastAugReset);
        if (!Number.isFinite(lastAugReset)) return null;
        // Pre-marker telemetry stored only lastAugReset. Keep that valid rather than treating the
        // schema addition itself as a game reset and clearing current-run state after an upgrade.
        const lastNodeReset = Number(recorded?.lastNodeReset);
        return {
            marker: {
                lastAugReset,
                lastNodeReset: Number.isFinite(lastNodeReset) ? lastNodeReset : null,
            },
            lastSweepAt: Number(recorded?.lastSweepAt) || 0,
            lastClearedCount: Number(recorded?.lastClearedCount) || 0,
        };
    } catch (error) {
        return null;
    }
}

function isNewReset(currentMarker, knownMarker) {
    if (knownMarker === null) return true;
    return knownMarker.lastAugReset !== currentMarker.lastAugReset
        || (knownMarker.lastNodeReset !== null && knownMarker.lastNodeReset !== currentMarker.lastNodeReset);
}

async function publishTelemetry(ns, state) {
    await ns.write(FILE_SHREDDER_TELEMETRY_PATH, JSON.stringify({ generatedAt: Date.now(), ...state }), "w");
}

// Shared by the persistent File Shredder and init/reset-bootstrap.js. Keeping the actual cleanup
// here means init gets exactly the same path validation, manifests, protected files, and reset
// marker rules without making the persistent daemon inherit the bootstrap's spawn API.
export async function sweepFileShredderResetData(ns, contributions = loadResetFileManifestContributions(ns), options = {}) {
    const resetPaths = collectResetPaths(contributions, getAdditionalPaths(ns));
    const currentResetMarker = readCurrentResetMarker(ns);
    const lastKnownResetState = readLastKnownResetState(ns);
    const forced = options?.force === true;
    const shouldSweep = forced || isNewReset(currentResetMarker, lastKnownResetState?.marker ?? null);
    const clearedCount = shouldSweep
        ? clearResetPaths(ns, resetPaths, contributions.prefixes)
        : lastKnownResetState?.lastClearedCount ?? 0;
    const lastSweepAt = shouldSweep
        ? Date.now()
        : lastKnownResetState?.lastSweepAt ?? 0;

    await publishTelemetry(ns, {
        lastAugReset: currentResetMarker.lastAugReset,
        lastNodeReset: currentResetMarker.lastNodeReset,
        lastSweepAt,
        lastClearedCount: clearedCount,
        manifestPathCount: contributions.files.length,
        totalPathCount: resetPaths.length,
    });
    return { resetDetected: !forced && shouldSweep, forced, clearedCount };
}
