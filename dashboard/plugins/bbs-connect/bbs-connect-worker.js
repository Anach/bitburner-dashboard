export const QUICK_SERVE_WIDTH = 56;
export const QUICK_SERVE_HEIGHT = 20;
export const QUICK_SERVE_CELL_COUNT = QUICK_SERVE_WIDTH * QUICK_SERVE_HEIGHT;

const WORKER_PREFIX = String.raw`(() => {
    const WIDTH = 56;
    const HEIGHT = 20;
    const CELL_COUNT = WIDTH * HEIGHT;
    const FRAME_INTERVAL_MS = 1000 / 30;
    const cells = new Array(CELL_COUNT).fill(" ");
    const colors = new Uint8Array(CELL_COUNT);
    const publishedCells = new Array(CELL_COUNT).fill("\0");
    const publishedColors = new Uint8Array(CELL_COUNT);
    let storedData = "";
    let updateTimer = null;
    let connected = false;
    let paused = false;

    function send(message) {
        globalThis.postMessage(message);
    }

    function asInteger(value) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
    }

    function asColor(value) {
        const numeric = asInteger(value);
        return numeric >= 0 && numeric <= 17 ? numeric : 0;
    }

    function firstGlyph(value) {
        const glyph = Array.from(String(value ?? " "))[0] ?? " ";
        return glyph === "⚉" ? "💀︎" : glyph;
    }

    function drawChar(value, color, x, y) {
        const cellX = asInteger(x);
        const cellY = asInteger(y);
        if (cellX < 0 || cellX >= WIDTH || cellY < 0 || cellY >= HEIGHT) return;
        const index = cellY * WIDTH + cellX;
        cells[index] = firstGlyph(value);
        colors[index] = asColor(color);
    }

    function fillArea(symbol, color, x, y, width, height) {
        const originX = asInteger(x);
        const originY = asInteger(y);
        const areaWidth = Math.max(0, asInteger(width));
        const areaHeight = Math.max(0, asInteger(height));
        const glyph = firstGlyph(symbol);
        for (let offsetY = 0; offsetY < areaHeight; offsetY++) {
            for (let offsetX = 0; offsetX < areaWidth; offsetX++) {
                drawChar(glyph, color, originX + offsetX, originY + offsetY);
            }
        }
    }

    function clearScreen() {
        fillArea(" ", 0, 0, 0, WIDTH, HEIGHT);
    }

    function drawText(text, color, x, y) {
        const glyphs = Array.from(String(text));
        const originX = asInteger(x);
        const originY = asInteger(y);
        for (let index = 0; index < glyphs.length; index++) {
            drawChar(glyphs[index], color, originX + index, originY);
        }
    }

    function drawTextWrapped(text, color, x, y, width) {
        const lineWidth = Math.max(0, asInteger(width));
        if (lineWidth === 0) return;
        const originX = asInteger(x);
        const originY = asInteger(y);
        const words = String(text).match(/\s|\S+/g) ?? [];
        let offsetX = 0;
        let offsetY = 0;
        for (const word of words) {
            const glyphs = Array.from(word);
            if (word === "\n") {
                offsetY++;
                offsetX = 0;
                continue;
            }
            if (/\S/.test(word) && glyphs.length <= lineWidth && offsetX > 0 && offsetX + glyphs.length > lineWidth) {
                offsetY++;
                offsetX = 0;
            }
            for (const glyph of glyphs) {
                if (offsetX >= lineWidth) {
                    offsetY++;
                    offsetX = 0;
                    if (/\s/.test(glyph)) continue;
                }
                if (!/\s/.test(glyph)) drawChar(glyph, color, originX + offsetX, originY + offsetY);
                offsetX++;
            }
        }
    }

    function drawBox(color, x, y, width, height) {
        const originX = asInteger(x);
        const originY = asInteger(y);
        const boxWidth = asInteger(width);
        const boxHeight = asInteger(height);
        fillArea("═", color, originX + 1, originY, boxWidth - 2, 1);
        fillArea("═", color, originX + 1, originY + boxHeight - 1, boxWidth - 2, 1);
        fillArea("║", color, originX, originY + 1, 1, boxHeight - 2);
        fillArea("║", color, originX + boxWidth - 1, originY + 1, 1, boxHeight - 2);
        drawChar("╔", color, originX, originY);
        drawChar("╗", color, originX + boxWidth - 1, originY);
        drawChar("╚", color, originX, originY + boxHeight - 1);
        drawChar("╝", color, originX + boxWidth - 1, originY + boxHeight - 1);
    }

    function saveData(data) {
        storedData = String(data ?? "");
        send({ type: "save", data: storedData });
    }

    function loadData() {
        return storedData;
    }

    const quickServeServer = (() => {
`;

const WORKER_SUFFIX = String.raw`
        if (typeof getName !== "function") throw new Error("Required function getName() is missing.");
        if (typeof onConnect !== "function") throw new Error("Required function onConnect() is missing.");
        if (typeof onUpdate !== "function") throw new Error("Required function onUpdate() is missing.");
        if (typeof onInput !== "function") throw new Error("Required function onInput(key) is missing.");
        return { getName, onConnect, onUpdate, onInput };
    })();

    function stopUpdates() {
        if (updateTimer !== null) clearInterval(updateTimer);
        updateTimer = null;
    }

    function reportFailure(phase, error) {
        stopUpdates();
        paused = true;
        const message = error instanceof Error ? (error.stack || error.message) : String(error);
        send({ type: "error", phase, message });
    }

    function invoke(phase, callback, argumentProvided, argument) {
        try {
            return { ok: true, value: argumentProvided ? callback(argument) : callback() };
        }
        catch (error) {
            reportFailure(phase, error);
            return { ok: false, value: undefined };
        }
    }

    function publishFrame(force) {
        const changes = [];
        for (let index = 0; index < CELL_COUNT; index++) {
            if (!force && cells[index] === publishedCells[index] && colors[index] === publishedColors[index]) continue;
            changes.push(index, cells[index], colors[index]);
            publishedCells[index] = cells[index];
            publishedColors[index] = colors[index];
        }
        if (changes.length > 0) send({ type: "frame", changes });
    }

    function updateOnce() {
        if (!connected) return;
        const result = invoke("onUpdate", quickServeServer.onUpdate, false);
        if (result.ok) publishFrame(false);
    }

    function startUpdates() {
        stopUpdates();
        if (!connected || paused) return;
        updateTimer = setInterval(updateOnce, FRAME_INTERVAL_MS);
    }

    globalThis.onmessage = (event) => {
        const message = event?.data ?? {};
        if (message.type === "initialize") {
            storedData = typeof message.savedData === "string" ? message.savedData : "";
            const result = invoke("getName", quickServeServer.getName, false);
            if (!result.ok) return;
            if (typeof result.value !== "string" || result.value.trim() === "") {
                reportFailure("getName", new Error("getName() must return a non-empty string."));
                return;
            }
            send({ type: "ready", name: result.value });
            return;
        }
        if (message.type === "connect") {
            clearScreen();
            connected = true;
            paused = false;
            const connectedResult = invoke("onConnect", quickServeServer.onConnect, false);
            if (!connectedResult.ok) return;
            const updatedResult = invoke("onUpdate", quickServeServer.onUpdate, false);
            if (!updatedResult.ok) return;
            publishFrame(true);
            startUpdates();
            return;
        }
        if (message.type === "input" && connected && !paused) {
            invoke("onInput", quickServeServer.onInput, true, asInteger(message.key));
            return;
        }
        if (message.type === "pause") {
            paused = true;
            stopUpdates();
            return;
        }
        if (message.type === "resume") {
            paused = false;
            startUpdates();
            return;
        }
        if (message.type === "step" && connected && paused) updateOnce();
    };
})();
`;

export function buildQuickServeWorkerSource(serverSource) {
    return WORKER_PREFIX + String(serverSource ?? "") + "\n" + WORKER_SUFFIX;
}


