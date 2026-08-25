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

function refreshTrackedChildren(ns, state, now) {
    let changed = false;
    const completedIds = new Set();
    for (const [id, tracked] of [...state.tracked.entries()]) {
        let running = false;
        try {
            running = (ns.ps(tracked.host) ?? []).some((process) => process?.pid === tracked.pid);
        } catch (error) { }
        if (running) continue;
        state.tracked.delete(id);
        completedIds.add(id);
        changed = setChildStatus(state, id, {
            script: tracked.script,
            label: tracked.label,
            status: "completed",
            host: tracked.host,
            pid: 0,
            ramRequired: tracked.ramRequired,
            detail: "Last one-shot run completed.",
        }, now) || changed;
    }
    return { changed, completedIds };
}

/** @param {NS} ns */
export async function reconcileNetworkChildren(ns, state, now = Date.now()) {
    const supervisorState = state ?? createNetworkChildSupervisorState();
    const refreshed = refreshTrackedChildren(ns, supervisorState, now);
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
            const stopped = stopRunningCopies(ns, resolveHosts(), request.script);
            supervisorState.tracked.delete(request.id);
            changed = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: !request.desired ? "cancelled" : !ownerRunning ? "owner-stopped" : "expired",
                host: "",
                pid: 0,
                ramRequired: 0,
                detail: stopped > 0 ? `Stopped ${stopped} managed process(es).` : "No managed process was running.",
            }, now) || changed;
            ns.rm(requestFile, "home");
            continue;
        }

        const runningCopies = collectRunningCopies(ns, resolveHosts(), request.script);
        if (runningCopies.length > 0) {
            const running = runningCopies[0];
            const ramRequired = Math.max(0, Number(ns.getScriptRam(request.script, "home")) || 0);
            supervisorState.tracked.set(request.id, {
                script: request.script,
                label: request.label,
                host: running.host,
                pid: running.pid,
                ramRequired,
            });
            changed = setChildStatus(supervisorState, request.id, {
                script: request.script,
                label: request.label,
                status: "running",
                host: running.host,
                pid: running.pid,
                ramRequired,
                detail: "Managed child is already running.",
            }, now) || changed;
            continue;
        }

        const requiredFiles = [request.script, ...request.dependencies];
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
        });
        changed = setChildStatus(supervisorState, request.id, {
            script: request.script,
            label: request.label,
            status: "running",
            host: launched.host,
            pid: launched.pid,
            ramRequired: requiredRam,
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
