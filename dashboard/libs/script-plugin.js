import { formatRam } from "dashboard/libs/format-utils.js";
import {
    buildPluginIntegrationActions,
    buildPluginIntegrationInputs,
    getPluginIntegrationSections,
    getPluginIntegrationStateLines,
    isIntegrationScriptRunning,
} from "dashboard/libs/plugin-integration.js";

function findPluginScript(homeScripts, filename) {
    return (homeScripts ?? []).find((script) => script?.filename === filename) ?? {
        filename,
        label: filename.split("/").pop()?.replace(/\.js$/i, "") ?? filename,
        running: false,
        ramPerThread: 0,
        runningRam: 0,
        runningThreads: 0,
    };
}

export function buildScriptPluginService(plugin) {
    const filename = plugin?.filename ?? "";
    const integration = plugin?.metadata ?? {};
    const daemon = integration.daemon !== false;
    const menuLabel = plugin?.menuLabel || filename.split("/").pop()?.replace(/\.js$/i, "") || "Plugin";
    const configuredPanels = Array.isArray(integration.panels) ? integration.panels : [];
    const panels = configuredPanels.length > 0
        ? configuredPanels
        : [{ id: plugin?.defaultPanelId || "status", label: "Status", title: menuLabel }];
    const defaultPanelId = plugin?.defaultPanelId || panels[0]?.id || "status";
    const optionsPanelId = "options";
    const hasOptionsPanel = Object.keys(integration?.options ?? {}).length > 0
        || (Array.isArray(integration?.actions) && integration.actions.length > 0);
    const navigationPanels = [
        ...panels,
        ...(hasOptionsPanel ? [{ id: optionsPanelId, label: "Options" }] : []),
    ];

    return {
        id: plugin?.serviceId,
        menuGroup: plugin?.menuGroup || "automation",
        menuLabel,
        alwaysVisible: plugin?.alwaysVisible,
        rendererKey: plugin?.serviceId,
        defaultPanelId,
        subviews: navigationPanels.map(({ id, label }) => ({ id, label })),
        getPanels: () => navigationPanels.map(({ id, label }) => ({ id, label })),
        panelMeta: Object.fromEntries([
            ...panels.map(({ id, label, ...metadata }) => [
                id,
                { title: label || menuLabel, accent: "#6cb4ff", subtitle: "Plugin status and controls", ...metadata },
            ]),
            [optionsPanelId, { title: `${menuLabel} Options`, accent: "#6cb4ff", subtitle: "Script controls" }],
        ]),
        getHealth: ({ homeScripts }) => {
            const script = findPluginScript(homeScripts, filename);
            const level = script.running || !daemon ? "neutral" : "warn";
            const summary = script.running
                ? `${menuLabel} is running.`
                : daemon
                    ? `${menuLabel} is stopped.`
                    : `${menuLabel} runs on demand.`;
            return {
                level,
                summary,
                panels: Object.fromEntries(navigationPanels.map(({ id }) => [id, level])),
                panelSummaries: Object.fromEntries(navigationPanels.map(({ id }) => [id, summary])),
            };
        },
        getState: ({ selectedCenterPanel, homeScripts, options, telemetryByServiceId }) => {
            const script = findPluginScript(homeScripts, filename);
            const panelId = selectedCenterPanel || defaultPanelId;
            const isDefaultPanel = panelId === defaultPanelId;
            const telemetryLines = getPluginIntegrationStateLines(
                integration,
                telemetryByServiceId?.[integration.serviceId] ?? null,
                {
                    running: script.running,
                    panelId,
                    includeRunningLine: false,
                    configuredOptions: options,
                }
            ).filter((line) => line.label !== "Telemetry" || isDefaultPanel);
            return [
                { label: "Status", value: script.running ? "running" : "stopped", tone: script.running ? "success" : daemon ? "warn" : "neutral" },
                ...telemetryLines,
                ...(isDefaultPanel
                    ? [
                        { label: "Path", value: filename, tone: "neutral" },
                        { label: "RAM (1t)", value: formatRam(script.ramPerThread ?? 0), tone: "neutral" },
                        { label: "RAM (running)", value: formatRam(script.runningRam ?? 0), tone: script.running ? "info" : "neutral" },
                        { label: "Threads", value: `${script.runningThreads ?? 0}`, tone: "neutral" },
                    ]
                    : []),
            ];
        },
        getSections: ({ selectedCenterPanel, homeScripts, telemetryByServiceId }) => {
            if (selectedCenterPanel === optionsPanelId) return [];
            const script = findPluginScript(homeScripts, filename);
            return getPluginIntegrationSections(
                integration,
                telemetryByServiceId?.[integration.serviceId],
                selectedCenterPanel,
                { running: script.running, requiresRuntime: true }
            );
        },
        getInputs: ({ selectedCenterPanel, options }) => {
            if (selectedCenterPanel !== optionsPanelId) return [];
            return buildPluginIntegrationInputs(integration, options, null, {
                includeRanges: true,
                idPrefix: integration.serviceId,
            });
        },
        getActions: ({ selectedCenterPanel, homeScripts, options, telemetryByServiceId }) => {
            if (selectedCenterPanel !== optionsPanelId) return [];
            // Own scriptPath OR any managedScripts sibling - a merged integration's action buttons
            // (gang mode, territory warfare, share-home-ram, etc.) target whichever daemon actually
            // drains that command's port, which isn't necessarily this integration's own paired
            // script. See isIntegrationScriptRunning's own comment for the real bug this fixed.
            const runningFilenames = new Set((homeScripts ?? []).filter((s) => s?.running).map((s) => s.filename));
            const running = isIntegrationScriptRunning(integration, runningFilenames);
            return buildPluginIntegrationActions(
                { ...integration, commands: { ...integration.commands, actionKind: "plugin-command" } },
                options,
                telemetryByServiceId?.[integration.serviceId],
                {
                    running,
                    idPrefix: integration.serviceId,
                    iconBrackets: true,
                    startingOrder: 30,
                }
            ).map((action) => ({ ...action, serviceId: integration.serviceId }));
        },
    };
}
