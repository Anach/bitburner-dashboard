import { discoverNetwork } from "dashboard/libs/topology.js";

// Disposable worker: exec'd by path (never imported) from network-navigator.js only after it
// confirms Formulas.exe ownership via a cheap ns.fileExists check. Deliberately has no
// DASHBOARD_SCRIPT_METADATA export - unlike a normal bare daemon script, this must NOT be picked
// up by service-supervisor.js's own autostart scan, since that has no capability gate at all and
// would start this (paying its Formulas RAM cost) regardless of whether Formulas.exe is actually
// owned. network-navigator.js's own launcher loop is the only thing that should ever start this,
// same pattern as hardware/server-manager/server-manager-cloud.js in the other repo.
//
// Publishes raw xpPerSecond numbers only. The Network Map descriptor owns presentation, while
// optional viewTelemetry contributions can provide selection state independently of this worker.
const SNAPSHOT_INTERVAL_MS = 2000;
const OUTPUT_PATH = "data/network_navigator_formulas_stats.json";

function computeXpPerSecond(ns, server, player) {
    try {
        const mockServer = { ...server, hackDifficulty: server.minDifficulty };
        const weakenTime = ns.formulas.hacking.weakenTime(mockServer, player);
        const experience = ns.formulas.hacking.hackExp(mockServer, player);
        return experience / Math.max(0.001, weakenTime / 1000);
    } catch (error) {
        return NaN;
    }
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    while (true) {
        const graph = discoverNetwork(ns, "home", { exclude: ["darkweb"] });
        const player = ns.getPlayer();

        const xpPerSecondByHost = {};
        for (const hostname of graph.servers) {
            const server = ns.getServer(hostname);
            xpPerSecondByHost[hostname] = computeXpPerSecond(ns, server, player);
        }

        await ns.write(OUTPUT_PATH, JSON.stringify({ generatedAt: Date.now(), xpPerSecondByHost }), "w");
        await ns.sleep(SNAPSHOT_INTERVAL_MS);
    }
}
