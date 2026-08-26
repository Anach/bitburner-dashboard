import { CITY_NAMES, getLocationCatalogEntry } from "dashboard/plugins/network-map/city-locations.js";

const TRAVEL_COST = 200_000;
const OUTPUT_PATH = "data/network_navigator_action_result.json";
const COMMAND_PREFIXES = {
    openLocation: "OpenLocation:",
    workCompany: "WorkCompany:",
};

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

export function runLocationCommand(ns, command) {
    const commandType = Object.entries(COMMAND_PREFIXES)
        .find(([, prefix]) => command.startsWith(prefix));
    if (!commandType) return makeCommandResult("location", "", false, "The location command is not known.");
    const [kind, prefix] = commandType;
    const target = decodeLocationTarget(command, prefix);
    if (!target) return makeCommandResult(kind, "", false, "The requested city location is not known.");

    const travelResult = travelForLocation(ns, target.city);
    if (!travelResult.ok) return makeCommandResult(kind, target.location, false, travelResult.message);

    if (kind === "openLocation") {
        try {
            const opened = Boolean(ns.singularity.goToLocation(target.location));
            const travelMessage = travelResult.travelled ? `Travelled to ${target.city} and ` : "";
            return makeCommandResult(
                kind,
                target.location,
                opened,
                opened ? `${travelMessage}opened ${target.location}.` : `Could not open ${target.location}.`,
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
        const travelMessage = travelResult.travelled ? `Travelled to ${target.city} and ` : "";
        return makeCommandResult(
            kind,
            target.location,
            working,
            working ? `${travelMessage}started work for ${target.location}.` : `Could not start work for ${target.location}.`,
        );
    } catch (error) {
        return makeCommandResult(kind, target.location, false, `Could not start work for ${target.location}.`);
    }
}

/** @param {NS} ns */
export async function main(ns) {
    const command = String(ns.args[0] ?? "");
    const requestToken = String(ns.args[1] ?? "");
    const lastCommand = runLocationCommand(ns, command);
    await ns.write(OUTPUT_PATH, JSON.stringify({ generatedAt: Date.now(), requestToken, lastCommand }), "w");
}
