import { parseDashboardMetadataFromSource } from "dashboard/libs/metadata-parser.js";

const DASHBOARD_SCRIPT_METADATA_DECLARATION = "export const DASHBOARD_SCRIPT_METADATA =";
const SCRIPT_METADATA_CACHE_MS = 5000;
const scriptMetadataCache = new Map();

export function loadDashboardScriptMetadata(ns, filename) {
    if (!ns || typeof filename !== "string" || filename.length === 0) return null;
    const now = Date.now();
    const cached = scriptMetadataCache.get(filename);
    if (cached && now - cached.scannedAt < SCRIPT_METADATA_CACHE_MS) return cached.metadata;

    let metadata = null;
    try {
        const sourceText = ns.read(filename);
        const parsed = parseDashboardMetadataFromSource(sourceText, DASHBOARD_SCRIPT_METADATA_DECLARATION);
        if (typeof parsed?.daemon === "boolean") metadata = { daemon: parsed.daemon };
    } catch (e) {
        metadata = null;
    }

    scriptMetadataCache.set(filename, { metadata, scannedAt: now });
    return metadata;
}

export function getScriptLifecycleLabel(script) {
    if (script?.daemon === true) return "Daemon";
    if (script?.daemon === false) return "On-demand";
    return "Unspecified";
}

export function splitScriptPanels(panels = []) {
    return {
        runningPanels: panels.filter((panel) => panel.running),
        stoppedPanels: panels.filter((panel) => !panel.running),
    };
}

export function summarizeScriptListHealth(homeScripts = []) {
    const panels = {};
    const panelSummaries = {};
    let runningCount = 0;
    let stoppedCount = 0;

    for (const script of homeScripts) {
        panels[script.id] = "neutral";
        panelSummaries[script.id] = script.running ? "Script is running." : "Script is stopped.";
        if (script.running) runningCount++;
        else stoppedCount++;
    }

    const totalCount = runningCount + stoppedCount;
    const summary = totalCount > 0
        ? `${runningCount} running, ${stoppedCount} stopped, ${totalCount} total.`
        : "No scripts found.";

    return {
        level: "neutral",
        summary,
        panels,
        panelSummaries,
        counts: {
            running: runningCount,
            stopped: stoppedCount,
            total: totalCount,
        },
    };
}

export function resolveSelectedScriptPanel(panelId, homeScripts = []) {
    if (panelId === "") return null;
    return homeScripts.find((script) => script.id === panelId) ?? homeScripts[0] ?? null;
}

export function resolveSelectedCenterPanel({ selectedItem, centerPanels = [], savedCenterPanel, defaultCenterPanel }) {
    if (centerPanels.some((panel) => panel.id === savedCenterPanel)) {
        return savedCenterPanel;
    }

    if ((selectedItem === "global.options" || selectedItem === "global.plugins") && savedCenterPanel === "") {
        return "";
    }

    return defaultCenterPanel;
}

export function getScriptListDetailEmptyMessage(homeScripts = []) {
    return homeScripts.length === 0
        ? "No .js or .jsx scripts were found on home."
        : "Select a script from the Scripts list to view details.";
}
