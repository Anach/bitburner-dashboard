import { getCityLocations, CITY_NAMES } from "dashboard/plugins/network-map/city-locations.js";
import {
    publishNetworkChildRequest,
    readNetworkChildStatus,
} from "dashboard/libs/network-child-request.js";
import { NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT } from "dashboard/libs/port-registry.js";

// Persistent Singularity telemetry tier. Immediate navigation/location commands retain the same
// port-25 contract, but are dispatched to specialized one-shot workers so their 12/192 GB API
// surface is held only for the instant an action runs. This worker keeps only company rep/favor.
const SNAPSHOT_INTERVAL_MS = 2000;
const ACTION_REQUEST_REFRESH_MS = 5000;
const ACTION_REQUEST_TTL_MS = 15000;
const MAX_QUEUED_ACTIONS = 20;
const OUTPUT_PATH = "data/network_navigator_singularity_stats.json";
const BASE_STATS_PATH = "data/network_navigator_stats.json";
const ACTION_OUTPUT_PATH = "data/network_navigator_action_result.json";
const ACTION_REQUEST_ID = "network-navigator-action";
const PARENT_SCRIPT = "dashboard/plugins/network-map/network-navigator-singularity.js";
const CONNECT_ACTION_SCRIPT = "dashboard/plugins/network-map/network-navigator-connect-action.js";
const LOCATION_ACTION_SCRIPT = "dashboard/plugins/network-map/network-navigator-location-action.js";
const CONNECT_ACTION_DEPENDENCIES = ["dashboard/libs/topology.js"];
const LOCATION_ACTION_DEPENDENCIES = ["dashboard/plugins/network-map/city-locations.js"];
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

function describeAction(command) {
    const commandType = Object.entries(COMMAND_PREFIXES)
        .find(([, prefix]) => command.startsWith(prefix));
    if (!commandType) return null;
    const [kind, prefix] = commandType;
    const decoded = decodeTarget(command, prefix);
    const locationSeparator = decoded.indexOf("|");
    const target = locationSeparator >= 0 ? decoded.slice(locationSeparator + 1).trim() : decoded;
    const locationAction = kind === "openLocation" || kind === "workCompany";
    return {
        command,
        kind,
        target,
        script: locationAction ? LOCATION_ACTION_SCRIPT : CONNECT_ACTION_SCRIPT,
        dependencies: locationAction ? LOCATION_ACTION_DEPENDENCIES : CONNECT_ACTION_DEPENDENCIES,
    };
}

function makePendingResult(action, message) {
    return {
        kind: action.kind,
        target: action.target,
        status: "pending",
        message,
        timestamp: Date.now(),
    };
}

async function refreshActionRequest(ns, activeAction, now) {
    const result = await publishNetworkChildRequest(ns, {
        id: ACTION_REQUEST_ID,
        script: activeAction.script,
        ownerScript: PARENT_SCRIPT,
        ownerHost: "home",
        args: [activeAction.command, activeAction.token],
        dependencies: activeAction.dependencies,
        outputFiles: [ACTION_OUTPUT_PATH],
        lifecycle: "one-shot",
        preferRemote: true,
        ttlMs: ACTION_REQUEST_TTL_MS,
        requestedAt: now,
        label: `Network Navigator - ${activeAction.target || activeAction.kind}`,
    });
    activeAction.nextRefreshAt = now + ACTION_REQUEST_REFRESH_MS;
    return result;
}

function readCompletedAction(ns, activeAction) {
    if (!activeAction) return null;
    const output = loadJsonFile(ns, ACTION_OUTPUT_PATH);
    if (output?.requestToken !== activeAction.token) return null;
    return output.lastCommand && typeof output.lastCommand === "object" ? output.lastCommand : null;
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

// Only the currently-viewed city gets company lookups, matching the base worker's active-mode
// optimization. Command execution is independent and no longer expands this persistent surface.
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
    let activeAction = null;
    let actionSequence = 0;
    const queuedActions = [];

    while (true) {
        const completedAction = readCompletedAction(ns, activeAction);
        if (completedAction) {
            lastCommand = completedAction;
            activeAction = null;
            ns.print(`[${completedAction.status.toUpperCase()}] ${completedAction.message}`);
            if (completedAction.status === "error") ns.toast(completedAction.message, "warning", 5000);
        }

        while (ns.peek(NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT) !== "NULL PORT DATA") {
            const command = String(ns.readPort(NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT));
            const action = describeAction(command);
            if (!action) continue;
            if (queuedActions.length >= MAX_QUEUED_ACTIONS) queuedActions.shift();
            queuedActions.push(action);
        }

        if (!activeAction && queuedActions.length > 0) {
            activeAction = {
                ...queuedActions.shift(),
                token: `${Date.now()}-${++actionSequence}`,
                nextRefreshAt: 0,
                lastStatusSignature: "",
            };
            lastCommand = makePendingResult(
                activeAction,
                `Queued ${activeAction.kind} action; waiting for an available RAM host.`,
            );
        }

        const now = Date.now();
        if (activeAction) {
            if (now >= activeAction.nextRefreshAt) {
                const published = await refreshActionRequest(ns, activeAction, now);
                if (published.status !== "published") {
                    lastCommand = makePendingResult(activeAction, "Could not queue the navigation action yet; retrying.");
                }
            }
            const actionStatus = readNetworkChildStatus(ns, ACTION_REQUEST_ID);
            const statusSignature = JSON.stringify([actionStatus?.status, actionStatus?.detail]);
            if (
                statusSignature !== activeAction.lastStatusSignature
                && actionStatus?.detail
                && actionStatus.status !== "completed"
            ) {
                activeAction.lastStatusSignature = statusSignature;
                lastCommand = makePendingResult(activeAction, actionStatus.detail);
            }
        }

        const baseStats = loadJsonFile(ns, BASE_STATS_PATH);
        const companyProgressByCity = buildActiveCityProgress(ns, String(baseStats?.activeModeId ?? ""));
        await ns.write(OUTPUT_PATH, JSON.stringify({
            generatedAt: Date.now(),
            lastCommand,
            companyProgressByCity,
            queuedActions: queuedActions.length,
            actionWorker: readNetworkChildStatus(ns, ACTION_REQUEST_ID),
        }), "w");
        await ns.sleep(SNAPSHOT_INTERVAL_MS);
    }
}
