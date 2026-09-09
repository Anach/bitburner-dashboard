import {
    buildQuickServeWorkerSource,
    QUICK_SERVE_CELL_COUNT,
} from "dashboard/plugins/bbs-connect/bbs-connect-worker";

const READY_TIMEOUT_MS = 5000;
const MAX_SAVE_CHARACTERS = 1_000_000;

function errorText(value) {
    if (value instanceof Error) return value.stack || value.message;
    return String(value ?? "Unknown QuickServe runtime error.");
}

export function createQuickServeSession(options) {
    const workerType = globalThis.Worker;
    const blobType = globalThis.Blob;
    const urlApi = globalThis.URL;
    if (!workerType || !blobType || !urlApi?.createObjectURL) {
        throw new Error("This game build does not expose the browser Worker, Blob, and URL APIs required by BBS Connect.");
    }

    const source = buildQuickServeWorkerSource(options.source);
    const objectUrl = urlApi.createObjectURL(new blobType([source], { type: "text/javascript" }));
    let worker;
    try {
        worker = new workerType(objectUrl);
    }
    finally {
        globalThis.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 0);
    }

    let terminated = false;
    let readySettled = false;
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });
    const timeout = globalThis.setTimeout(() => {
        if (readySettled || terminated) return;
        readySettled = true;
        rejectReady(new Error("The remote system did not finish initializing within 5 seconds."));
        worker.terminate();
    }, READY_TIMEOUT_MS);

    const fail = (value) => {
        const message = errorText(value);
        if (!readySettled) {
            readySettled = true;
            globalThis.clearTimeout(timeout);
            rejectReady(new Error(message));
        }
        else {
            options.onError?.(message);
        }
    };

    worker.onmessage = (event) => {
        const message = event?.data;
        if (!message || typeof message !== "object") return;
        if (message.type === "ready") {
            if (readySettled || typeof message.name !== "string" || message.name.trim() === "") return;
            readySettled = true;
            globalThis.clearTimeout(timeout);
            resolveReady({ name: message.name });
            return;
        }
        if (message.type === "frame") {
            const changes = message.changes;
            if (!Array.isArray(changes) || changes.length % 3 !== 0 || changes.length > QUICK_SERVE_CELL_COUNT * 3) {
                fail("The remote system sent an invalid display frame.");
                return;
            }
            for (let offset = 0; offset < changes.length; offset += 3) {
                const index = Number(changes[offset]);
                const glyph = changes[offset + 1];
                const color = Number(changes[offset + 2]);
                if (!Number.isInteger(index) || index < 0 || index >= QUICK_SERVE_CELL_COUNT
                    || typeof glyph !== "string" || Array.from(glyph).length > 2
                    || !Number.isInteger(color) || color < 0 || color > 17) {
                    fail("The remote system sent an invalid display cell.");
                    return;
                }
            }
            options.onFrame?.(changes);
            return;
        }
        if (message.type === "save") {
            if (typeof message.data !== "string" || message.data.length > MAX_SAVE_CHARACTERS) {
                fail(`The remote system attempted to persist more than ${MAX_SAVE_CHARACTERS.toLocaleString()} characters.`);
                return;
            }
            options.onSave?.(message.data);
            return;
        }
        if (message.type === "error") fail(`${message.phase || "runtime"}: ${message.message || "Unknown error"}`);
    };
    worker.onerror = (event) => {
        event?.preventDefault?.();
        fail(event?.message || "The remote system worker failed to start.");
    };
    worker.onmessageerror = () => fail("The remote system sent a message that could not be decoded.");
    worker.postMessage({ type: "initialize", savedData: String(options.savedData ?? "") });

    return {
        ready,
        beginSession: () => { if (!terminated) worker.postMessage({ type: "connect" }); },
        input: (key) => { if (!terminated) worker.postMessage({ type: "input", key }); },
        pause: () => { if (!terminated) worker.postMessage({ type: "pause" }); },
        resume: () => { if (!terminated) worker.postMessage({ type: "resume" }); },
        step: () => { if (!terminated) worker.postMessage({ type: "step" }); },
        terminate: () => {
            if (terminated) return;
            terminated = true;
            globalThis.clearTimeout(timeout);
            if (!readySettled) {
                readySettled = true;
                rejectReady(new Error("The remote session was cancelled during initialization."));
            }
            worker.terminate();
        },
    };
}


