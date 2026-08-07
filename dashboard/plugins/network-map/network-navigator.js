import { CITY_NAMES, getCityLocations, getLocationCatalogEntry } from "dashboard/plugins/network-map/city-locations.js";
import { discoverNetwork, pathToHost } from "dashboard/plugins/network-map/topology.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const COMMAND_PORT = 20;
const SNAPSHOT_INTERVAL_MS = 2000;
const TRAVEL_COST = 200_000;
const DATA_PATHS = {
    batcherStatsJson: "data/batcher_stats.json",
    batcherMoneyStatsJson: "data/batcher_money_stats.json",
    batcherXpStatsJson: "data/batcher_xp_stats.json",
    batcherBalancedStatsJson: "data/batcher_balanced_stats.json",
    networkNavigatorStatsJson: "data/network_navigator_stats.json",
};
const COMMAND_PREFIXES = {
    direct: "ConnectDirect:",
    route: "ConnectRoute:",
    hop: "ConnectHop:",
    openLocation: "OpenLocation:",
    workCompany: "WorkCompany:",
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

function collectTargetNames(snapshot, keys) {
    const targets = new Set();
    for (const key of keys) {
        const values = snapshot?.[key];
        if (!Array.isArray(values)) continue;
        for (const value of values) {
            if (typeof value === "string" && value) targets.add(value);
        }
    }
    return targets;
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

function getBatchAssignment(hostname, activeProfile, profitTargets, frontierTargets, xpTargets) {
    const assignments = [];
    const profitActive = activeProfile === "money" || activeProfile === "balanced";
    const xpActive = activeProfile === "xp" || activeProfile === "balanced";
    if (profitTargets.has(hostname)) assignments.push(profitActive ? "Profit (active)" : "Profit");
    if (frontierTargets.has(hostname)) assignments.push(profitActive ? "Frontier (active)" : "Frontier");
    if (xpTargets.has(hostname)) assignments.push(xpActive ? "XP (active)" : "XP");
    return assignments.join(" / ") || "Unassigned";
}

function getXpSuitability(ns, server, player, selected) {
    const requiredSkill = Number(server.requiredHackingSkill) || 0;
    if (!server.hasAdminRights) return "Blocked · no root";
    if (requiredSkill > (Number(player?.skills?.hacking) || 0)) return `Blocked · requires ${requiredSkill.toLocaleString()} skill`;

    let weakenTime = Infinity;
    let experience = 0;
    try {
        const mockServer = { ...server, hackDifficulty: server.minDifficulty };
        weakenTime = ns.formulas.hacking.weakenTime(mockServer, player);
        experience = ns.formulas.hacking.hackExp(mockServer, player);
    } catch (error) {
        try {
            weakenTime = ns.getWeakenTime(server.hostname);
        } catch (nestedError) {
            weakenTime = Infinity;
        }
        experience = (3 + ((Number(server.baseDifficulty) || 0) * 0.3)) * (Number(player?.mults?.hacking_exp) || 1);
    }

    const xpPerSecond = experience / Math.max(0.001, weakenTime / 1000);
    if (!Number.isFinite(xpPerSecond) || xpPerSecond <= 0) return "Eligible · score unavailable";
    const score = xpPerSecond >= 10 ? xpPerSecond.toFixed(1) : xpPerSecond.toFixed(3);
    return `${selected ? "Selected" : "Eligible"} · ${score} XP/s/thread`;
}

function getMapValue(mapLike, key) {
    if (mapLike instanceof Map) return Number(mapLike.get(key)) || 0;
    if (mapLike && typeof mapLike === "object") return Number(mapLike[key]) || 0;
    return 0;
}

function canUseSingularity(ns) {
    try {
        const resetInfo = ns.getResetInfo() ?? {};
        return Number(resetInfo.currentNode) === 4 || getMapValue(resetInfo.ownedSF, 4) >= 1;
    } catch (error) {
        return false;
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

function travelForLocation(ns, city, singularityAvailable) {
    if (!singularityAvailable) {
        return { ok: false, travelled: false, message: "Location actions require Singularity access (Source-File 4)." };
    }

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

function runLocationCommand(ns, command, kind, prefix, singularityAvailable) {
    const target = decodeLocationTarget(command, prefix);
    if (!target) return makeCommandResult(kind, "", false, "The requested city location is not known.");

    const travel = travelForLocation(ns, target.city, singularityAvailable);
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

function runNavigationCommand(ns, command, graph, singularityAvailable) {
    if (command === "Refresh") {
        return makeCommandResult("refresh", "", true, "Navigation telemetry refreshed.");
    }

    const commandType = Object.entries(COMMAND_PREFIXES)
        .find(([, prefix]) => command.startsWith(prefix));
    if (!commandType) return null;

    const [kind, prefix] = commandType;
    if (kind === "openLocation" || kind === "workCompany") {
        return runLocationCommand(ns, command, kind, prefix, singularityAvailable);
    }

    const target = decodeTarget(command, prefix);
    if (!target || !graph.servers.includes(target)) {
        return makeCommandResult(kind, target, false, "The requested server is not in the known network.");
    }
    if (!singularityAvailable) {
        return makeCommandResult(kind, target, false, "Automatic connection requires Singularity access (Source-File 4).");
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

function findCurrentHost(serverSnapshots) {
    return serverSnapshots.find((server) => server.isConnectedTo)?.hostname ?? "home";
}

function normalizeIdentity(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatProgressNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "Unavailable";
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

function getCompanyProgress(ns, companyName, singularityAvailable) {
    if (!singularityAvailable) return { reputation: "Requires SF4", favor: "Requires SF4" };
    try {
        return {
            reputation: formatProgressNumber(ns.singularity.getCompanyRep(companyName)),
            favor: formatProgressNumber(ns.singularity.getCompanyFavor(companyName)),
        };
    } catch (error) {
        return { reputation: "Unavailable", favor: "Unavailable" };
    }
}

function buildCityMap(ns, city, networkNodes, player, singularityAvailable, lastCommand) {
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
                ? getCompanyProgress(ns, location.name, singularityAvailable)
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

function buildSnapshot(ns, graph, singularityAvailable, lastCommand, activeModeId) {
    const player = ns.getPlayer();
    const hackingLevel = Number(player?.skills?.hacking) || 0;
    const batcherStats = loadJsonFile(ns, DATA_PATHS.batcherStatsJson);
    const moneyStats = loadJsonFile(ns, DATA_PATHS.batcherMoneyStatsJson);
    const xpStats = loadJsonFile(ns, DATA_PATHS.batcherXpStatsJson);
    const balancedStats = loadJsonFile(ns, DATA_PATHS.batcherBalancedStatsJson);
    const activeProfile = String(batcherStats?.activeProfile ?? "");
    const activeMoneyStats = activeProfile === "balanced" ? balancedStats : moneyStats;
    const activeXpStats = activeProfile === "balanced" ? balancedStats : xpStats;
    const profitTargets = collectTargetNames(activeMoneyStats, ["profitTargets", "overflowTargets"]);
    const frontierTargets = collectTargetNames(activeMoneyStats, ["frontierTargets"]);
    const moneyTargets = new Set([...profitTargets, ...frontierTargets]);
    const xpTargets = collectTargetNames(activeXpStats, activeProfile === "balanced" ? ["xpTargets"] : ["targets"]);
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
            moneyTarget: moneyTargets.has(server.hostname),
            xpTarget: xpTargets.has(server.hostname),
            hasContract,
            contractCount,
            story: STORY_SERVERS.has(server.hostname) || hasStoryFile,
            currentlyBeingHacked: activelyHackedTargets.has(server.hostname),
            batchAssignment: getBatchAssignment(server.hostname, activeProfile, profitTargets, frontierTargets, xpTargets),
            xpSuitability: getXpSuitability(ns, server, player, xpTargets.has(server.hostname)),
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

    const networkMap = {
        title: "Network Navigator",
        subtitle: "Known normal-network routes, access state, and server resources.",
        generatedAt: Date.now(),
        currentHost,
        playerHacking: hackingLevel,
        canConnect: singularityAvailable,
        knownServers: nodes.length,
        rootedServers: nodes.filter((node) => node.hasRoot).length,
        backdooredServers: nodes.filter((node) => node.backdoorInstalled).length,
        nodes,
        edges: graph.edges,
        lastCommand,
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
        // Only the currently-viewed mode gets its full detail built (buildCityMap's per-company
        // getCompanyProgress() is 2 singularity calls each) - every other city just needs the
        // lightweight picker metadata below, since the frontend only ever reads maps[activeModeId].
        if (id === activeModeId) {
            maps[id] = buildCityMap(ns, city, nodes, player, singularityAvailable, lastCommand);
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
        const singularityAvailable = canUseSingularity(ns);

        while (ns.peek(COMMAND_PORT) !== "NULL PORT DATA") {
            const command = String(ns.readPort(COMMAND_PORT));
            if (command.startsWith(SET_MODE_PREFIX)) {
                const requestedMode = decodeTarget(command, SET_MODE_PREFIX);
                if (requestedMode) activeModeId = requestedMode;
                continue;
            }
            const result = runNavigationCommand(ns, command, graph, singularityAvailable);
            if (!result) continue;
            lastCommand = result;
            ns.print(`[${result.status.toUpperCase()}] ${result.message}`);
            if (result.status === "error") ns.toast(result.message, "warning", 5000);
        }

        const snapshot = buildSnapshot(ns, graph, singularityAvailable, lastCommand, activeModeId);
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
