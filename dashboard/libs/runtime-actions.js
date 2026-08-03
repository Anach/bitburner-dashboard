export function restartHomeScript(ns, script, ...args) {
    if (!ns || !ns.fileExists(script, "home")) {
        return { status: "missing" };
    }

    if (ns.scriptRunning(script, "home") && !ns.scriptKill(script, "home")) {
        return { status: "failed-to-stop" };
    }

    const pid = ns.exec(script, "home", 1, ...args);
    if (pid > 0) return { status: "restarted", pid };
    if (ns.scriptRunning(script, "home")) return { status: "already-running" };
    return { status: "failed" };
}

export function startHomeScript(ns, script, ...args) {
    if (!ns || !ns.fileExists(script, "home")) {
        return { status: "missing" };
    }
    if (ns.scriptRunning(script, "home")) {
        return { status: "already-running" };
    }

    const ok = ns.exec(script, "home", 1, ...args);
    return ok > 0 ? { status: "started" } : { status: "failed" };
}

export function stopHomeScript(ns, script) {
    if (!ns || !ns.fileExists(script, "home")) {
        return { status: "missing" };
    }
    if (!ns.scriptRunning(script, "home")) {
        return { status: "not-running" };
    }

    const stopped = ns.scriptKill(script, "home");
    return stopped ? { status: "stopped" } : { status: "failed" };
}

export function killAllHomeScripts(ns, options = {}) {
    if (!ns) {
        return { killedCount: 0 };
    }

    const excludeSet = new Set(Array.isArray(options.exclude) ? options.exclude : []);
    const processes = ns.ps("home");
    let killedCount = 0;

    for (const process of processes) {
        if (!process?.filename) continue;
        if (excludeSet.has(process.filename)) continue;
        if (ns.scriptKill(process.filename, "home")) {
            killedCount += 1;
        }
    }

    return { killedCount };
}

export function killAllRemoteScripts(ns) {
    if (!ns) {
        return { killedCount: 0, serverCount: 0 };
    }

    const visited = getNetworkServers(ns);
    let serverCount = 0;
    let killedCount = 0;

    for (const server of visited) {
        if (server === "home") continue;
        if (!ns.hasRootAccess(server)) continue;

        serverCount += 1;
        const processes = ns.ps(server);
        for (const process of processes) {
            if (!process?.filename) continue;
            if (ns.scriptKill(process.filename, server)) {
                killedCount += 1;
            }
        }
    }

    return { killedCount, serverCount };
}

function getNetworkServers(ns) {
    const visited = new Set(["home"]);
    const queue = ["home"];

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of ns.scan(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return visited;
}
