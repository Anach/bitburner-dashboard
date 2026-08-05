function logLifecycleChange(ns, action, script) {
    if (typeof ns?.print !== "function") return;
    ns.print(`[LIFECYCLE] ${action} ${script}.`);
}

export function restartHomeScript(ns, script, ...args) {
    if (!ns || !ns.fileExists(script, "home")) {
        return { status: "missing" };
    }

    if (ns.scriptRunning(script, "home") && !ns.scriptKill(script, "home")) {
        return { status: "failed-to-stop" };
    }

    const pid = ns.exec(script, "home", 1, ...args);
    if (pid > 0) {
        logLifecycleChange(ns, "Restarted", script);
        return { status: "restarted", pid };
    }
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

    const pid = ns.exec(script, "home", 1, ...args);
    if (pid > 0) {
        logLifecycleChange(ns, "Started", script);
        return { status: "started", pid };
    }
    return { status: "failed" };
}

export function stopHomeScript(ns, script) {
    if (!ns || !ns.fileExists(script, "home")) {
        return { status: "missing" };
    }
    if (!ns.scriptRunning(script, "home")) {
        return { status: "not-running" };
    }

    const stopped = ns.scriptKill(script, "home");
    if (stopped) {
        logLifecycleChange(ns, "Stopped", script);
        return { status: "stopped" };
    }
    return { status: "failed" };
}
