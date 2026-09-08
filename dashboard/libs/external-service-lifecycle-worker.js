// One-shot process executor for Service Supervisor's generic external lifecycle contract. It is
// intentionally not imported by the Supervisor: `kill` and `scan` should only consume RAM while a
// current, descriptor-authorized stop lease actually needs their cascade semantics.

const MAX_MANAGED_SCRIPTS = 128;

function readPayload(rawPayload) {
    if (typeof rawPayload !== "string") return null;
    try {
        const parsed = JSON.parse(rawPayload);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        const homeScripts = Array.isArray(parsed.homeScripts) ? parsed.homeScripts : [];
        const networkScripts = Array.isArray(parsed.networkScripts) ? parsed.networkScripts : [];
        if (homeScripts.length > MAX_MANAGED_SCRIPTS || networkScripts.length > MAX_MANAGED_SCRIPTS) return null;
        if (![...homeScripts, ...networkScripts].every((script) => typeof script === "string" && script.length > 0)) return null;
        return {
            homeScripts: new Set(homeScripts),
            networkScripts: new Set(networkScripts),
        };
    } catch (error) {
        return null;
    }
}

function getReachableServers(ns) {
    const visited = new Set(["home"]);
    const pending = ["home"];
    while (pending.length > 0) {
        const host = pending.shift();
        for (const neighbor of ns.scan(host)) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            pending.push(neighbor);
        }
    }
    return visited;
}

function stopMatchingProcesses(ns, host, managedScripts) {
    let stopped = 0;
    for (const process of ns.ps(host) ?? []) {
        if (managedScripts.has(process.filename) && ns.kill(process.pid)) stopped++;
    }
    return stopped;
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const payload = readPayload(ns.args[0]);
    if (!payload) return;

    let stopped = stopMatchingProcesses(ns, "home", payload.homeScripts);
    if (payload.networkScripts.size > 0) {
        for (const host of getReachableServers(ns)) {
            if (host === "home") continue;
            stopped += stopMatchingProcesses(ns, host, payload.networkScripts);
        }
    }
    if (stopped > 0) ns.print(`[LIFECYCLE] External request stopped ${stopped} managed process(es).`);
}
