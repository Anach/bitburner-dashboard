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

// A running script's logs can only be queried by reading its entire retained buffer. Remember the
// result when the user selects it rather than doing that for every row on every one-second refresh.
// Entries disappear with their PID, so this cannot leak an old process's state onto a reused PID.
const observedRunningLogAvailability = new Map();

function hasRetainedLogLines(lines) {
    return Array.isArray(lines) && lines.some((line) => (
        typeof line === "string" && line.replace(/\r/g, "") !== "" && line !== "[object Object]"
    ));
}

export function buildScriptLogSnapshot(ns, view, options = {}) {
    const layout = view?.layout ?? {};
    const host = String(layout.host ?? "home");
    const maxLines = Math.max(20, Math.min(2000, Math.floor(Number(layout.maxLines) || 500)));
    const configuredRecentLimit = Number(layout.recentLimit);
    const recentLimit = Math.max(0, Math.min(100, Number.isFinite(configuredRecentLimit)
        ? Math.floor(configuredRecentLimit)
        : 30));
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
    if (recentLimit > 0) {
        try {
            recentScripts = ns.getRecentScripts();
        } catch (error) {
            recentScripts = [];
        }
    }
    const recentCandidates = recentScripts
        .filter((entry) => entry?.server === host)
        .slice(0, recentLimit)
        .map((entry) => {
            const deathTime = Date.parse(String(entry.timeOfDeath ?? "")) || 0;
            return { entry, deathTime, id: `recent:${entry.pid}:${deathTime}` };
        });
    const runningIds = new Set(sortedProcessList.map((process) => `running:${process.pid}`));
    for (const id of observedRunningLogAvailability.keys()) {
        if (!runningIds.has(id)) observedRunningLogAvailability.delete(id);
    }
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
        if (selectedSnapshotId === id) {
            observedRunningLogAvailability.set(id, logs.length > 0 ? "live" : "empty");
        }
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
            logAvailability: observedRunningLogAvailability.get(id) ?? "unknown",
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
                logAvailability: hasRetainedLogLines(entry.logs) ? "stale" : "empty",
                timestamp: deathTime,
            };
        });

    return { generatedAt, host, entries: [...running, ...recent] };
}
