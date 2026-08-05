import { areCapabilityRequirementsMet, buildCapabilitySnapshot } from "dashboard/libs/capabilities.js";
import { discoverDashboardPlugins, isDashboardPluginDescriptorFilename } from "dashboard/libs/plugin-loader.js";
import { isServiceAutostartEnabled } from "dashboard/libs/dashboard-options.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const SUPERVISOR_INTERVAL_MS = 30000;
const EXCLUDED_RUNTIME_FOLDERS = ["dashboard", "libs", "trashbin"];
const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";
let cachedFileSignature = "";
let cachedManagedServices = [];

function readDashboardOptions(ns) {
    if (!ns.fileExists(DASHBOARD_OPTIONS_FILE, "home")) return {};
    try {
        const parsed = JSON.parse(ns.read(DASHBOARD_OPTIONS_FILE));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        return {};
    }
}

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

function buildDescriptorSignature(ns, normalizedFiles) {
    return normalizedFiles
        .filter(isDashboardPluginDescriptorFilename)
        .map((filename) => {
            let fileMetadata = null;
            try {
                fileMetadata = ns.getFileMetadata(filename, "home");
            } catch (error) {
                fileMetadata = null;
            }
            const stamp = fileMetadata ? `${Number(fileMetadata.mtime) || 0}:${Number(fileMetadata.size) || 0}` : "";
            return `${filename}@${stamp}`;
        })
        .join("|");
}

function discoverManagedServices(ns, homeFiles) {
    const normalizedFiles = (Array.isArray(homeFiles) ? homeFiles : [])
        .filter((filename) => typeof filename === "string")
        .slice()
        .sort();
    const fileSignature = `${normalizedFiles.join("|")}::${buildDescriptorSignature(ns, normalizedFiles)}`;
    if (fileSignature === cachedFileSignature) return cachedManagedServices;

    cachedFileSignature = fileSignature;
    cachedManagedServices = discoverDashboardPlugins(ns, normalizedFiles, {
        excludedRuntimeFolders: EXCLUDED_RUNTIME_FOLDERS,
    }).filter((plugin) => plugin?.metadata?.daemon !== false);
    return cachedManagedServices;
}

function startManagedService(ns, service, runningFiles) {
    const script = service.filename;
    if (runningFiles.has(script)) return { status: "already-running" };

    const args = Array.isArray(service.metadata?.launchArgs) ? service.metadata.launchArgs : [];
    const pid = ns.run(script, 1, ...args);
    if (!(pid > 0)) return { status: "failed" };

    runningFiles.add(script);
    ns.print(`[LIFECYCLE] Started ${script}.`);
    return { status: "started", pid };
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[DASHBOARD] Integration Service Supervisor started.");
    ns.print("[LIFECYCLE] Integration Service Supervisor started.");

    const previousIssues = new Map();

    while (true) {
        const homeFiles = ns.ls("home") ?? [];
        const services = discoverManagedServices(ns, homeFiles);
        if (services.length === 0) {
            const message = "[DASHBOARD] No enabled daemon integrations were discovered; Integration Service Supervisor stopped.";
            ns.print(message);
            ns.tprint(message);
            return;
        }

        const runningFiles = new Set((ns.ps("home") ?? []).map((process) => process.filename));
        const capabilities = buildCapabilitySnapshot(ns);
        const options = readDashboardOptions(ns);

        for (const service of services) {
            const requirements = Array.isArray(service.requirements) ? service.requirements : [];
            if (!areCapabilityRequirementsMet(requirements, capabilities)) continue;
            if (!isServiceAutostartEnabled(service.serviceId, options)) continue;

            const script = service.filename;
            const result = startManagedService(ns, service, runningFiles);
            reportLaunchIssue(ns, script, result.status, previousIssues);
        }

        await ns.sleep(SUPERVISOR_INTERVAL_MS);
    }
}
