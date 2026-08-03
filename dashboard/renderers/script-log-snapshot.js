function formatScriptArgs(args) {
    return (Array.isArray(args) ? args : []).map((arg) => {
        if (typeof arg === "string") return JSON.stringify(arg);
        if (arg === null) return "null";
        return String(arg);
    }).join(" ");
}

function normalizeLogLines(lines, maxLines) {
    return (Array.isArray(lines) ? lines : [])
        .filter((line) => typeof line === "string")
        .map((line) => line
            .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
            .replace(/\r/g, ""))
        .filter((line) => line !== "[object Object]")
        .slice(-maxLines);
}

export function buildScriptLogSnapshot(ns, view) {
    const layout = view?.layout ?? {};
    const host = String(layout.host ?? "home");
    const maxLines = Math.max(20, Math.min(2000, Math.floor(Number(layout.maxLines) || 500)));
    const recentLimit = Math.max(0, Math.min(100, Math.floor(Number(layout.recentLimit) || 30)));
    const generatedAt = Date.now();
    const running = ns.ps(host).map((process) => {
        let details = null;
        try {
            details = ns.getRunningScript(process.pid);
        } catch (error) {
            details = null;
        }
        const args = Array.isArray(details?.args) ? details.args : process.args;
        const logs = normalizeLogLines(details?.logs, maxLines);
        return {
            id: `running:${process.pid}`,
            status: "running",
            filename: String(process.filename ?? details?.filename ?? "unknown"),
            host,
            pid: Number(process.pid) || 0,
            threads: Number(process.threads) || Number(details?.threads) || 0,
            args: Array.isArray(args) ? args : [],
            argsText: formatScriptArgs(args),
            logs,
            lastLine: logs.at(-1) ?? "",
            timestamp: generatedAt,
        };
    }).sort((left, right) => left.filename.localeCompare(right.filename) || left.pid - right.pid);

    let recentScripts = [];
    try {
        recentScripts = ns.getRecentScripts();
    } catch (error) {
        recentScripts = [];
    }
    const recent = recentScripts
        .filter((entry) => entry?.server === host)
        .slice(0, recentLimit)
        .map((entry) => {
            const deathTime = Date.parse(String(entry.timeOfDeath ?? "")) || 0;
            const logs = normalizeLogLines(entry.logs, maxLines);
            return {
                id: `recent:${entry.pid}:${deathTime}`,
                status: "recent",
                filename: String(entry.filename ?? "unknown"),
                host,
                pid: Number(entry.pid) || 0,
                threads: Number(entry.threads) || 0,
                args: Array.isArray(entry.args) ? entry.args : [],
                argsText: formatScriptArgs(entry.args),
                logs,
                lastLine: logs.at(-1) ?? "",
                timestamp: deathTime,
            };
        });

    return { generatedAt, host, entries: [...running, ...recent] };
}