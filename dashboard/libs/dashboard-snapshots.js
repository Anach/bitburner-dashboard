const DEFAULT_REMOTE_PROCESS_INTERVAL_MS = 5000;

function getFileSignature(files) {
    return (Array.isArray(files) ? files : [])
        .filter((filename) => typeof filename === "string")
        .slice()
        .sort()
        .join("|");
}

function collectRemoteProcesses(ns) {
    const visited = new Set(["home"]);
    const queue = ["home"];
    const filenames = [];
    let count = 0;

    while (queue.length > 0) {
        const host = queue.shift();
        let neighbors = [];
        try {
            neighbors = ns.scan(host) ?? [];
        } catch (error) {
            neighbors = [];
        }

        for (const neighbor of neighbors) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            queue.push(neighbor);
        }

        if (host === "home") continue;
        try {
            for (const process of ns.ps(host) ?? []) {
                if (typeof process?.filename !== "string") continue;
                filenames.push(process.filename);
                count += 1;
            }
        } catch (error) {
            // Hosts can become unavailable while the network snapshot is collected.
        }
    }

    return { count, filenames };
}

export function createDashboardSnapshotCoordinator(options = {}) {
    const remoteProcessIntervalMs = Math.max(
        1000,
        Number(options.remoteProcessIntervalMs) || DEFAULT_REMOTE_PROCESS_INTERVAL_MS
    );
    const cadenceCache = new Map();
    const recordCache = new Map();
    let remoteProcesses = { count: 0, filenames: [] };
    let remoteProcessesAt = Number.NEGATIVE_INFINITY;
    let cachedRunningProcessSnapshot = null;

    const getOrCreate = (key, now, intervalMs, signature, factory) => {
        const normalizedKey = String(key ?? "");
        const normalizedSignature = String(signature ?? "");
        const cached = cadenceCache.get(normalizedKey);
        const expired = !cached || now - cached.collectedAt >= intervalMs;
        if (!expired && cached.signature === normalizedSignature) return cached.value;

        const value = factory();
        cadenceCache.set(normalizedKey, {
            value,
            signature: normalizedSignature,
            collectedAt: now,
        });
        return value;
    };

    return {
        collectCycle(ns, now = Date.now()) {
            const homeFiles = ns?.ls("home") ?? [];
            const homeProcesses = ns?.ps("home") ?? [];
            const fileSignature = getFileSignature(homeFiles);

            if (now - remoteProcessesAt >= remoteProcessIntervalMs) {
                remoteProcesses = collectRemoteProcesses(ns);
                remoteProcessesAt = now;
            }

            const homeFilenames = homeProcesses
                .filter((process) => typeof process?.filename === "string")
                .map((process) => process.filename);

            // homeFilenames/remoteProcesses only change in content occasionally (remoteProcesses
            // itself is already reference-stable within its own 5s cadence above); reuse the same
            // snapshot object rather than allocating a new one every single cycle when nothing
            // about the running-process set actually changed.
            const snapshotSignature = `${homeFilenames.join(",")}|${remoteProcesses.filenames.join(",")}`;
            let runningProcessSnapshot;
            if (cachedRunningProcessSnapshot?.signature === snapshotSignature) {
                runningProcessSnapshot = cachedRunningProcessSnapshot.value;
            } else {
                runningProcessSnapshot = {
                    totalCount: homeFilenames.length + remoteProcesses.count,
                    homeFilenames,
                    remoteFilenames: remoteProcesses.filenames,
                };
                cachedRunningProcessSnapshot = { signature: snapshotSignature, value: runningProcessSnapshot };
            }

            return {
                now,
                homeFiles,
                homeProcesses,
                fileSignature,
                runningProcessSnapshot,
            };
        },
        getOrCreate,
        reuseRecord(key, record) {
            const normalizedKey = String(key ?? "");
            const nextRecord = record && typeof record === "object" ? record : {};
            const cached = recordCache.get(normalizedKey);
            const nextKeys = Object.keys(nextRecord);
            if (cached) {
                const cachedKeys = Object.keys(cached);
                if (cachedKeys.length === nextKeys.length
                    && nextKeys.every((recordKey) => cached[recordKey] === nextRecord[recordKey])) {
                    return cached;
                }
            }
            recordCache.set(normalizedKey, nextRecord);
            return nextRecord;
        },
        invalidate(key) {
            cadenceCache.delete(String(key ?? ""));
        },
    };
}