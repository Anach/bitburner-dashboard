function parsePlan(raw) {
    try {
        const parsed = JSON.parse(String(raw ?? "{}"));
        const desired = (Array.isArray(parsed?.desired) ? parsed.desired : [])
            .filter((target) => target && typeof target.script === "string" && target.script)
            .map((target) => ({
                script: target.script,
                args: Array.isArray(target.args) ? target.args : [],
            }));
        const managed = [...new Set((Array.isArray(parsed?.managed) ? parsed.managed : [])
            .filter((script) => typeof script === "string" && script))];
        return { desired, managed };
    } catch (error) {
        return { desired: [], managed: [] };
    }
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const plan = parsePlan(ns.args[0]);
    const desiredScripts = new Set(plan.desired.map((target) => target.script));

    for (const script of plan.managed) {
        if (script === ns.getScriptName() || desiredScripts.has(script)) continue;
        const running = (ns.ps("home") ?? []).some((process) => process?.filename === script);
        if (running && !ns.scriptKill(script, "home")) {
            ns.print(`[TEMPORARY LAUNCHER] Could not stop disabled child ${script}.`);
        }
    }

    for (const target of plan.desired) {
        if (target.script === ns.getScriptName() || !ns.fileExists(target.script, "home")) continue;
        const running = (ns.ps("home") ?? []).filter((process) => process?.filename === target.script);
        if (running.length > 0 && running.every((process) => process.temporary === true)) continue;
        if (running.length > 0 && !ns.scriptKill(target.script, "home")) continue;
        ns.exec(target.script, "home", { threads: 1, temporary: true }, ...target.args);
    }
}
