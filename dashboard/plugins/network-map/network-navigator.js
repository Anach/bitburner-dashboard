import { CITY_NAMES, getCityLocations } from "dashboard/plugins/network-map/city-locations.js";
import { discoverNetwork, pathToHost } from "dashboard/libs/topology.js";
import { startHomeScript } from "dashboard/libs/runtime-actions.js";
import { hasApiAccess } from "dashboard/libs/capabilities.js";
import { NETWORK_NAVIGATOR_COMMAND_PORT } from "dashboard/libs/port-registry.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

// Base/always-on tier of a three-tier split (see SCRIPTS_OPTIMIZATION_PLAN-style launcher/core
// pattern used elsewhere in this repo): this file's own static call graph contains no
// ns.singularity.* or ns.formulas.* call anywhere, so it stays cheap regardless of Source-File 4
// or Formulas.exe ownership. It launches the two worker tiers below once their own capability is
// cheaply detected, and folds whatever they've most recently published into the single telemetry
// file the dashboard already reads from - so the frontend never needs to know the data came from
// three separate processes.
const FORMULAS_WORKER_SCRIPT = "dashboard/plugins/network-map/network-navigator-formulas.js";
const SINGULARITY_WORKER_SCRIPT = "dashboard/plugins/network-map/network-navigator-singularity.js";
// Was 20 (a local literal, not imported from the registry) - collided with
// affiliations/faction-manager/faction-manager-gangs.js's own GANG_COMMAND_PORT, since
// bitburner-scripts picked its ports independently of this repo. Since ns.readPort() destructively
// drains whatever it reads regardless of which script it belongs to, that collision meant every
// "EquipmentMinFunds:" (or any other Faction Manager option) command had a coin-flip chance of
// being silently eaten by this script's own drain loop instead of ever reaching
// faction-manager-gangs.js - confirmed as the actual cause of gang equipment purchases repeatedly
// ignoring a configured spending cap. This dashboard-owned constant now comes from
// dashboard/libs/port-registry.js; the cross-repo validator checks it together with the scripts
// registry and descriptor metadata. See docs/PORT_MAP.md (bitburner-scripts repo) for the full
// table.
const SNAPSHOT_INTERVAL_MS = 2000;
const TRAVEL_COST = 200_000;
// Workers publish on their own ~2s cadence too - anything older than this is treated as "worker
// isn't actually running/keeping up" rather than trusted stale data, same rationale as
// affiliations/faction-manager/faction-manager-boost.js's CORE_STATUS_STALE_AFTER_MS.
const WORKER_STALE_AFTER_MS = 15000;
const DATA_PATHS = {
    networkNavigatorStatsJson: "data/network_navigator_stats.json",
    networkNavigatorFormulasStatsJson: "data/network_navigator_formulas_stats.json",
    networkNavigatorSingularityStatsJson: "data/network_navigator_singularity_stats.json",
};
const SET_MODE_PREFIX = "SetMode:";
const DEFAULT_MODE_ID = "network";
const STORY_SERVERS = new Set(["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "fulcrumassets", "w0r1d_d43m0n"]);
const LOCATION_GROUPS = ["Companies", "Training", "Services", "Special"];
const LOCATION_GROUP_ACCENTS = {
    Companies: "#6cb4ff",
    Training: "#c084fc",
    Services: "#8ef0b5",
    Special: "#ffd17a",
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

// Returns null (not a fallback object) when the worker isn't running or its data is stale, so
// callers can tell "no fresh data" apart from "fresh data with empty contents".
function loadFreshWorkerData(ns, path) {
    const data = loadJsonFile(ns, path);
    if (!data) return null;
    const age = Date.now() - (Number(data.generatedAt) || 0);
    return age <= WORKER_STALE_AFTER_MS ? data : null;
}

function collectActiveHackTargets(ns, servers) {
    const targets = new Set();
    for (const host of servers) {
        let processes = [];
        try {
            processes = ns.ps(host);
        } catch (error) {
            processes = [];
        }
        for (const process of processes) {
            if (!/(^|\/)hack\.js$/i.test(String(process?.filename ?? ""))) continue;
            const target = String(process?.args?.[0] ?? "");
            if (target) targets.add(target);
        }
    }
    return targets;
}

// Cheap, no-Formulas estimate of the same quantity network-navigator-formulas.js computes
// precisely via ns.formulas.hacking.* - used as the always-available baseline. The script
// publishes the raw score and whether it is estimated; the Network Map descriptor owns display
// formatting, and optional viewTelemetry contributions may add independent selection state.
function estimateXpPerSecond(ns, server, player) {
    let weakenTime = Infinity;
    try {
        weakenTime = ns.getWeakenTime(server.hostname);
    } catch (error) {
        weakenTime = Infinity;
    }
    const experience = (3 + ((Number(server.baseDifficulty) || 0) * 0.3)) * (Number(player?.mults?.hacking_exp) || 1);
    return experience / Math.max(0.001, weakenTime / 1000);
}

function decodeTarget(command, prefix) {
    try {
        return decodeURIComponent(command.slice(prefix.length)).trim();
    } catch (error) {
        return "";
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

function findCurrentHost(serverSnapshots) {
    return serverSnapshots.find((server) => server.isConnectedTo)?.hostname ?? "home";
}

function normalizeIdentity(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function quoteTerminalArgument(value) {
    const text = String(value ?? "");
    if (!text) return "";
    if (!/[\s;'"\\]/.test(text)) return text;
    if (!text.includes('"')) return `"${text}"`;
    if (!text.includes("'")) return `'${text}'`;
    return "";
}

function buildTerminalConnectCommand(route) {
    if (!Array.isArray(route) || route.length === 0) return "";
    const hops = route.slice(1).map(quoteTerminalArgument);
    if (hops.some((hop) => !hop)) return "";
    return ["home", ...hops.map((hop) => `connect ${hop}`)].join("; ");
}

function buildCityMap(ns, city, networkNodes, player, singularityAvailable, lastCommand, companyProgressByCity) {
    const catalog = getCityLocations(city);
    const currentCity = player.city === city;
    const canAffordTravel = (Number(player.money) || 0) >= TRAVEL_COST;
    const canInteract = singularityAvailable && (currentCity || canAffordTravel);
    const serverById = new Map(networkNodes.map((node) => [node.id, node]));
    const serverByOrganization = new Map();
    for (const node of networkNodes) {
        const organizationKey = normalizeIdentity(node.organization);
        if (organizationKey && !serverByOrganization.has(organizationKey)) serverByOrganization.set(organizationKey, node);
    }
    const cityProgress = companyProgressByCity?.[city] ?? null;

    const hubId = `city:${city}`;
    const nodes = [{
        id: hubId,
        hostname: city,
        organization: currentCity ? "Current city" : "Remote city",
        detail: currentCity ? "Current city" : "Remote city",
        status: `${catalog.length} locations`,
        statusTone: currentCity ? "info" : "neutral",
        current: currentCity && !catalog.some((location) => location.name === player.location),
        selectable: false,
        variant: "hub",
        accent: currentCity ? "#8fc5ff" : "#8ef0b5",
        depth: 0,
        parent: null,
        route: [],
    }];
    const edges = [];

    for (const group of LOCATION_GROUPS) {
        const groupLocations = catalog.filter((location) => location.group === group);
        if (groupLocations.length === 0) continue;
        const groupId = `city:${city}:group:${group.toLowerCase()}`;
        const groupAccent = LOCATION_GROUP_ACCENTS[group] ?? "#8ef0b5";
        nodes.push({
            id: groupId,
            hostname: group,
            organization: `${groupLocations.length} location${groupLocations.length === 1 ? "" : "s"}`,
            detail: `${groupLocations.length} location${groupLocations.length === 1 ? "" : "s"}`,
            status: "",
            selectable: false,
            variant: "group",
            group,
            accent: groupAccent,
            depth: 1,
            parent: hubId,
            route: [],
        });
        edges.push({ source: hubId, target: groupId });

        for (const location of groupLocations) {
            const locationId = `city:${city}:location:${location.name}`;
            const explicitServer = location.server ? serverById.get(location.server) : null;
            const attachedServer = explicitServer ?? serverByOrganization.get(normalizeIdentity(location.name)) ?? null;
            const isCompany = location.types.includes("Company");
            const currentJob = isCompany ? String(player.jobs?.[location.name] ?? "") : "";
            const companyProgress = isCompany
                ? cityProgress?.[location.name] ?? { reputation: singularityAvailable ? "Unavailable" : "Requires SF4", favor: singularityAvailable ? "Unavailable" : "Requires SF4" }
                : { reputation: "", favor: "" };
            const isCurrentLocation = currentCity && player.location === location.name;
            const interactionStatus = !singularityAvailable
                ? "Requires Source-File 4"
                : currentCity
                    ? "Available in current city"
                    : canAffordTravel
                        ? "$200k travel required"
                        : "Requires $200k for travel";
            const blockedReason = !singularityAvailable
                ? "Location actions require Singularity access (Source-File 4)."
                : !currentCity && !canAffordTravel
                    ? `Travel to ${city} requires $${TRAVEL_COST.toLocaleString()}.`
                    : "";
            const serverAccess = !attachedServer
                ? "No attached server"
                : [attachedServer.hasRoot ? "Rooted" : "No root", attachedServer.backdoorInstalled ? "Backdoored" : "No backdoor"].join(" · ");

            nodes.push({
                id: locationId,
                hostname: location.name,
                organization: location.types.join(" · "),
                detail: location.types.join(" · "),
                status: attachedServer ? attachedServer.id : "No attached server",
                statusTone: attachedServer?.backdoorInstalled ? "success" : attachedServer?.hasRoot ? "info" : attachedServer ? "warn" : "neutral",
                current: isCurrentLocation,
                selectable: true,
                variant: "location",
                group,
                accent: groupAccent,
                depth: 2,
                parent: groupId,
                route: [],
                isLocation: true,
                isCompany,
                isEmployed: Boolean(currentJob),
                hasAttachedServer: Boolean(attachedServer),
                locationName: location.name,
                locationTypes: location.types.join(" · "),
                attachedServer: attachedServer?.id ?? "",
                attachedServerLabel: attachedServer?.id ?? "None",
                serverAccessLabel: serverAccess,
                companyRepLabel: companyProgress.reputation,
                companyFavorLabel: companyProgress.favor,
                currentJobLabel: currentJob || "Not employed",
                interactionStatus,
                actionTarget: `${city}|${location.name}`,
                canOpenLocation: canInteract,
                openBlockedReason: blockedReason,
                openActionLabel: currentCity
                    ? isCompany ? "Open company page" : "Open location"
                    : isCompany ? "Travel $200k & open company" : "Travel $200k & open",
                canWorkCompany: Boolean(currentJob) && canInteract,
                workBlockedReason: blockedReason || (currentJob ? "" : `You are not employed by ${location.name}.`),
                workActionLabel: currentCity ? "Work" : "Travel $200k & work",
            });
            edges.push({ source: groupId, target: locationId });
        }
    }

    const currentLocationNode = nodes.find((node) => node.current);
    return {
        title: `${city} City Map`,
        subtitle: currentCity
            ? "Current-city companies, training, services, and special locations."
            : `Remote city preview · active interactions require $${TRAVEL_COST.toLocaleString()} travel.`,
        generatedAt: Date.now(),
        currentHost: currentLocationNode?.id ?? hubId,
        canConnect: singularityAvailable,
        nodes,
        edges,
        lastCommand,
    };
}

function buildSnapshot(ns, graph, singularityAvailable, formulasAvailable, lastCommand, activeModeId, xpPerSecondByHost, companyProgressByCity, singularityLastCommand) {
    const player = ns.getPlayer();
    const hackingLevel = Number(player?.skills?.hacking) || 0;
    const activelyHackedTargets = collectActiveHackTargets(ns, graph.servers);
    let cloudServers = new Set();
    try {
        cloudServers = new Set(ns.cloud.getServerNames());
    } catch (error) {
        cloudServers = new Set();
    }
    const serverSnapshots = graph.servers.map((hostname) => ns.getServer(hostname));
    const currentHost = findCurrentHost(serverSnapshots);
    const neighborsByHost = Object.fromEntries(graph.servers.map((hostname) => [hostname, []]));
    for (const edge of graph.edges) {
        neighborsByHost[edge.source]?.push(edge.target);
        neighborsByHost[edge.target]?.push(edge.source);
    }

    const nodes = serverSnapshots.map((server) => {
        const requiredHackingSkill = Number(server.requiredHackingSkill) || 0;
        const route = pathToHost(graph.parentMap, server.hostname, "home") ?? [];
        const terminalConnectCommand = buildTerminalConnectCommand(route);
        let files = [];
        try {
            files = ns.ls(server.hostname);
        } catch (error) {
            files = [];
        }
        const hasContract = files.some((filename) => filename.endsWith(".cct"));
        const contractCount = files.filter((filename) => filename.endsWith(".cct")).length;
        const hasStoryFile = files.some((filename) => filename.endsWith(".lit") || filename.endsWith(".msg"));
        const moneyMaximum = Number(server.moneyMax) || 0;
        const moneyAvailable = Number(server.moneyAvailable) || 0;
        const minimumSecurity = Number(server.minDifficulty) || 0;
        const currentSecurity = Number(server.hackDifficulty) || 0;
        // The formulas worker's precise score wins once it's running and fresh; otherwise fall
        // back to the cheap non-Formulas estimate. Publish raw ingredients only; descriptor-driven
        // view telemetry may augment the node without this plugin knowing which service supplied it.
        const preciseXpPerSecond = xpPerSecondByHost?.[server.hostname];
        const usingPreciseXpScore = Number.isFinite(preciseXpPerSecond);
        const xpPerSecondPerThread = usingPreciseXpScore ? preciseXpPerSecond : estimateXpPerSecond(ns, server, player);
        return {
            id: server.hostname,
            hostname: server.hostname,
            ip: server.ip,
            organization: server.organizationName || "",
            depth: graph.depthMap[server.hostname] ?? 0,
            parent: graph.parentMap[server.hostname] ?? null,
            neighbors: neighborsByHost[server.hostname] ?? [],
            route,
            terminalConnectCommand,
            hasRoot: Boolean(server.hasAdminRights),
            backdoorInstalled: Boolean(server.backdoorInstalled),
            purchased: Boolean(server.purchasedByPlayer),
            cloud: cloudServers.has(server.hostname),
            hasContract,
            contractCount,
            story: STORY_SERVERS.has(server.hostname) || hasStoryFile,
            currentlyBeingHacked: activelyHackedTargets.has(server.hostname),
            xpPerSecondPerThread,
            xpScoreIsEstimate: !usingPreciseXpScore,
            connected: server.hostname === currentHost,
            withinHackLevel: requiredHackingSkill <= hackingLevel,
            directConnect: server.hostname === "home" || Boolean(server.backdoorInstalled) || Boolean(server.purchasedByPlayer),
            requiredHackingSkill,
            portsRequired: Number(server.numOpenPortsRequired) || 0,
            openPorts: Number(server.openPortCount) || 0,
            ramUsed: Number(server.ramUsed) || 0,
            ramMax: Number(server.maxRam) || 0,
            moneyAvailable,
            moneyMax: moneyMaximum,
            moneyRatio: moneyMaximum > 0 ? moneyAvailable / moneyMaximum : 0,
            security: currentSecurity,
            minSecurity: minimumSecurity,
            securityAboveMinimum: Math.max(0, currentSecurity - minimumSecurity),
            growth: Number(server.serverGrowth) || 0,
        };
    });

    // Rooted normal-network fleet only - excludes home and cloud/purchased servers, since those
    // already get their own dedicated Capacity gauges (hardware.home:ram, serverBuyer:cloud-ram)
    // and would otherwise be double-counted here.
    const rootedNetworkRam = nodes.reduce((totals, node) => {
        if (!node.hasRoot || node.purchased || node.cloud || node.id === "home") return totals;
        totals.used += node.ramUsed;
        totals.total += node.ramMax;
        return totals;
    }, { used: 0, total: 0 });
    rootedNetworkRam.ratio = rootedNetworkRam.total > 0 ? rootedNetworkRam.used / rootedNetworkRam.total : 0;

    // Auto-connect commands (direct/route/hop/open-location/work-company) all require Singularity
    // and are handled by network-navigator-singularity.js on its own port now - its most recent
    // result takes priority so the frontend's "last navigation" line reflects it, falling back to
    // this script's own "Refresh"/"SetMode" results otherwise.
    const effectiveLastCommand = singularityLastCommand ?? lastCommand;

    const networkMap = {
        title: "Network Navigator",
        subtitle: "Known normal-network routes, access state, and server resources.",
        generatedAt: Date.now(),
        currentHost,
        playerHacking: hackingLevel,
        canConnect: singularityAvailable,
        formulasAvailable,
        knownServers: nodes.length,
        rootedServers: nodes.filter((node) => node.hasRoot).length,
        backdooredServers: nodes.filter((node) => node.backdoorInstalled).length,
        networkRam: rootedNetworkRam,
        nodes,
        edges: graph.edges,
        lastCommand: effectiveLastCommand,
    };
    const maps = { network: networkMap };
    const mapOptions = [{
        id: "network",
        label: "Normal Network",
        note: `${nodes.length} servers`,
        current: false,
        layout: "layered",
        showRoutes: true,
        showCloud: true,
        showNodeFilters: true,
        stateSet: "network",
        metricSet: "network",
        selectionLabel: "Selected server",
        searchPlaceholder: "Find server",
    }];
    for (const city of CITY_NAMES) {
        const id = `city:${city}`;
        const current = player.city === city;
        // Only the currently-viewed mode gets its full detail built - every other city just needs
        // the lightweight picker metadata below, since the frontend only ever reads
        // maps[activeModeId]. This also caps how many cities network-navigator-singularity.js ever
        // needs to fetch company rep/favor for on a given cycle (see that file).
        if (id === activeModeId) {
            maps[id] = buildCityMap(ns, city, nodes, player, singularityAvailable, effectiveLastCommand, companyProgressByCity);
        }
        mapOptions.push({
            id,
            label: city,
            note: current ? "Current city" : `${getCityLocations(city).length} locations`,
            current,
            layout: "grouped",
            showRoutes: false,
            showCloud: false,
            showNodeFilters: false,
            stateSet: "city",
            metricSet: "city",
            selectionLabel: "Selected location",
            searchPlaceholder: "Find location",
        });
    }

    return {
        ...networkMap,
        currentCity: player.city,
        travelCost: TRAVEL_COST,
        activeModeId,
        maps,
        mapOptions,
    };
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[NETWORK] Network Navigator telemetry started.");
    ns.print("[LIFECYCLE] Network Navigator telemetry started.");

    let lastCommand = null;
    let activeModeId = DEFAULT_MODE_ID;
    let lastSnapshotSignature = "";
    while (true) {
        const graph = discoverNetwork(ns, "home", { exclude: ["darkweb"] });
        // This launcher only needs two gates, so avoid the full capability snapshot's unrelated
        // Stock API probes. fileExists() is already in this script's static call graph through
        // startHomeScript(), while hasApiAccess() adds only getResetInfo().
        const singularityAvailable = hasApiAccess(ns, "singularity");
        const formulasAvailable = ns.fileExists("Formulas.exe", "home");

        // Launcher duties: start each gated worker once its own capability is cheaply detected.
        // startHomeScript() no-ops if already running, so a worker that crashed gets relaunched on
        // the very next cycle here without any extra bookkeeping.
        if (formulasAvailable) startHomeScript(ns, FORMULAS_WORKER_SCRIPT);
        if (singularityAvailable) startHomeScript(ns, SINGULARITY_WORKER_SCRIPT);

        while (ns.peek(NETWORK_NAVIGATOR_COMMAND_PORT) !== "NULL PORT DATA") {
            const command = String(ns.readPort(NETWORK_NAVIGATOR_COMMAND_PORT));
            if (command.startsWith(SET_MODE_PREFIX)) {
                const requestedMode = decodeTarget(command, SET_MODE_PREFIX);
                if (requestedMode) activeModeId = requestedMode;
                continue;
            }
            if (command === "Refresh") {
                lastCommand = makeCommandResult("refresh", "", true, "Navigation telemetry refreshed.");
                continue;
            }
            // Anything else (ConnectDirect/ConnectRoute/ConnectHop/OpenLocation/WorkCompany) is
            // Singularity-gated and sent straight to network-navigator-singularity.js's own port
            // by the frontend now - nothing else should be arriving here, but an unrecognized
            // command is just silently ignored rather than erroring.
        }

        const formulasData = loadFreshWorkerData(ns, DATA_PATHS.networkNavigatorFormulasStatsJson);
        const singularityData = loadFreshWorkerData(ns, DATA_PATHS.networkNavigatorSingularityStatsJson);

        const snapshot = buildSnapshot(
            ns,
            graph,
            singularityAvailable,
            formulasAvailable,
            lastCommand,
            activeModeId,
            formulasData?.xpPerSecondByHost ?? null,
            singularityData?.companyProgressByCity ?? null,
            singularityData?.lastCommand ?? null
        );
        // Excludes generatedAt (present at the top level and per city map) from the comparison -
        // it always differs, which would defeat the point. A genuinely new command result still
        // triggers a write, since makeCommandResult's own `timestamp` field isn't excluded.
        const snapshotSignature = JSON.stringify(snapshot, (key, value) => key === "generatedAt" ? undefined : value);
        if (snapshotSignature !== lastSnapshotSignature) {
            await ns.write(DATA_PATHS.networkNavigatorStatsJson, JSON.stringify(snapshot), "w");
            lastSnapshotSignature = snapshotSignature;
        }
        await ns.sleep(SNAPSHOT_INTERVAL_MS);
    }
}
