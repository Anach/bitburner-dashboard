export function createActionWorkerQueue({
    workerScript,
    resultFile,
    timeoutMs,
    normalizeEnvelope,
    parseResult,
    onComplete,
    now = () => Date.now(),
}) {
    const queue = [];
    let pending = null;
    let sequence = 0;

    const isDuplicatePendingScriptAction = (left, right) => left?.kind === "script"
        && right?.kind === "script"
        && left.actionId === right.actionId
        && left.filename === right.filename;

    const complete = (ns, action, result) => {
        if (typeof onComplete === "function") onComplete(ns, action, result);
    };

    const startNext = (ns) => {
        if (pending || queue.length === 0) return;
        const rawCommand = queue.shift();
        const requestId = `${ns.pid}-${now()}-${++sequence}`;
        let envelope = null;
        try {
            envelope = normalizeEnvelope({ requestId, command: rawCommand });
        } catch (error) {
            complete(ns, { command: rawCommand }, {
                ok: false,
                message: String(error?.message ?? error),
                tone: "error",
            });
            startNext(ns);
            return;
        }

        ns.write(resultFile, "", "w");
        const workerPid = ns.run(workerScript, { threads: 1, temporary: true }, JSON.stringify(envelope));
        if (!(workerPid > 0)) {
            complete(ns, { command: envelope.command }, {
                ok: false,
                message: "Could not start the dashboard action worker. Check available home RAM.",
                tone: "error",
            });
            startNext(ns);
            return;
        }
        pending = {
            requestId,
            command: envelope.command,
            workerPid,
            startedAt: now(),
        };
    };

    return {
        enqueue(ns, command) {
            if (isDuplicatePendingScriptAction(command, pending?.command)
                || queue.some((queued) => isDuplicatePendingScriptAction(command, queued))) {
                return false;
            }
            queue.push(command);
            startNext(ns);
            return true;
        },
        poll(ns) {
            if (pending) {
                const result = parseResult(ns.read(resultFile), pending.requestId);
                if (result) {
                    const completed = pending;
                    pending = null;
                    complete(ns, completed, result);
                } else if (now() - pending.startedAt >= timeoutMs) {
                    const timedOut = pending;
                    pending = null;
                    complete(ns, timedOut, {
                        ok: false,
                        message: "Dashboard action worker timed out.",
                        tone: "error",
                    });
                }
            }
            startNext(ns);
        },
    };
}
