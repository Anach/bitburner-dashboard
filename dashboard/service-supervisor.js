import {
    CAPABILITY_SNAPSHOT_FILE,
    areCapabilityRequirementsMet,
    buildCapabilitySnapshot,
    createCapabilitySnapshotTelemetry,
} from "dashboard/libs/capabilities.js";
import { discoverDashboardPlugins, isDashboardPluginDescriptorFilename } from "dashboard/libs/plugin-loader.js";
import {
    isServiceAutostartEnabled,
    getServiceStartOrder,
    isStrictServiceStartOrderEnabled,
    sortByServiceStartOrder,
} from "dashboard/libs/dashboard-options.js";
import {
    resolveReservedHomeRamLimit,
    resolveServiceStartupRamLimit,
} from "dashboard/libs/dashboard-ram-settings.js";
import { loadDashboardScriptMetadata } from "dashboard/libs/script-list.js";
import {
    normalizeExternalLifecycleAuthorities,
    readExternalLifecycleLease,
} from "dashboard/libs/external-service-lifecycle.js";

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
// Meta-orchestrator Stage 4's proposal-driven Startup Optimizer. It may nudge only the explicitly
// known managed service IDs earlier in the start-order queue. Its state is a strict, short-lived
// trust boundary: malformed, future-dated, overlong, or expired files are ignored, so a stopped
// adviser cannot leave persistent influence behind.
const SERVICE_STARTUP_OPTIMIZER_STATE_FILE = "data/service_startup_optimizer_state.json";
const SERVICE_STARTUP_OPTIMIZER_OPTION_KEY = "metaOrchestratorStartupOptimizerEnabled";
const SERVICE_STARTUP_OPTIMIZER_MAX_TTL_MS = 30000;
const SERVICE_STARTUP_OPTIMIZER_STATE_KEYS = new Set([
    "schemaVersion", "generatedAt", "expiresAt", "optimizedServices",
]);
// The set of serviceIds Startup Optimizer may nudge is deliberately NOT hardcoded here - it's
// whichever companion "scripts" repo's own Meta-Orchestrator declares as managed
// (libs/meta-orchestrator-options.js's META_MANAGED_SERVICE_OPTIONS there), so this dashboard's own
// core supervisor never hardcodes another repo's serviceId literals. This is static, checked-in
// configuration (not data/ runtime telemetry), read once and cached for this daemon's lifetime - see
// dashboard/examples/example-service-startup-optimizer-services.js for the shape and where to put it.
const STARTUP_OPTIMIZER_SERVICES_CONFIG_FILE = "dashboard/service-startup-optimizer-services.json";
// Optional, companion-owned external lifecycle authorities. The Dashboard never names a sender or
// service itself: the static manifest supplies both, and a service must separately opt in through
// descriptor metadata before any short-lived request can affect it.
const EXTERNAL_LIFECYCLE_AUTHORITIES_CONFIG_FILE = "dashboard/external-service-lifecycle-authorities.json";
const EXTERNAL_LIFECYCLE_WORKER_SCRIPT = "dashboard/libs/external-service-lifecycle-worker.js";
let cachedFileSignature = "";
let cachedManagedServices = [];
let cachedStartupOptimizerServiceIds = null;
let cachedExternalLifecycleAuthorities = null;

function readDashboardOptions(ns) {
    if (!ns.fileExists(DASHBOARD_OPTIONS_FILE, "home")) return {};
    try {
        const parsed = JSON.parse(ns.read(DASHBOARD_OPTIONS_FILE));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        return {};
    }
}

// Missing, malformed, or empty config all fail closed to an empty Set: nothing is ever eligible for
// startup optimization rather than this daemon crashing outright (a static ES import of a file that
// might not exist would fail to even compile/launch this script - unacceptable for the dashboard's
// own core supervisor on a standalone install with no companion scripts repo staged).
function readStartupOptimizerServiceIds(ns) {
    if (cachedStartupOptimizerServiceIds) return cachedStartupOptimizerServiceIds;
    let serviceIds = new Set();
    if (ns.fileExists(STARTUP_OPTIMIZER_SERVICES_CONFIG_FILE, "home")) {
        try {
            const parsed = JSON.parse(ns.read(STARTUP_OPTIMIZER_SERVICES_CONFIG_FILE));
            if (
                parsed
                && typeof parsed === "object"
                && !Array.isArray(parsed)
                && Array.isArray(parsed.serviceIds)
                && parsed.serviceIds.every((id) => typeof id === "string" && id.length > 0)
            ) {
                serviceIds = new Set(parsed.serviceIds);
            }
        } catch (error) {
            // Fall through to the empty Set already assigned above.
        }
    }
    cachedStartupOptimizerServiceIds = serviceIds;
    return cachedStartupOptimizerServiceIds;
}

export function readServiceStartupOptimizerState(ns, now = Date.now()) {
    if (!ns.fileExists(SERVICE_STARTUP_OPTIMIZER_STATE_FILE, "home")) return [];
    try {
        const parsed = JSON.parse(ns.read(SERVICE_STARTUP_OPTIMIZER_STATE_FILE));
        if (
            !parsed
            || typeof parsed !== "object"
            || Array.isArray(parsed)
            || !Object.keys(parsed).every((key) => SERVICE_STARTUP_OPTIMIZER_STATE_KEYS.has(key))
            || parsed.schemaVersion !== 1
            || !Number.isInteger(parsed.generatedAt)
            || !Number.isInteger(parsed.expiresAt)
            || parsed.generatedAt > now
            || parsed.expiresAt <= parsed.generatedAt
            || parsed.expiresAt - parsed.generatedAt > SERVICE_STARTUP_OPTIMIZER_MAX_TTL_MS
            || now >= parsed.expiresAt
            || !Array.isArray(parsed.optimizedServices)
        ) return [];
        const uniqueIds = new Set(parsed.optimizedServices);
        if (
            uniqueIds.size !== parsed.optimizedServices.length
            || !parsed.optimizedServices.every((id) => typeof id === "string" && readStartupOptimizerServiceIds(ns).has(id))
        ) return [];
        return [...parsed.optimizedServices];
    } catch (error) {
        return [];
    }
}

function readExternalLifecycleAuthorities(ns) {
    if (cachedExternalLifecycleAuthorities) return cachedExternalLifecycleAuthorities;
    let authorities = [];
    if (ns.fileExists(EXTERNAL_LIFECYCLE_AUTHORITIES_CONFIG_FILE, "home")) {
        try {
            authorities = normalizeExternalLifecycleAuthorities(
                JSON.parse(ns.read(EXTERNAL_LIFECYCLE_AUTHORITIES_CONFIG_FILE)),
            );
        } catch (error) {
            // A standalone dashboard or malformed optional companion config stays inert.
        }
    }
    cachedExternalLifecycleAuthorities = authorities;
    return cachedExternalLifecycleAuthorities;
}

export function readExternalLifecycleRequests(ns, now = Date.now()) {
    const requests = [];
    for (const authority of readExternalLifecycleAuthorities(ns)) {
        if (!ns.fileExists(authority.statePath, "home")) continue;
        try {
            requests.push(...readExternalLifecycleLease(JSON.parse(ns.read(authority.statePath)), authority, now));
        } catch (error) {
            // Every authority file is an independent fail-closed boundary.
        }
    }
    return requests;
}

function serviceAllowsExternalLifecycleState(service, desiredState) {
    const allowedStates = service?.metadata?.externalLifecycle?.states;
    return Array.isArray(allowedStates) && allowedStates.includes(desiredState);
}

// `kill` and `scan` intentionally live in a one-shot worker. An optional paused service must not
// permanently charge their RAM to the otherwise always-on Supervisor just because an external
// lifecycle authority happens to be installed.
function queueExternalLifecycleStop(ns, service) {
    const homeScripts = [
        service.filename,
        ...(Array.isArray(service.metadata?.managedScripts) ? service.metadata.managedScripts : []),
    ].filter((filename) => typeof filename === "string" && filename.length > 0);
    const networkScripts = (Array.isArray(service.metadata?.managedNetworkScripts)
        ? service.metadata.managedNetworkScripts
        : []).filter((filename) => typeof filename === "string" && filename.length > 0);
    const pid = ns.run(
        EXTERNAL_LIFECYCLE_WORKER_SCRIPT,
        { threads: 1, temporary: true, preventDuplicates: true },
        JSON.stringify({ homeScripts, networkScripts }),
    );
    if (pid > 0) ns.print(`[LIFECYCLE] Queued external stop for ${service.serviceId}.`);
}

function reportLaunchIssue(ns, script, status, previousIssues) {
    const protectedSkipMessage = status === "reserved"
        ? `starting it would use the Transient RAM Reserve`
        : status === "service-limit"
            ? `starting it would exceed the Service Startup RAM Limit`
            : status === "insufficient-ram"
                ? `not enough Home RAM is currently available`
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
    if (scriptRamGb - freeHomeRamGb > RAM_COMPARISON_EPSILON_GB) {
        return "insufficient-ram";
    }
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
    const scriptRamGb = ramLimits.resolveScriptRamGb(script);
    // Free RAM is checked fresh so each successive start sees the headroom consumed by services
    // started earlier in this pass. The aggregate service total is maintained separately because
    // it must also include listed services that were already running when this cycle began.
    const freeHomeRamGb = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
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
    let previousStartupOptimizerSignature = "";
    let previousExternalLifecycleSignature = "";

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

        // The normal service-discovery/admission pass is intentionally only every 30 seconds, but
        // Startup Optimizer is a proposal-driven control. Poll its tiny option/state contract on
        // the existing one-second heartbeat and force the full pass only when that contract
        // changes. When the option is off, the state file isn't even read - optimizedServiceIds
        // stays empty and every downstream branch below is a byte-identical no-op to this feature
        // not existing.
        const now = Date.now();
        const options = readDashboardOptions(ns);
        const startupOptimizerEnabled = options?.[SERVICE_STARTUP_OPTIMIZER_OPTION_KEY] === true;
        const optimizedServiceIds = startupOptimizerEnabled ? readServiceStartupOptimizerState(ns, now) : [];
        const startupOptimizerSignature = JSON.stringify({
            enabled: startupOptimizerEnabled,
            optimizedServiceIds: [...optimizedServiceIds].sort(),
        });
        const externalLifecycleRequests = readExternalLifecycleRequests(ns, now);
        const externalLifecycleSignature = JSON.stringify(externalLifecycleRequests
            .map(({ serviceId, desiredState, reason }) => ({ serviceId, desiredState, reason }))
            .sort((left, right) => left.serviceId.localeCompare(right.serviceId)));
        if (
            startupOptimizerSignature !== previousStartupOptimizerSignature
            || externalLifecycleSignature !== previousExternalLifecycleSignature
        ) {
            previousStartupOptimizerSignature = startupOptimizerSignature;
            previousExternalLifecycleSignature = externalLifecycleSignature;
            nextServiceReconcileAt = 0;
        }

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

        const externalLifecycleByServiceId = new Map(externalLifecycleRequests
            .map((request) => [request.serviceId, request]));
        for (const service of services) {
            const request = externalLifecycleByServiceId.get(service.serviceId);
            if (request?.desiredState === "stopped" && serviceAllowsExternalLifecycleState(service, request.desiredState)) {
                queueExternalLifecycleStop(ns, service);
            }
        }

        if (ns.fileExists(AUTOSTART_PAUSE_FILE, "home")) {
            ns.print("[LIFECYCLE] Autostart is paused (Kill All Scripts); skipping this cycle.");
            await ns.sleep(NETWORK_CHILD_RECONCILE_INTERVAL_MS);
            continue;
        }

        const runningProcesses = ns.ps("home") ?? [];
        const runningFiles = new Set(runningProcesses.map((process) => process.filename));
        // The persisted order is the admission order for every eligible autostart service. This
        // lets cheap or important daemons win limited Home capacity ahead of expensive ones; any
        // launch blocked by a configured RAM safeguard is retried in the same order next cycle.
        // Meta-orchestrator Stage 4 Startup Optimizer intents nudge this order without touching
        // sortByServiceStartOrder itself: optimized ids are prepended ahead of the user's own
        // configured order. The configured order is filtered to drop any id already optimized before
        // concatenating - not because it changes the result (parseServiceStartOrder's own dedup
        // already keeps a repeated id's FIRST occurrence, so a boosted id would still rank first
        // even left in its original tail position too, confirmed directly against the real
        // function), but so this code's own correctness is self-contained and doesn't depend on
        // that upstream dedup direction never changing.
        const configuredServiceStartOrder = getServiceStartOrder(options);
        const optimizedServiceIdSet = new Set(optimizedServiceIds);
        const externallyRequestedRunningIds = services
            .filter((service) => {
                const request = externalLifecycleByServiceId.get(service.serviceId);
                return request?.desiredState === "running" && serviceAllowsExternalLifecycleState(service, request.desiredState);
            })
            .map((service) => service.serviceId);
        const externallyRequestedRunningIdSet = new Set(externallyRequestedRunningIds);
        const effectiveServiceStartOrder = startupOptimizerEnabled && optimizedServiceIds.length > 0
            ? [...externallyRequestedRunningIds, ...optimizedServiceIds, ...configuredServiceStartOrder
                .filter((id) => !optimizedServiceIdSet.has(id) && !externallyRequestedRunningIdSet.has(id))].join(",")
            : externallyRequestedRunningIds.length > 0
                ? [...externallyRequestedRunningIds, ...configuredServiceStartOrder
                    .filter((id) => !externallyRequestedRunningIdSet.has(id))].join(",")
                : options?.serviceStartOrder;
        const orderedServices = sortByServiceStartOrder(services, { ...options, serviceStartOrder: effectiveServiceStartOrder });
        const strictServiceStartOrder = isStrictServiceStartOrderEnabled(options);
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
            const externalRequest = externalLifecycleByServiceId.get(service.serviceId);
            const externalLifecycleStateAllowed = serviceAllowsExternalLifecycleState(service, externalRequest?.desiredState);
            if (externalLifecycleStateAllowed && externalRequest.desiredState === "stopped") continue;
            const externallyRequestedRunning = externalLifecycleStateAllowed && externalRequest.desiredState === "running";
            if (!externallyRequestedRunning && !isServiceAutostartEnabled(service.serviceId, options)) continue;

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
            if (
                strictServiceStartOrder
                && ["insufficient-ram", "reserved", "service-limit"].includes(result.status)
            ) {
                // Deterministic admission: the first RAM-blocked eligible service holds its place
                // and lower-priority services wait for the next pass instead of leapfrogging it.
                break;
            }
        }

        await ns.sleep(NETWORK_CHILD_RECONCILE_INTERVAL_MS);
    }
}
