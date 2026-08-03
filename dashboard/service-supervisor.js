import { areCapabilityRequirementsMet, buildCapabilitySnapshot } from "dashboard/libs/capabilities.js";
import { discoverDashboardPlugins } from "dashboard/libs/plugin-loader.js";
import { startHomeScript } from "dashboard/libs/runtime-actions.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const SUPERVISOR_INTERVAL_MS = 30000;
const EXCLUDED_RUNTIME_FOLDERS = ["dashboard", "libs", "trashbin"];

function reportLaunchIssue(ns, script, status, previousIssues) {
    if (status !== "missing" && status !== "failed") {
        previousIssues.delete(script);
        return;
    }
    if (previousIssues.get(script) === status) return;

    const detail = status === "missing" ? "script is missing" : "not enough RAM or exec failed";
    ns.tprint(`[DASHBOARD] Could not start integrated service ${script}: ${detail}.`);
    previousIssues.set(script, status);
}

function discoverManagedServices(ns) {
    let homeFiles = [];
    try {
        homeFiles = ns.ls("home") ?? [];
    } catch (error) {
        return [];
    }

    return discoverDashboardPlugins(ns, homeFiles, {
        excludedRuntimeFolders: EXCLUDED_RUNTIME_FOLDERS,
    }).filter((plugin) => plugin?.metadata?.daemon !== false);
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[DASHBOARD] Integration Service Supervisor started.");
    ns.print("[LIFECYCLE] Integration Service Supervisor started.");

    const previousIssues = new Map();

    while (true) {
        const services = discoverManagedServices(ns);
        const capabilities = buildCapabilitySnapshot(ns);

        for (const service of services) {
            const requirements = Array.isArray(service.requirements) ? service.requirements : [];
            if (!areCapabilityRequirementsMet(requirements, capabilities)) continue;

            const script = service.filename;
            const args = Array.isArray(service.metadata?.launchArgs) ? service.metadata.launchArgs : [];
            const result = startHomeScript(ns, script, ...args);
            reportLaunchIssue(ns, script, result.status, previousIssues);
        }

        await ns.sleep(SUPERVISOR_INTERVAL_MS);
    }
}
