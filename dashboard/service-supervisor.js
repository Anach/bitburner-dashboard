import { areCapabilityRequirementsMet, buildCapabilitySnapshot } from "dashboard/libs/capabilities.js";
import { discoverDashboardPlugins, isDashboardPluginDescriptorFilename } from "dashboard/libs/plugin-loader.js";
import { isServiceAutostartEnabled, sortByServiceStartOrder } from "dashboard/libs/dashboard-options.js";
import { loadDashboardScriptMetadata } from "dashboard/libs/script-list.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const SUPERVISOR_INTERVAL_MS = 30000;
const EXCLUDED_RUNTIME_FOLDERS = ["dashboard", "libs", "trashbin"];
const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";
const AUTOSTART_PAUSE_FILE = "data/autostart_paused.txt";
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
    if (status === "reserved") {
        // Not an error - a deliberate skip to protect the Reserved Home RAM headroom (see
        // startManagedService). Quiet ns.print only (not tprint): this resolves itself once RAM
        // frees up or the user reorders/disables something, so it shouldn't read as alarming as
        // a real launch failure. Logged once per transition into this state, not every cycle.
        if (previousIssues.get(script) !== status) {
            ns.print(`[LIFECYCLE] Skipped ${script}: starting it would drop free home RAM below the Reserved Home RAM setting.`);
            previousIssues.set(script, status);
        }
        return;
    }
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

function isExcludedRuntimeFile(filename) {
    return EXCLUDED_RUNTIME_FOLDERS.some((folder) => filename === folder || filename.startsWith(`${folder}/`));
}

// Scripts that just declare `DASHBOARD_SCRIPT_METADATA: { daemon: true }` in their own header,
// with no paired *-integration.js descriptor, still get autostart/restart - just without any
// telemetry/status UI. This is the escape hatch from having to write a full integration for
// every simple daemon script.
function discoverBareDaemonScripts(ns, normalizedFiles, managedFilenames) {
    const candidates = [];
    for (const filename of normalizedFiles) {
        if (!filename.endsWith(".js") && !filename.endsWith(".jsx")) continue;
        if (managedFilenames.has(filename)) continue;
        if (isExcludedRuntimeFile(filename)) continue;

        const metadata = loadDashboardScriptMetadata(ns, filename);
        if (metadata?.daemon !== true) continue;

        candidates.push({ filename, serviceId: filename, requirements: [] });
    }
    return candidates;
}

function startManagedService(ns, service, runningFiles, reservedHomeRamGb) {
    const script = service.filename;
    if (runningFiles.has(script)) return { status: "already-running" };

    // Checked fresh (not pre-computed once per cycle) so each successive start in the same pass
    // sees the real, already-reduced headroom left by every service started earlier in this same
    // cycle - starting service #1 changes what's actually safe to start for service #2.
    if (reservedHomeRamGb > 0) {
        const scriptRam = ns.getScriptRam(script, "home");
        const freeRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
        if (scriptRam > 0 && freeRam - scriptRam < reservedHomeRamGb) {
            return { status: "reserved" };
        }
    }

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
        const integrationServices = discoverManagedServices(ns, homeFiles);
        const normalizedFiles = homeFiles.filter((filename) => typeof filename === "string");
        const managedFilenames = new Set(integrationServices.map((service) => service.filename));
        const bareDaemonScripts = discoverBareDaemonScripts(ns, normalizedFiles, managedFilenames);
        const services = [...integrationServices, ...bareDaemonScripts];
        if (services.length === 0) {
            const message = "[DASHBOARD] No enabled daemon integrations were discovered; Integration Service Supervisor stopped.";
            ns.print(message);
            ns.tprint(message);
            return;
        }

        if (ns.fileExists(AUTOSTART_PAUSE_FILE, "home")) {
            ns.print("[LIFECYCLE] Autostart is paused (Kill All Scripts); skipping this cycle.");
            await ns.sleep(SUPERVISOR_INTERVAL_MS);
            continue;
        }

        const runningFiles = new Set((ns.ps("home") ?? []).map((process) => process.filename));
        const capabilities = buildCapabilitySnapshot(ns);
        const options = readDashboardOptions(ns);
        // A service that fails ns.run() (out of RAM, exec error, etc.) just gets logged and
        // retried next cycle in the same order - no RAM-awareness beyond that. Letting the user
        // set an explicit order (persisted via the dashboard's Service Start Order UI) is how a
        // cheap/important daemon can be made to win the RAM race ahead of an expensive one when
        // free RAM is scarce.
        const orderedServices = sortByServiceStartOrder(services, options);
        // Reserved Home RAM (same option the Dashboard Options UI already exposes) additionally
        // stops the supervisor from greedily consuming every last GB: on-demand, transient work
        // like dashboard/action-worker.js (~8.5GB) has nowhere to run if autostart daemons have
        // already claimed the entire home server between them. Defaults to 0 (today's prior
        // behavior - no reservation) unless the user opts in with a higher value.
        const reservedHomeRamGb = Number(options.reservedHomeRam) || 0;

        for (const service of orderedServices) {
            const requirements = Array.isArray(service.requirements) ? service.requirements : [];
            if (!areCapabilityRequirementsMet(requirements, capabilities)) continue;
            if (!isServiceAutostartEnabled(service.serviceId, options)) continue;

            const script = service.filename;
            const result = startManagedService(ns, service, runningFiles, reservedHomeRamGb);
            reportLaunchIssue(ns, script, result.status, previousIssues);
        }

        await ns.sleep(SUPERVISOR_INTERVAL_MS);
    }
}
