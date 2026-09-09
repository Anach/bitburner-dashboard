import { createQuickServeSession } from "dashboard/plugins/bbs-connect/bbs-connect-runtime";
import { QUICK_SERVE_CELL_COUNT } from "dashboard/plugins/bbs-connect/bbs-connect-worker";

const DIRECTORY_TITLE = "BBS Connect";
const DEFAULT_DIAL_TIMING = Object.freeze({
    dialing: 900,
    carrier: 600,
    negotiation: 700,
    initialization: 700,
    connected: 500,
});

function createBlankFrame() {
    return {
        cells: new Array(QUICK_SERVE_CELL_COUNT).fill(" "),
        colors: new Uint8Array(QUICK_SERVE_CELL_COUNT),
    };
}

function delay(ms) {
    return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function dialDelay(ms, control) {
    const deadline = Date.now() + Math.max(0, Number(ms) || 0);
    while (!control.cancelled && !control.skip && Date.now() < deadline) {
        await delay(Math.min(40, Math.max(1, deadline - Date.now())));
    }
    return !control.cancelled;
}

function errorText(value) {
    return value instanceof Error ? (value.stack || value.message) : String(value);
}

/**
 * Owns BBS navigation, dial timing, worker lifetime, and framebuffer state independently of any
 * React host. A tail or dashboard workspace may detach and remount without restarting a session.
 */
export function createBbsConnectController(options = {}) {
    let connections = Array.isArray(options.connections) ? [...options.connections] : [];
    let allConnections = Array.isArray(options.allConnections) ? [...options.allConnections] : [...connections];
    const bridge = options.bridge ?? {};
    const titleRef = options.titleRef ?? null;
    const sessionFactory = typeof options.createSession === "function" ? options.createSession : createQuickServeSession;
    const dialTiming = { ...DEFAULT_DIAL_TIMING, ...(options.dialTiming ?? {}) };
    const listeners = new Set();
    let session = null;
    let sequence = 0;
    let dialControl = null;
    let disposed = false;
    let directoryScrollTop = 0;
    let catalogScrollTop = 0;
    let snapshot = Object.freeze({
        mode: "directory",
        connection: null,
        name: "",
        title: DIRECTORY_TITLE,
        dialLines: [],
        errorMessage: "",
        application: null,
        paused: false,
        frame: createBlankFrame(),
        frameVersion: 0,
        selectedConnectionId: connections[0]?.id ?? "",
    });

    const publish = (changes) => {
        if (disposed) return;
        snapshot = Object.freeze({ ...snapshot, ...changes });
        for (const listener of [...listeners]) {
            try {
                listener(snapshot);
            } catch (error) {
                // A detached UI observer must not interfere with the active remote session.
            }
        }
    };
    const setTitle = (title) => {
        const normalized = String(title || DIRECTORY_TITLE);
        if (titleRef) titleRef.current = normalized;
        publish({ title: normalized });
    };
    const terminateSession = () => {
        session?.terminate?.();
        session = null;
    };
    const cancelDial = () => {
        if (dialControl) dialControl.cancelled = true;
        dialControl = null;
    };
    const appendDialLine = (line) => publish({ dialLines: [...snapshot.dialLines, line] });
    const applyFrameChanges = (changes) => {
        const frame = snapshot.frame;
        let changed = false;
        for (let offset = 0; offset < changes.length; offset += 3) {
            const index = Number(changes[offset]);
            const glyph = String(changes[offset + 1] ?? " ");
            const color = Number(changes[offset + 2]);
            if (!Number.isInteger(index) || index < 0 || index >= QUICK_SERVE_CELL_COUNT) continue;
            frame.cells[index] = glyph;
            frame.colors[index] = Number.isInteger(color) && color >= 0 && color <= 17 ? color : 0;
            changed = true;
        }
        if (changed) publish({ frameVersion: snapshot.frameVersion + 1 });
    };
    const resolveConnection = (connection) => {
        const id = typeof connection === "string" ? connection : connection?.id;
        return connections.find((candidate) => candidate.id === id) ?? null;
    };

    const replaceConnections = (result) => {
        connections = Array.isArray(result?.connections) ? [...result.connections] : connections;
        allConnections = Array.isArray(result?.allConnections) ? [...result.allConnections] : [...connections];
        const selectedConnectionId = connections.some((connection) => connection.id === snapshot.selectedConnectionId)
            ? snapshot.selectedConnectionId
            : connections[0]?.id ?? "";
        publish({ selectedConnectionId });
        return result;
    };

    const requireDirectory = () => {
        if (disposed) throw new Error("BBS Connect has stopped.");
        if (snapshot.mode !== "directory") throw new Error("Return to the directory before changing its catalog.");
    };

    const validateImport = async (prepared) => {
        let validationSession = null;
        let timeout = null;
        let resolveFrame;
        let rejectFrame;
        const firstFrame = new Promise((resolve, reject) => {
            resolveFrame = resolve;
            rejectFrame = reject;
        });
        try {
            validationSession = sessionFactory({
                source: prepared.source,
                savedData: "",
                onFrame: () => resolveFrame(),
                onSave: () => {},
                onError: (message) => rejectFrame(new Error(String(message))),
            });
            const ready = await validationSession.ready;
            validationSession.beginSession();
            timeout = globalThis.setTimeout(
                () => rejectFrame(new Error("The imported game did not publish a display frame within 2 seconds.")),
                2_000,
            );
            await firstFrame;
            return String(ready.name).trim();
        }
        finally {
            if (timeout !== null) globalThis.clearTimeout(timeout);
            validationSession?.terminate?.();
        }
    };

    const returnToDirectory = () => {
        sequence += 1;
        cancelDial();
        terminateSession();
        publish({
            mode: "directory",
            connection: null,
            name: "",
            dialLines: [],
            errorMessage: "",
            application: null,
            paused: false,
            frame: createBlankFrame(),
            frameVersion: snapshot.frameVersion + 1,
        });
        setTitle(DIRECTORY_TITLE);
    };

    const openConnection = async (rawConnection) => {
        const connection = resolveConnection(rawConnection);
        if (!connection || disposed) return false;
        const currentSequence = ++sequence;
        cancelDial();
        terminateSession();
        const control = { sequence: currentSequence, cancelled: false, skip: false };
        dialControl = control;
        publish({
            mode: "dialing",
            connection,
            name: "",
            dialLines: ["NETRONICS CONNECT v2.4", "", `CONNECT : ${connection.label}`, ""],
            errorMessage: "",
            application: null,
            paused: false,
            frame: createBlankFrame(),
            frameVersion: snapshot.frameVersion + 1,
            selectedConnectionId: connection.id,
        });
        setTitle(`${DIRECTORY_TITLE} — Dialing ${connection.label}`);
        const sourceResultPromise = Promise.resolve()
            .then(() => bridge.requestConnection(connection))
            .then((resource) => ({ resource, error: null }), (error) => ({ resource: null, error }));
        try {
            appendDialLine("Dialing *** *** *****...");
            if (!await dialDelay(dialTiming.dialing, control)) return false;
            appendDialLine("Carrier detected.");
            if (!await dialDelay(dialTiming.carrier, control)) return false;
            appendDialLine("Negotiating 9600 baud...");
            if (!await dialDelay(dialTiming.negotiation, control)) return false;
            appendDialLine("Initializing remote session...");
            const minimumInitialization = dialDelay(dialTiming.initialization, control);
            const sourceResult = await sourceResultPromise;
            if (sourceResult.error) throw sourceResult.error;
            if (control.cancelled || currentSequence !== sequence || disposed) return false;
            if (sourceResult.resource?.kind === "application") {
                if (!await minimumInitialization || control.cancelled || currentSequence !== sequence || disposed) return false;
                appendDialLine("");
                appendDialLine("CONNECTED");
                if (!await dialDelay(dialTiming.connected, control) || currentSequence !== sequence || disposed) return false;
                dialControl = null;
                publish({
                    mode: "application",
                    application: sourceResult.resource,
                    name: connection.label,
                    paused: false,
                });
                setTitle(`${DIRECTORY_TITLE} — ${connection.label}`);
                return true;
            }
            const nextSession = sessionFactory({
                source: sourceResult.resource.source,
                savedData: sourceResult.resource.savedData,
                onFrame: applyFrameChanges,
                onSave: (data) => bridge.persist(connection.id, data),
                onError: (message) => {
                    if (currentSequence !== sequence || disposed) return;
                    terminateSession();
                    publish({ mode: "error", connection, name: "", errorMessage: String(message), paused: false });
                    setTitle(`${DIRECTORY_TITLE} — Connection Failed`);
                },
            });
            session = nextSession;
            const ready = await nextSession.ready;
            if (!await minimumInitialization || control.cancelled || currentSequence !== sequence || disposed) {
                nextSession.terminate();
                if (session === nextSession) session = null;
                return false;
            }
            appendDialLine("");
            appendDialLine("CONNECTED");
            if (!await dialDelay(dialTiming.connected, control) || currentSequence !== sequence || disposed) {
                nextSession.terminate();
                if (session === nextSession) session = null;
                return false;
            }
            dialControl = null;
            publish({ mode: "session", connection, application: null, name: ready.name, paused: false });
            setTitle(`${DIRECTORY_TITLE} — ${ready.name}`);
            nextSession.beginSession();
            return true;
        } catch (error) {
            if (control.cancelled || currentSequence !== sequence || disposed) return false;
            terminateSession();
            publish({ mode: "error", connection, name: "", errorMessage: errorText(error), paused: false });
            setTitle(`${DIRECTORY_TITLE} — Connection Failed`);
            return false;
        }
    };

    return {
        get connections() { return connections; },
        get allConnections() { return allConnections; },
        getCatalogScrollTop: () => catalogScrollTop,
        getDirectoryScrollTop: () => directoryScrollTop,
        getSnapshot: () => snapshot,
        input: (key) => session?.input?.(key),
        prepareConnectionImport: async (url) => {
            requireDirectory();
            const prepared = await bridge.prepareImport(url);
            const name = await validateImport(prepared);
            return { ...prepared, name };
        },
        installConnectionImport: async (prepared) => {
            requireDirectory();
            if (!prepared?.source || !String(prepared?.name || "").trim()) {
                throw new Error("Validate a QuickServe source before installing it.");
            }
            return replaceConnections(await bridge.installImport(prepared)).connection;
        },
        openConnection,
        reload: () => snapshot.connection ? openConnection(snapshot.connection) : Promise.resolve(false),
        returnToDirectory,
        selectConnection: (connection) => {
            const resolved = resolveConnection(connection);
            if (resolved) publish({ selectedConnectionId: resolved.id });
        },
        setConnectionVisible: async (connection, visible) => {
            requireDirectory();
            const id = typeof connection === "string" ? connection : connection?.id;
            return replaceConnections(await bridge.setConnectionVisible(id, visible));
        },
        removeConnection: async (connection) => {
            requireDirectory();
            const id = typeof connection === "string" ? connection : connection?.id;
            return replaceConnections(await bridge.removeConnection(id));
        },
        setCatalogScrollTop: (value) => {
            const next = Number(value);
            if (Number.isFinite(next) && next >= 0) catalogScrollTop = next;
        },
        setDirectoryScrollTop: (value) => {
            const next = Number(value);
            if (Number.isFinite(next) && next >= 0) directoryScrollTop = next;
        },
        shutdown: () => {
            if (disposed) return;
            sequence += 1;
            cancelDial();
            terminateSession();
            disposed = true;
            listeners["clear"]();
        },
        skipDial: () => { if (dialControl) dialControl.skip = true; },
        step: () => session?.step?.(),
        subscribe: (listener) => {
            if (disposed || typeof listener !== "function") return () => {};
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        togglePause: () => {
            if (!session || snapshot.mode !== "session") return;
            if (snapshot.paused) session.resume?.();
            else session.pause?.();
            publish({ paused: !snapshot.paused });
        },
    };
}


