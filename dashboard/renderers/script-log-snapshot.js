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

export function buildScriptLogSnapshot(ns, view, options = {}) {
    const layout = view?.layout ?? {};
    const host = String(layout.host ?? "home");
    const maxLines = Math.max(20, Math.min(2000, Math.floor(Number(layout.maxLines) || 500)));
    const recentLimit = Math.max(0, Math.min(100, Math.floor(Number(layout.recentLimit) || 30)));
    const generatedAt = Date.now();
    const selectedId = String(options.selectedId ?? "");
    const processList = host === "home" && Array.isArray(options.homeProcesses)
        ? options.homeProcesses
        : ns.ps(host);
    const sortedProcessList = [...processList].sort((left, right) => {
        return String(left?.filename ?? "").localeCompare(String(right?.filename ?? ""))
            || (Number(left?.pid) || 0) - (Number(right?.pid) || 0);
    });
    let recentScripts = [];
    try {
        recentScripts = ns.getRecentScripts();
    } catch (error) {
        recentScripts = [];
    }
    const recentCandidates = recentScripts
        .filter((entry) => entry?.server === host)
        .slice(0, recentLimit)
        .map((entry) => {
            const deathTime = Date.parse(String(entry.timeOfDeath ?? "")) || 0;
            return { entry, deathTime, id: `recent:${entry.pid}:${deathTime}` };
        });
    const runningIds = new Set(sortedProcessList.map((process) => `running:${process.pid}`));
    const recentIds = new Set(recentCandidates.map((candidate) => candidate.id));
    const selectedSnapshotId = runningIds.has(selectedId) || recentIds.has(selectedId) ? selectedId : "";
    const running = sortedProcessList.map((process) => {
        const id = `running:${process.pid}`;
        let selectedLogs = [];
        if (selectedSnapshotId === id) {
            try {
                selectedLogs = ns.getScriptLogs(process.pid);
            } catch (error) {
                selectedLogs = [];
            }
        }
        const args = process.args;
        const logs = normalizeLogLines(selectedLogs, maxLines);
        return {
            id,
            status: "running",
            filename: String(process.filename ?? "unknown"),
            host,
            pid: Number(process.pid) || 0,
            threads: Number(process.threads) || 0,
            args: Array.isArray(args) ? args : [],
            argsText: formatScriptArgs(args),
            logs,
            lastLine: logs.at(-1) ?? "",
            timestamp: generatedAt,
        };
    });

    const recent = recentCandidates
        .map(({ entry, deathTime, id }) => {
            const logs = selectedSnapshotId === id
                ? normalizeLogLines(entry.logs, maxLines)
                : [];
            return {
                id,
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