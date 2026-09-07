import { loadPersistedDashboardOptions } from "dashboard/libs/persisted-options.js";
import { loadResetFileManifestContributions, normalizeResetFilePath } from "dashboard/plugins/file-shredder/reset-file-manifest.js";

const LOOP_INTERVAL_MS = 10_000;
const MANIFEST_REFRESH_MS = 60_000;
const TELEMETRY_PATH = "data/file_shredder_stats.json";
const PROTECTED_PATHS = new Set([
    TELEMETRY_PATH,
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

async function publishTelemetry(ns, state) {
    await ns.write(TELEMETRY_PATH, JSON.stringify({ generatedAt: Date.now(), ...state }), "w");
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[FILE SHREDDER] Started.");

    let contributions = { files: [], prefixes: [], manifestFiles: [] };
    let nextManifestRefreshAt = 0;
    let lastSweepAt = 0;
    let lastClearedCount = 0;

    while (true) {
        const now = Date.now();
        if (now >= nextManifestRefreshAt) {
            contributions = loadResetFileManifestContributions(ns);
            nextManifestRefreshAt = now + MANIFEST_REFRESH_MS;
        }
        const resetPaths = collectResetPaths(contributions, getAdditionalPaths(ns));
        const currentResetAt = Number(ns.getResetInfo()?.lastAugReset) || 0;

        let lastKnownResetAt = null;
        if (ns.fileExists(TELEMETRY_PATH, "home")) {
            try {
                lastKnownResetAt = Number(JSON.parse(ns.read(TELEMETRY_PATH))?.lastAugReset) || 0;
            } catch (error) {
                lastKnownResetAt = null;
            }
        }

        if (lastKnownResetAt === null || lastKnownResetAt !== currentResetAt) {
            lastClearedCount = clearResetPaths(ns, resetPaths, contributions.prefixes);
            lastSweepAt = now;
            if (lastClearedCount > 0) {
                ns.tprint(`[FILE SHREDDER] Game reset detected - cleared ${lastClearedCount} file(s).`);
                ns.toast(`Reset detected: cleared ${lastClearedCount} file(s)`, "info", 6000);
            }
        }

        await publishTelemetry(ns, {
            lastAugReset: currentResetAt,
            lastSweepAt,
            lastClearedCount,
            manifestPathCount: contributions.files.length,
            totalPathCount: resetPaths.length,
        });
        await ns.sleep(LOOP_INTERVAL_MS);
    }
}
