import { discoverNetwork, pathToHost } from "dashboard/libs/topology.js";

const OUTPUT_PATH = "data/network_navigator_action_result.json";
const COMMAND_PREFIXES = {
    direct: "ConnectDirect:",
    route: "ConnectRoute:",
    hop: "ConnectHop:",
};

function decodeTarget(command, prefix) {
    try {
        return decodeURIComponent(command.slice(prefix.length)).trim();
    } catch (error) {
        return "";
    }
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

export function runNavigationCommand(ns, command) {
    const commandType = Object.entries(COMMAND_PREFIXES)
        .find(([, prefix]) => command.startsWith(prefix));
    if (!commandType) return makeCommandResult("connect", "", false, "The navigation command is not known.");

    const [kind, prefix] = commandType;
    const target = decodeTarget(command, prefix);
    const graph = discoverNetwork(ns, "home", { exclude: ["darkweb"] });
    if (!target || !graph.servers.includes(target)) {
        return makeCommandResult(kind, target, false, "The requested server is not in the known network.");
    }
    if (kind === "direct" || kind === "hop") {
        const ok = connectTo(ns, target);
        return makeCommandResult(
            kind,
            target,
            ok,
            ok ? `Connected to ${target}.` : `Could not connect directly to ${target} from the current server.`,
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

/** @param {NS} ns */
export async function main(ns) {
    const command = String(ns.args[0] ?? "");
    const requestToken = String(ns.args[1] ?? "");
    const lastCommand = runNavigationCommand(ns, command);
    await ns.write(OUTPUT_PATH, JSON.stringify({ generatedAt: Date.now(), requestToken, lastCommand }), "w");
}
