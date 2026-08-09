import { getCityLocations, CITY_NAMES, getLocationCatalogEntry } from "dashboard/plugins/network-map/city-locations.js";
import { discoverNetwork, pathToHost } from "dashboard/libs/topology.js";
import { NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT } from "dashboard/libs/port-registry.js";

// Disposable worker: exec'd by path (never imported) from network-navigator.js only after it
// confirms Source-File 4 ownership via the cheap ns.getResetInfo() check. Deliberately has no
// DASHBOARD_SCRIPT_METADATA export, same rationale as network-navigator-formulas.js - must not be
// picked up by service-supervisor.js's own capability-blind bare-daemon autostart.
//
// Owns every ns.singularity.* call in this three-tier split: auto-connect execution, city travel,
// and company rep/favor lookups. Drains its own command port (separate from the base script's, so
// the two processes never race for the same port's messages) for the commands the frontend routes
// here directly - see dashboard/plugins/network-map/network-view.js's "port": 25 and
// dashboard/libs/port-registry.js.
const SNAPSHOT_INTERVAL_MS = 2000;
const TRAVEL_COST = 200_000;
const OUTPUT_PATH = "data/network_navigator_singularity_stats.json";
const BASE_STATS_PATH = "data/network_navigator_stats.json";
const COMMAND_PREFIXES = {
    direct: "ConnectDirect:",
    route: "ConnectRoute:",
    hop: "ConnectHop:",
    openLocation: "OpenLocation:",
    workCompany: "WorkCompany:",
};

function loadJsonFile(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try {
        const raw = ns.read(path);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function decodeTarget(command, prefix) {
    try {
        return decodeURIComponent(command.slice(prefix.length)).trim();
    } catch (error) {
        return "";
    }
}

function decodeLocationTarget(command, prefix) {
    const decoded = decodeTarget(command, prefix);
    const separatorIndex = decoded.indexOf("|");
    if (separatorIndex < 1) return null;
    const city = decoded.slice(0, separatorIndex).trim();
    const location = decoded.slice(separatorIndex + 1).trim();
    if (!city || !location || !CITY_NAMES.includes(city)) return null;
    if (!getLocationCatalogEntry(city, location)) return null;
    return { city, location };
}

function connectTo(ns, target) {
    try {
        return Boolean(ns.singularity.connect(target));
    } catch (error) {
        return false;
    }
}

function makeCommandResult(kind, target, ok, message) {
    return {
        kind,
        target,
        status: ok ? "success" : "error",
        message,
        timestamp: Date.now(),
    };
}

function travelForLocation(ns, city) {
    const player = ns.getPlayer();
    if (player.city === city) return { ok: true, travelled: false, message: "" };
    if ((Number(player.money) || 0) < TRAVEL_COST) {
        return { ok: false, travelled: false, message: `Travel to ${city} requires $${TRAVEL_COST.toLocaleString()}.` };
    }

    try {
        const travelled = Boolean(ns.singularity.travelToCity(city));
        return travelled
            ? { ok: true, travelled: true, message: "" }
            : { ok: false, travelled: false, message: `Could not travel to ${city}.` };
    } catch (error) {
        return { ok: false, travelled: false, message: `Could not travel to ${city}.` };
    }
}

function runLocationCommand(ns, command, kind, prefix) {
    const target = decodeLocationTarget(command, prefix);
    if (!target) return makeCommandResult(kind, "", false, "The requested city location is not known.");

    const travel = travelForLocation(ns, target.city);
    if (!travel.ok) return makeCommandResult(kind, target.location, false, travel.message);

    if (kind === "openLocation") {
        try {
            const opened = Boolean(ns.singularity.goToLocation(target.location));
            const travelMessage = travel.travelled ? `Travelled to ${target.city} and ` : "";
            return makeCommandResult(
                kind,
                target.location,
                opened,
                opened ? `${travelMessage}opened ${target.location}.` : `Could not open ${target.location}.`
            );
        } catch (error) {
            return makeCommandResult(kind, target.location, false, `Could not open ${target.location}.`);
        }
    }

    const location = getLocationCatalogEntry(target.city, target.location);
    if (!location?.types?.includes("Company")) {
        return makeCommandResult(kind, target.location, false, `${target.location} is not a company.`);
    }
    if (!ns.getPlayer()?.jobs?.[target.location]) {
        return makeCommandResult(kind, target.location, false, `You are not employed by ${target.location}.`);
    }
    try {
        const working = Boolean(ns.singularity.workForCompany(target.location, true));
        const travelMessage = travel.travelled ? `Travelled to ${target.city} and ` : "";
        return makeCommandResult(
            kind,
            target.location,
            working,
            working ? `${travelMessage}started work for ${target.location}.` : `Could not start work for ${target.location}.`
        );
    } catch (error) {
        return makeCommandResult(kind, target.location, false, `Could not start work for ${target.location}.`);
    }
}

function runNavigationCommand(ns, command, graph) {
    const commandType = Object.entries(COMMAND_PREFIXES)
        .find(([, prefix]) => command.startsWith(prefix));
    if (!commandType) return null;

    const [kind, prefix] = commandType;
    if (kind === "openLocation" || kind === "workCompany") {
        return runLocationCommand(ns, command, kind, prefix);
    }

    const target = decodeTarget(command, prefix);
    if (!target || !graph.servers.includes(target)) {
        return makeCommandResult(kind, target, false, "The requested server is not in the known network.");
    }

    if (kind === "direct" || kind === "hop") {
        const ok = connectTo(ns, target);
        return makeCommandResult(
            kind,
            target,
            ok,
            ok ? `Connected to ${target}.` : `Could not connect directly to ${target} from the current server.`
        );
    }

    const route = pathToHost(graph.parentMap, target, "home");
    if (!route) return makeCommandResult(kind, target, false, `No route to ${target} was found.`);
    if (!connectTo(ns, "home")) {
        return makeCommandResult(kind, target, false, "Could not return to home before following the route.");
    }
    for (const hop of route.slice(1)) {
        if (!connectTo(ns, hop)) {
            return makeCommandResult(kind, target, false, `Connection failed at ${hop}.`);
        }
    }
    return makeCommandResult(kind, target, true, `Connected to ${target} via ${Math.max(0, route.length - 1)} hop(s).`);
}

function formatProgressNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "Unavailable";
}

function getCompanyProgress(ns, companyName) {
    try {
        return {
            reputation: formatProgressNumber(ns.singularity.getCompanyRep(companyName)),
            favor: formatProgressNumber(ns.singularity.getCompanyFavor(companyName)),
        };
    } catch (error) {
        return { reputation: "Unavailable", favor: "Unavailable" };
    }
}

// Only the currently-viewed city (per the base script's own activeModeId, read from its telemetry
// file) gets its companies looked up - mirrors network-navigator.js's own "only build the active
// mode in detail" optimization, so this never spends 2 singularity calls per company across every
// city every cycle regardless of what's actually being viewed.
function buildActiveCityProgress(ns, activeModeId) {
    if (!activeModeId?.startsWith("city:")) return null;
    const city = activeModeId.slice("city:".length);
    if (!CITY_NAMES.includes(city)) return null;

    const companies = getCityLocations(city).filter((location) => location.types.includes("Company"));
    const progress = {};
    for (const company of companies) {
        progress[company.name] = getCompanyProgress(ns, company.name);
    }
    return { [city]: progress };
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    let lastCommand = null;
    while (true) {
        const graph = discoverNetwork(ns, "home", { exclude: ["darkweb"] });

        while (ns.peek(NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT) !== "NULL PORT DATA") {
            const command = String(ns.readPort(NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT));
            const result = runNavigationCommand(ns, command, graph);
            if (!result) continue;
            lastCommand = result;
            ns.print(`[${result.status.toUpperCase()}] ${result.message}`);
            if (result.status === "error") ns.toast(result.message, "warning", 5000);
        }

        const baseStats = loadJsonFile(ns, BASE_STATS_PATH);
        const companyProgressByCity = buildActiveCityProgress(ns, String(baseStats?.activeModeId ?? ""));

        await ns.write(OUTPUT_PATH, JSON.stringify({ generatedAt: Date.now(), lastCommand, companyProgressByCity }), "w");
        await ns.sleep(SNAPSHOT_INTERVAL_MS);
    }
}
