function logLifecycleChange(ns, action, script) {
    if (typeof ns?.print !== "function") return;
    ns.print(`[LIFECYCLE] ${action} ${script}.`);
}

const TEMPORARY_SCRIPT_LAUNCHER = "dashboard/libs/temporary-script-launcher.js";

// Reconcile parent-owned children in a fresh worker so long-lived parents do not permanently pay
// ps()/scriptKill() RAM just to enforce an optional feature gate. Call with the complete managed
// set; any managed script omitted from desired is stopped by the worker.
export function reconcileTemporaryHomeScripts(ns, desired = [], managed = []) {
    if (!ns || !ns.fileExists(TEMPORARY_SCRIPT_LAUNCHER, "home")) return { status: "missing-launcher" };
    const normalizedDesired = (Array.isArray(desired) ? desired : []).flatMap((target) => {
        const script = typeof target === "string" ? target : target?.script;
        if (typeof script !== "string" || !script || !ns.fileExists(script, "home")) return [];
        return [{ script, args: Array.isArray(target?.args) ? target.args : [] }];
    });
    const normalizedManaged = [...new Set((Array.isArray(managed) ? managed : [])
        .filter((script) => typeof script === "string" && script))];
    if (normalizedDesired.length === 0 && normalizedManaged.length === 0) return { status: "empty" };

    const pid = ns.exec(
        TEMPORARY_SCRIPT_LAUNCHER,
        "home",
        { threads: 1, temporary: true, preventDuplicates: true },
        JSON.stringify({ desired: normalizedDesired, managed: normalizedManaged })
    );
    return { status: pid > 0 ? "queued" : "pending" };
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

export function startTemporaryHomeScript(ns, script, ...args) {
    if (!ns || !ns.fileExists(script, "home")) {
        return { status: "missing" };
    }
    if (ns.scriptRunning(script, "home")) {
        return { status: "already-running" };
    }

    const pid = ns.exec(script, "home", { threads: 1, temporary: true }, ...args);
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
