import { h } from "dashboard/plugins/bbs-connect/lib/react";
import { BbsConnectCabinet } from "dashboard/plugins/bbs-connect/bbs-connect-cabinet";
import { createBbsConnectUserApplications } from "dashboard/plugins/bbs-connect/bbs-connect-user-applications";
import { createBbsConnectController } from "dashboard/plugins/bbs-connect/bbs-connect-controller";
import { createBbsConnectService } from "dashboard/plugins/bbs-connect/bbs-connect-service";
import { claimSingletonTail } from "dashboard/plugins/bbs-connect/bbs-connect-singleton-tail";

const WINDOW_STATE_FILE = "data/bbs-connect-window.txt";
const WINDOW_STATE_POLL_MS = 250;
const VISUAL_STATE_POLL_MS = 1000;
const DEFAULT_WIDTH = 820;
const DEFAULT_HEIGHT = 640;
const MINIMUM_WIDTH = 520;
const MINIMUM_HEIGHT = 360;
const TAIL_TITLE_HEIGHT = 33;
const DIRECTORY_TITLE = "BBS Connect";

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function normalizeViewport(rawViewport) {
    const width = Number(Array.isArray(rawViewport) ? rawViewport[0] : rawViewport?.width);
    const height = Number(Array.isArray(rawViewport) ? rawViewport[1] : rawViewport?.height);
    return {
        width: Math.max(MINIMUM_WIDTH, Number.isFinite(width) ? Math.floor(width) : DEFAULT_WIDTH),
        height: Math.max(MINIMUM_HEIGHT, Number.isFinite(height) ? Math.floor(height) : DEFAULT_HEIGHT),
    };
}

function parseJson(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    }
    catch (error) {
        return fallback;
    }
}

function readSavedTailSize(ns) {
    const saved = parseJson(ns.read(WINDOW_STATE_FILE), null);
    const width = Number(saved?.width);
    const height = Number(saved?.height);
    return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
}

function getCenteredGeometry(rawViewport, savedSize) {
    const viewport = normalizeViewport(rawViewport);
    const width = clamp(Math.floor(savedSize?.width ?? DEFAULT_WIDTH), MINIMUM_WIDTH, viewport.width);
    const height = clamp(Math.floor(savedSize?.height ?? DEFAULT_HEIGHT), MINIMUM_HEIGHT, viewport.height);
    return {
        x: Math.max(0, Math.floor((viewport.width - width) / 2)),
        y: Math.max(0, Math.floor((viewport.height - height) / 2)),
        width,
        height,
    };
}

function readTailGeometry(ns) {
    try {
        const properties = ns.self()?.tailProperties;
        if (!properties) return null;
        const geometry = {
            x: Number(properties.x),
            y: Number(properties.y),
            width: Number(properties.width),
            height: Number(properties.height),
        };
        return Object.values(geometry).every(Number.isFinite) ? geometry : null;
    }
    catch (error) {
        return null;
    }
}

function readGameTypography(ns) {
    const styles = ns.ui.getStyles();
    const fontSize = Number(styles?.tailFontSize);
    const lineHeight = Number(styles?.lineHeight);
    return {
        fontFamily: String(styles?.fontFamily || '"Lucida Console", "Consolas", monospace'),
        fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16,
        lineHeight: Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 1.5,
    };
}

function readGameTheme(ns) {
    const theme = ns.ui.getTheme();
    return {
        primary: String(theme?.primary || "#00ff00"),
        primarydark: String(theme?.primarydark || "#007700"),
        secondary: String(theme?.secondary || "#cccccc"),
        info: String(theme?.info || "#66aaff"),
        error: String(theme?.error || "#ff4444"),
        disabled: String(theme?.disabled || theme?.secondary || "#777777"),
        background: String(theme?.backgroundprimary || "#000000"),
        surface: String(theme?.backgroundsecondary || theme?.backgroundprimary || "#000000"),
        button: String(theme?.button || theme?.backgroundsecondary || "transparent"),
    };
}

function buildLiveLayout(geometry, typography) {
    return {
        width: geometry.width,
        height: Math.max(0, geometry.height - TAIL_TITLE_HEIGHT),
        ...typography,
    };
}

function sizesDiffer(left, right) {
    return !left
        || Math.abs(Number(left.width) - Number(right.width)) > 0.5
        || Math.abs(Number(left.height) - Number(right.height)) > 0.5;
}

function layoutsDiffer(left, right) {
    return !left || ["width", "height", "fontFamily", "fontSize", "lineHeight"]
        .some((key) => left[key] !== right[key]);
}

function themesDiffer(left, right) {
    return !left || ["primary", "primarydark", "secondary", "info", "error", "disabled", "background", "surface", "button"]
        .some((key) => left[key] !== right[key]);
}

/** Launch the standalone BBS Connect QuickServe terminal. */
export async function main(ns) {
    ns.disableLog("ALL");
    if (!claimSingletonTail(ns)) return;
    const service = createBbsConnectService(ns, { applications: createBbsConnectUserApplications() });

    const initialGeometry = getCenteredGeometry(ns.ui.windowSize(), readSavedTailSize(ns));
    let typography = readGameTypography(ns);
    const layoutRef = { current: buildLiveLayout(initialGeometry, typography) };
    const themeRef = { current: readGameTheme(ns) };
    const titleRef = { current: DIRECTORY_TITLE };
    const controller = createBbsConnectController({
        bridge: service.bridge,
        connections: service.connections,
        allConnections: service.allConnections,
        titleRef,
    });
    let savedSize = { width: initialGeometry.width, height: initialGeometry.height };
    let currentTitle = DIRECTORY_TITLE;
    let tailSeen = false;
    let missingTailPolls = 0;
    let nextVisualStatePollAt = Date.now() + VISUAL_STATE_POLL_MS;

    ns.ui.openTail();
    ns.ui.setTailTitle(currentTitle);
    ns.ui.resizeTail(initialGeometry.width, initialGeometry.height);
    ns.ui.moveTail(initialGeometry.x, initialGeometry.y);
    ns.printRaw(h(BbsConnectCabinet, { controller, layoutRef, themeRef }));

    const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
    try {
        while (true) {
            await wait(WINDOW_STATE_POLL_MS);
            await service.poll();
            const geometry = readTailGeometry(ns);
            if (!geometry) {
                missingTailPolls++;
                if (tailSeen && missingTailPolls >= 2) break;
                continue;
            }
            tailSeen = true;
            missingTailPolls = 0;
            const nextSize = { width: geometry.width, height: geometry.height };
            if (sizesDiffer(savedSize, nextSize)) {
                await ns.write(WINDOW_STATE_FILE, JSON.stringify(nextSize), "w");
                savedSize = nextSize;
            }
            const now = Date.now();
            if (now >= nextVisualStatePollAt) {
                typography = readGameTypography(ns);
                const nextTheme = readGameTheme(ns);
                if (themesDiffer(themeRef.current, nextTheme)) themeRef.current = nextTheme;
                nextVisualStatePollAt = now + VISUAL_STATE_POLL_MS;
            }
            const nextLayout = buildLiveLayout(geometry, typography);
            if (layoutsDiffer(layoutRef.current, nextLayout)) layoutRef.current = nextLayout;
            const nextTitle = String(titleRef.current || DIRECTORY_TITLE);
            if (nextTitle !== currentTitle) {
                ns.ui.setTailTitle(nextTitle);
                currentTitle = nextTitle;
            }
        }
    }
    finally {
        controller.shutdown();
        service.shutdown();
        await service.flush();
        ns.ui.closeTail();
    }
}


