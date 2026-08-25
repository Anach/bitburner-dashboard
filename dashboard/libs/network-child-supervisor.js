import { discoverNetwork } from "dashboard/libs/topology.js";
import {
    NETWORK_CHILD_REQUEST_DIRECTORY,
    NETWORK_CHILD_STATUS_FILE,
    getNetworkChildRequestPath,
    normalizeNetworkChildRequest,
} from "dashboard/libs/network-child-request.js";

const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";
const STATUS_HEARTBEAT_MS = 5000;
const RAM_EPSILON_GB = 1e-9;

export function createNetworkChildSupervisorState() {
    return {
        statuses: new Map(),
        tracked: new Map(),
        lastStatusSignature: "",
        lastStatusWriteAt: 0,
    };
}

export function loadNetworkChildSupervisorState(ns) {
    const state = createNetworkChildSupervisorState();
    try {
        if (!ns.fileExists(NETWORK_CHILD_STATUS_FILE, "home")) return state;
        const parsed = JSON.parse(ns.read(NETWORK_CHILD_STATUS_FILE) || "null");
        for (const [id, status] of Object.entries(parsed?.children ?? {})) {
            if (!status || typeof status !== "object") continue;
            state.statuses.set(id, status);
            if (status.status !== "running" || !status.host || !(status.pid > 0)) continue;
            state.tracked.set(id, {
                script: status.script,
                label: status.label,
                host: status.host,
                pid: status.pid,
                ramRequired: status.ramRequired,
                lifecycle: status.lifecycle === "persistent" ? "persistent" : "one-shot",
                outputFiles: Array.isArray(status.outputFiles) ? status.outputFiles : [],
            });
        }
        state.lastStatusSignature = JSON.stringify(parsed?.children ?? {});
        state.lastStatusWriteAt = Number(parsed?.generatedAt) || 0;
    } catch (error) { }
    return state;
}

function comparableStatus(status) {
    if (!status || typeof status !== "object") return null;
    const { updatedAt, ...stable } = status;
    return stable;
}

function setChildStatus(state, id, status, now) {
    const next = { id, ...status };
    const previous = state.statuses.get(id);
    if (JSON.stringify(comparableStatus(previous)) === JSON.stringify(comparableStatus(next))) return false;
    state.statuses.set(id, { ...next, updatedAt: now });
    return true;
}

function readReservedHomeRam(ns) {
    try {
        if (!ns.fileExists(DASHBOARD_OPTIONS_FILE, "home")) return 0;
        const parsed = JSON.parse(ns.read(DASHBOARD_OPTIONS_FILE) || "{}");
        return Math.max(0, Number(parsed?.reservedHomeRam) || 0);
    } catch (error) {
        return 0;
    }
}

function getNetworkHosts(ns) {
    try {
        return discoverNetwork(ns, "home").servers;
    } catch (error) {
        return ["home"];
    }
}

function collectRunningCopies(ns, hosts, script) {
    const running = [];
    for (const host of hosts) {
        try {
            for (const process of ns.ps(host) ?? []) {
                if (process?.filename === script) running.push({ ...process, host });
            }
        } catch (error) { }
    }
    return running;
}

function stopRunningCopies(ns, hosts, script) {
    let stopped = 0;
    for (const process of collectRunningCopies(ns, hosts, script)) {
        try {
            if (ns.kill(process.pid)) stopped++;
        } catch (error) { }
    }
    return stopped;
}

async function syncInputFilesToHost(ns, host, inputFiles) {
    if (host === "home" || inputFiles.length === 0) return { ok: true, detail: "" };
    const missing = inputFiles.filter((filename) => !ns.fileExists(filename, "home"));
    if (missing.length > 0) {
        return { ok: false, detail: `Missing Home input: ${missing.join(", ")}.` };
    }
    try {
        const copied = await ns.scp(inputFiles, host, "home");
        return copied
            ? { ok: true, detail: "" }
            : { ok: false, detail: `Could not synchronize Home input to ${host}.` };
    } catch (error) {
        return { ok: false, detail: `Could not synchronize Home input to ${host}.` };
    }
}

async function syncOutputFilesToHome(ns, host, outputFiles) {
    if (host === "home" || outputFiles.length === 0) return { ok: true, detail: "" };
    try {
        // The Cloud buyer can rename the purchased server it is currently running on. Its old
        // hostname then disappears between reconciles, so even fileExists() must live inside the
        // guard rather than assuming the previously tracked host is still addressable.
        const available = outputFiles.filter((filename) => ns.fileExists(filename, host));
        if (available.length === 0) return { ok: true, detail: "" };
        const copied = await ns.scp(available, "home", host);
        return copied
            ? { ok: true, detail: "" }
            : { ok: false, detail: `Could not synchronize output from ${host}.` };
    } catch (error) {
        return { ok: false, detail: `Could not synchronize output from ${host}.` };
    }
}

function getCandidateHosts(ns, hosts, request, requiredRam, reservedHomeRam) {
    const candidates = [];
    for (const host of hosts) {
        try {
            if (host !== "home" && !ns.hasRootAccess(host)) continue;
            const reserve = request.reserveRamGb + (host === "home" ? reservedHomeRam : 0);
            const freeRam = Math.max(0, ns.getServerMaxRam(host) - ns.getServerUsedRam(host) - reserve);
            if (freeRam + RAM_EPSILON_GB < requiredRam) continue;
            candidates.push({ host, freeRam });
        } catch (error) { }
    }
    candidates.sort((left, right) => {
        const leftHomePenalty = request.preferRemote && left.host === "home" ? 1 : 0;
        const rightHomePenalty = request.preferRemote && right.host === "home" ? 1 : 0;
        return leftHomePenalty - rightHomePenalty
            || right.freeRam - left.freeRam
            || left.host.localeCompare(right.host);
    });
    return candidates;
}

async function publishStatuses(ns, state, now, force = false) {
    const children = Object.fromEntries([...state.statuses.entries()].sort(([left], [right]) => left.localeCompare(right)));
    const signature = JSON.stringify(children);
    if (!force && signature === state.lastStatusSignature && now - state.lastStatusWriteAt < STATUS_HEARTBEAT_MS) return;
    await ns.write(NETWORK_CHILD_STATUS_FILE, JSON.stringify({ generatedAt: now, children }), "w");
    state.lastStatusSignature = signature;
    state.lastStatusWriteAt = now;
}

async function refreshTrackedChildren(ns, state, now) {
    let changed = false;
    const completedIds = new Set();
    for (const [id, tracked] of [...state.tracked.entries()]) {
        let running = false;
        try {
            running = (ns.ps(tracked.host) ?? []).some((process) => process?.pid === tracked.pid);
        } catch (error) { }
        if (running) continue;
        const outputSync = await syncOutputFilesToHome(ns, tracked.host, tracked.outputFiles ?? []);
        state.tracked.delete(id);
        const oneShot = tracked.lifecycle !== "persistent";
        if (oneShot) completedIds.add(id);
        changed = setChildStatus(state, id, {
            script: tracked.script,
            label: tracked.label,
            status: oneShot ? "completed" : "stopped",
            host: tracked.host,
            pid: 0,
            ramRequired: tracked.ramRequired,
            lifecycle: tracked.lifecycle,
            outputFiles: tracked.outputFiles ?? [],
            detail: outputSync.ok
                ? oneShot ? "Last one-shot run completed." : "Persistent child stopped; awaiting relaunch."
                : outputSync.detail,
        }, now) || changed;
    }
    return { changed, completedIds };
}

/** @param {NS} ns */
export async function reconcileNetworkChildren(ns, state, now = Date.now()) {
    const supervisorState = state ?? createNetworkChildSupervisorState();
    const refreshed = await refreshTrackedChildren(ns, supervisorState, now);
    let changed = refreshed.changed;
    const requestFiles = (ns.ls("home", NETWORK_CHILD_REQUEST_DIRECTORY) ?? [])
        .filter((filename) => typeof filename === "string" && filename.endsWith(".json"))
        .sort();

    if (requestFiles.length === 0) {
        await publishStatuses(ns, supervisorState, now, changed);
        return supervisorState;
    }

    let hosts = null;
    const resolveHosts = () => hosts ??= getNetworkHosts(ns);
    const reservedHomeRam = readReservedHomeRam(ns);

    for (const requestFile of requestFiles) {
        let request = null;
        try {
            request = normalizeNetworkChildRequest(JSON.parse(ns.read(requestFile) || "null"), now);
        } catch (error) { }
        if (!request || getNetworkChildRequestPath(request.id) !== requestFile) {
            ns.rm(requestFile, "home");
            continue;
        }

        if (request.lifecycle === "one-shot" && refreshed.completedIds.has(request.id)) {
            ns.rm(requestFile, "home");
            continue;
        }

        const ownerRunning = collectRunningCopies(ns, resolveHosts(), request.ownerScript)
            .some((process) => process.host === request.ownerHost);
        const expired = now > request.expiresAt;
        if (!request.desired || !ownerRunning || expired) {
            const runningBeforeStop = collectRunningCopies(ns, resolveHosts(), request.script);
            let outputSync = { ok: true, detail: "" };
            for (const process of runningBeforeStop) {
                const result = await syncOutputFilesToHome(ns, process.host, request.outputFiles);
                if (!result.ok) outputSync = result;
            }
            const stopped = stopRunningCopies(ns, resolveHosts(), request.script);
            supervisorState.tracked.delete(request.id);
            changed = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: !request.desired ? "cancelled" : !ownerRunning ? "owner-stopped" : "expired",
                host: "",
                pid: 0,
                ramRequired: 0,
                lifecycle: request.lifecycle,
                outputFiles: request.outputFiles,
                detail: !outputSync.ok
                    ? outputSync.detail
                    : stopped > 0 ? `Stopped ${stopped} managed process(es).` : "No managed process was running.",
            }, now) || changed;
            ns.rm(requestFile, "home");
            continue;
        }

        const runningCopies = collectRunningCopies(ns, resolveHosts(), request.script);
        const previouslyTracked = supervisorState.tracked.get(request.id);
        const running = runningCopies.find((process) => (
            process.host === previouslyTracked?.host && process.pid === previouslyTracked?.pid
        ));
        if (running) {
            for (const duplicate of runningCopies) {
                if (duplicate.host === running.host && duplicate.pid === running.pid) continue;
                try { ns.kill(duplicate.pid); } catch (error) { }
            }
            const ramRequired = Math.max(0, Number(ns.getScriptRam(request.script, "home")) || 0);
            // A file declared in both directions is seeded from Home with requiredFiles before
            // launch, then owned by the child until it stops. Re-copying the stale Home version
            // into a running child immediately before its output sync would erase live counters,
            // history, or partial one-shot progress. Non-output inputs (dashboard options/control
            // files) remain live and continue to refresh every reconcile.
            const outputFileSet = new Set(request.outputFiles);
            const liveInputFiles = request.inputFiles.filter((filename) => !outputFileSet.has(filename));
            const inputSync = await syncInputFilesToHost(ns, running.host, liveInputFiles);
            if (!inputSync.ok) {
                try { ns.kill(running.pid); } catch (error) { }
                supervisorState.tracked.delete(request.id);
                changed = setChildStatus(supervisorState, request.id, {
                    script: request.script,
                    label: request.label,
                    status: "sync-failed",
                    host: running.host,
                    pid: 0,
                    ramRequired,
                    lifecycle: request.lifecycle,
                    outputFiles: request.outputFiles,
                    detail: inputSync.detail,
                }, now) || changed;
                continue;
            }
            const outputSync = await syncOutputFilesToHome(ns, running.host, request.outputFiles);
            supervisorState.tracked.set(request.id, {
                script: request.script,
                label: request.label,
                host: running.host,
                pid: running.pid,
                ramRequired,
                lifecycle: request.lifecycle,
                outputFiles: request.outputFiles,
            });
            changed = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: "running",
                host: running.host,
                pid: running.pid,
                ramRequired,
                lifecycle: request.lifecycle,
                outputFiles: request.outputFiles,
                detail: outputSync.ok ? "Managed child is already running." : outputSync.detail,
            }, now) || changed;
            continue;
        }

        // A copy which predates this request has no scheduler ownership record. Stop it once so a
        // newly-migrated persistent child can actually move off Home; subsequent Home fallback
        // copies are tracked in the status file and are therefore preserved across reconciler runs.
        for (const unmanaged of runningCopies) {
            await syncOutputFilesToHome(ns, unmanaged.host, request.outputFiles);
            try { ns.kill(unmanaged.pid); } catch (error) { }
        }
        supervisorState.tracked.delete(request.id);

        const requiredFiles = [...new Set([request.script, ...request.dependencies, ...request.inputFiles])];
        const missing = requiredFiles.filter((filename) => !ns.fileExists(filename, "home"));
        const requiredRam = Math.max(0, Number(ns.getScriptRam(request.script, "home")) || 0);
        if (missing.length > 0 || !(requiredRam > 0)) {
            changed = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: "missing",
                host: "",
                pid: 0,
                ramRequired: requiredRam,
                detail: missing.length > 0 ? `Missing on Home: ${missing.join(", ")}` : "Script RAM could not be resolved.",
            }, now) || changed;
            continue;
        }

        const candidates = getCandidateHosts(ns, resolveHosts(), request, requiredRam, reservedHomeRam);
        if (candidates.length === 0) {
            const didChange = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: "waiting-for-ram",
                host: "",
                pid: 0,
                ramRequired: requiredRam,
                detail: `Waiting for ${requiredRam.toFixed(2)} GB free on a rooted host.`,
            }, now);
            if (didChange) ns.print(`[NETWORK CHILD] ${request.label}: waiting for ${requiredRam.toFixed(2)} GB free RAM.`);
            changed = didChange || changed;
            continue;
        }

        let launched = null;
        for (const candidate of candidates) {
            try {
                if (candidate.host !== "home") {
                    const copied = await ns.scp(requiredFiles, candidate.host, "home");
                    if (!copied) continue;
                }
                const pid = ns.exec(
                    request.script,
                    candidate.host,
                    { threads: 1, temporary: true },
                    ...request.args,
                );
                if (pid > 0) {
                    launched = { ...candidate, pid };
                    break;
                }
            } catch (error) { }
        }

        if (!launched) {
            changed = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: "launch-failed",
                host: "",
                pid: 0,
                ramRequired: requiredRam,
                detail: "Eligible hosts were found, but copy or exec failed.",
            }, now) || changed;
            continue;
        }

        supervisorState.tracked.set(request.id, {
            script: request.script,
            label: request.label,
            host: launched.host,
            pid: launched.pid,
            ramRequired: requiredRam,
            lifecycle: request.lifecycle,
            outputFiles: request.outputFiles,
        });
        changed = setChildStatus(supervisorState, request.id, {
            script: request.script,
            label: request.label,
            status: "running",
            host: launched.host,
            pid: launched.pid,
            ramRequired: requiredRam,
            lifecycle: request.lifecycle,
            outputFiles: request.outputFiles,
            detail: `Launched with ${launched.freeRam.toFixed(2)} GB available.`,
        }, now) || changed;
        ns.print(`[NETWORK CHILD] Started ${request.label} on ${launched.host} (PID ${launched.pid}).`);
    }

    await publishStatuses(ns, supervisorState, now, changed);
    return supervisorState;
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    await reconcileNetworkChildren(ns, loadNetworkChildSupervisorState(ns));
}
