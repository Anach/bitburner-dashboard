import { discoverNetwork } from "dashboard/libs/topology.js";

// Network routes and remote file catalogues change much less often than server money, security,
// RAM, and active hacking state. Cache only the expensive static-ish part; the caller keeps the
// live status pass on its normal cadence.
export const NETWORK_MAP_CATALOG_REFRESH_MS = 10000;

function buildHostFileCatalog(ns, servers) {
    const byHost = new Map();
    for (const host of servers) {
        let files = [];
        try {
            files = ns.ls(host);
        } catch (error) {
            files = [];
        }
        const contractCount = files.filter((filename) => filename.endsWith(".cct")).length;
        byHost.set(host, {
            hasContract: contractCount > 0,
            contractCount,
            hasStoryFile: files.some((filename) => filename.endsWith(".lit") || filename.endsWith(".msg")),
        });
    }
    return byHost;
}

export function createNetworkMapCatalogCache() {
    return { graph: null, fileCatalogByHost: new Map(), refreshedAt: 0 };
}

export function getNetworkMapCatalog(ns, cache, now = Date.now(), { force = false } = {}) {
    const state = cache && typeof cache === "object" ? cache : createNetworkMapCatalogCache();
    const expired = now - (Number(state.refreshedAt) || 0) >= NETWORK_MAP_CATALOG_REFRESH_MS;
    if (!force && state.graph && !expired) return state;
    const graph = discoverNetwork(ns, "home", { exclude: ["darkweb"] });
    state.graph = graph;
    state.fileCatalogByHost = buildHostFileCatalog(ns, graph.servers);
    state.refreshedAt = now;
    return state;
}
