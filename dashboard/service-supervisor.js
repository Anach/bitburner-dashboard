import {
    CAPABILITY_SNAPSHOT_FILE,
    areCapabilityRequirementsMet,
    buildCapabilitySnapshot,
    createCapabilitySnapshotTelemetry,
} from "dashboard/libs/capabilities.js";
import { discoverDashboardPlugins, isDashboardPluginDescriptorFilename } from "dashboard/libs/plugin-loader.js";
import {
    isServiceAutostartEnabled,
    sortByServiceStartOrder,
} from "dashboard/libs/dashboard-options.js";
import {
    resolveReservedHomeRamLimit,
    resolveServiceStartupRamLimit,
} from "dashboard/libs/dashboard-ram-settings.js";
import { loadDashboardScriptMetadata } from "dashboard/libs/script-list.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const SUPERVISOR_INTERVAL_MS = 30000;
const NETWORK_CHILD_RECONCILE_INTERVAL_MS = 1000;
const NETWORK_CHILD_SUPERVISOR_SCRIPT = "dashboard/libs/network-child-supervisor.js";
const NETWORK_CHILD_REQUEST_DIRECTORY = "data/network-child-requests/";
const EXCLUDED_RUNTIME_FOLDERS = ["dashboard", "libs", "trashbin"];
const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";
const AUTOSTART_PAUSE_FILE = "data/autostart_paused.txt";
const RAM_COMPARISON_EPSILON_GB = 1e-9;
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
    const protectedSkipMessage = status === "reserved"
        ? `starting it would use the Transient RAM Reserve`
        : status === "service-limit"
            ? `starting it would exceed the Service Startup RAM Limit`
            : "";
    if (protectedSkipMessage) {
        // Not an error - a deliberate skip to enforce a configured Home RAM safeguard. Quiet
        // ns.print only (not tprint): this resolves itself once RAM frees up or the user changes
        // the order/settings, so it shouldn't read as alarming as a real launch failure. Logged
        // once per transition into this state, not every cycle.
        if (previousIssues.get(script) !== status) {
            ns.print(`[LIFECYCLE] Skipped ${script}: ${protectedSkipMessage}.`);
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

export function calculateRunningManagedServiceRam(services, processes, resolveScriptRamGb) {
    const managedFilenames = new Set(
        (Array.isArray(services) ? services : [])
            .map((service) => service?.filename)
            .filter((filename) => typeof filename === "string" && filename.length > 0)
    );
    if (managedFilenames.size === 0 || typeof resolveScriptRamGb !== "function") return 0;

    let totalRamGb = 0;
    for (const process of Array.isArray(processes) ? processes : []) {
        if (!managedFilenames.has(process?.filename)) continue;
        const threads = Number(process?.threads);
        const scriptRamGb = Number(resolveScriptRamGb(process.filename));
        if (!(threads > 0) || !(scriptRamGb > 0)) continue;
        totalRamGb += threads * scriptRamGb;
    }
    return totalRamGb;
}

export function getServiceLaunchRamStatus({
    scriptRamGb,
    freeHomeRamGb,
    reservedHomeRamGb,
    runningManagedServiceRamGb,
    serviceStartupRamLimitGb,
}) {
    if (!(scriptRamGb > 0)) return "allowed";
    if (
        serviceStartupRamLimitGb > 0
        && runningManagedServiceRamGb + scriptRamGb - serviceStartupRamLimitGb > RAM_COMPARISON_EPSILON_GB
    ) {
        return "service-limit";
    }
    if (
        reservedHomeRamGb > 0
        && reservedHomeRamGb - (freeHomeRamGb - scriptRamGb) > RAM_COMPARISON_EPSILON_GB
    ) {
        return "reserved";
    }
    return "allowed";
}

function startManagedService(ns, service, runningFiles, ramLimits) {
    const script = service.filename;
    if (runningFiles.has(script)) return { status: "already-running" };

    const reservedHomeRamGb = ramLimits?.reservedHomeRamGb ?? 0;
    const serviceStartupRamLimitGb = ramLimits?.serviceStartupRamLimitGb ?? 0;
    const ramLimitsEnabled = reservedHomeRamGb > 0 || serviceStartupRamLimitGb > 0;
    const scriptRamGb = ramLimitsEnabled ? ramLimits.resolveScriptRamGb(script) : 0;
    // Free RAM is checked fresh so each successive start sees the headroom consumed by services
    // started earlier in this pass. The aggregate service total is maintained separately because
    // it must also include listed services that were already running when this cycle began.
    const freeHomeRamGb = reservedHomeRamGb > 0
        ? ns.getServerMaxRam("home") - ns.getServerUsedRam("home")
        : Number.POSITIVE_INFINITY;
    const ramStatus = getServiceLaunchRamStatus({
        scriptRamGb,
        freeHomeRamGb,
        reservedHomeRamGb,
        runningManagedServiceRamGb: ramLimits?.runningManagedServiceRamGb ?? 0,
        serviceStartupRamLimitGb,
    });
    if (ramStatus !== "allowed") {
        return { status: ramStatus, scriptRamGb };
    }

    const args = Array.isArray(service.metadata?.launchArgs) ? service.metadata.launchArgs : [];
    const pid = ns.run(script, 1, ...args);
    if (!(pid > 0)) return { status: "failed" };

    runningFiles.add(script);
    ns.print(`[LIFECYCLE] Started ${script}.`);
    return { status: "started", pid, scriptRamGb };
}

function queueNetworkChildReconciliation(ns) {
    const hasRequests = (ns.ls("home", NETWORK_CHILD_REQUEST_DIRECTORY) ?? [])
        .some((filename) => typeof filename === "string" && filename.endsWith(".json"));
    if (!hasRequests) return "idle";
    if (!ns.fileExists(NETWORK_CHILD_SUPERVISOR_SCRIPT, "home")) return "missing";

    const pid = ns.run(
        NETWORK_CHILD_SUPERVISOR_SCRIPT,
        { threads: 1, temporary: true, preventDuplicates: true },
    );
    return pid > 0 ? "queued" : "pending";
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[DASHBOARD] Integration Service Supervisor started.");
    ns.print("[LIFECYCLE] Integration Service Supervisor started.");

    const previousIssues = new Map();
    let nextServiceReconcileAt = 0;
    let previousNetworkChildIssue = "";

    while (true) {
        try {
            const status = queueNetworkChildReconciliation(ns);
            const issue = status === "missing" ? "reconciler script is missing"
                : status === "pending" ? "reconciler is waiting for Home RAM"
                : "";
            if (issue && issue !== previousNetworkChildIssue) {
                ns.print(`[NETWORK CHILD] ${issue}.`);
            }
            previousNetworkChildIssue = issue;
        } catch (error) {
            const message = error?.message ?? String(error);
            if (message !== previousNetworkChildIssue) {
                ns.print(`[NETWORK CHILD] Reconciliation failed: ${message}`);
                previousNetworkChildIssue = message;
            }
        }

        const now = Date.now();
        if (now < nextServiceReconcileAt) {
            await ns.sleep(NETWORK_CHILD_RECONCILE_INTERVAL_MS);
            continue;
        }
        nextServiceReconcileAt = now + SUPERVISOR_INTERVAL_MS;

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

        // Publish before any launch decision so every managed service started in this pass sees a
        // fresh, reset-specific capability view on its first cycle. This one existing
        // getResetInfo()-backed snapshot replaces per-launcher probes throughout the service tree.
        const capabilities = buildCapabilitySnapshot(ns, homeFiles);
        await ns.write(
            CAPABILITY_SNAPSHOT_FILE,
            JSON.stringify(createCapabilitySnapshotTelemetry(capabilities, now)),
            "w",
        );

        if (ns.fileExists(AUTOSTART_PAUSE_FILE, "home")) {
            ns.print("[LIFECYCLE] Autostart is paused (Kill All Scripts); skipping this cycle.");
            await ns.sleep(NETWORK_CHILD_RECONCILE_INTERVAL_MS);
            continue;
        }

        const runningProcesses = ns.ps("home") ?? [];
        const runningFiles = new Set(runningProcesses.map((process) => process.filename));
        const options = readDashboardOptions(ns);
        // The persisted order is the admission order for every eligible autostart service. This
        // lets cheap or important daemons win limited Home capacity ahead of expensive ones; any
        // launch blocked by a configured RAM safeguard is retried in the same order next cycle.
        const orderedServices = sortByServiceStartOrder(services, options);
        // The transient reserve protects free Home capacity, while the service limit bounds the
        // aggregate RAM of service entry scripts represented in the Start Order list. Both are
        // disabled at 0 for backward compatibility. Existing services count toward the aggregate
        // limit so the 30-second supervisor loop cannot bypass the cap one launch at a time.
        const totalHomeRamGb = ns.getServerMaxRam("home");
        const reservedHomeRamGb = resolveReservedHomeRamLimit(totalHomeRamGb, options).effectiveLimit;
        const serviceStartupRamLimitGb = resolveServiceStartupRamLimit(totalHomeRamGb, options).effectiveLimit;
        const scriptRamByFilename = new Map();
        const resolveScriptRamGb = (script) => {
            if (!scriptRamByFilename.has(script)) {
                scriptRamByFilename.set(script, ns.getScriptRam(script, "home"));
            }
            return scriptRamByFilename.get(script) ?? 0;
        };
        let runningManagedServiceRamGb = serviceStartupRamLimitGb > 0
            ? calculateRunningManagedServiceRam(services, runningProcesses, resolveScriptRamGb)
            : 0;

        for (const service of orderedServices) {
            const requirements = Array.isArray(service.requirements) ? service.requirements : [];
            if (!areCapabilityRequirementsMet(requirements, capabilities)) continue;
            if (!isServiceAutostartEnabled(service.serviceId, options)) continue;

            const script = service.filename;
            const result = startManagedService(ns, service, runningFiles, {
                reservedHomeRamGb,
                serviceStartupRamLimitGb,
                runningManagedServiceRamGb,
                resolveScriptRamGb,
            });
            if (result.status === "started" && serviceStartupRamLimitGb > 0) {
                runningManagedServiceRamGb += result.scriptRamGb;
            }
            reportLaunchIssue(ns, script, result.status, previousIssues);
        }

        await ns.sleep(NETWORK_CHILD_RECONCILE_INTERVAL_MS);
    }
}
