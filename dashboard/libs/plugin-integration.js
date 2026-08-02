import { formatMoney, formatRam, formatSignedMoney } from "dashboard/libs/format-utils.js";

function getObject(value) {
    return value && typeof value === "object" ? /** @type {Record<string, any>} */ (value) : {};
}

function getTelemetryFieldValue(stats, key) {
    if (typeof key !== "string" || key.length === 0) return undefined;
    return key.split(".").reduce((value, segment) => {
        if (!value || typeof value !== "object" || !(segment in value)) return undefined;
        return value[segment];
    }, stats);
}

function setTelemetryFieldValue(target, key, value) {
    if (!target || typeof target !== "object" || typeof key !== "string" || key.length === 0) return;
    const segments = key.split(".");
    let current = target;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (!current[segment] || typeof current[segment] !== "object") {
            current[segment] = {};
        }
        current = current[segment];
    }
    current[segments[segments.length - 1]] = value;
}

function loadTelemetryJsonFile(ns, path) {
    if (!ns || typeof path !== "string" || !ns.fileExists(path, "home")) return null;
    try {
        const raw = ns.read(path);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
        return null;
    }
}

function formatTelemetryFieldValue(value, format) {
    if (format === "money") return formatMoney(Number(value) || 0);
    if (format === "signedMoney") return formatSignedMoney(Number(value) || 0);
    if (format === "ram") return formatRam(Number(value) || 0);
    if (format === "number") return (Number(value) || 0).toLocaleString();
    if (format === "time") return Number(value) > 0 ? new Date(Number(value)).toLocaleTimeString() : "n/a";
    if (format === "uppercase") return String(value).toUpperCase();
    if (format === "shortDurationText") {
        return String(value)
            .replace(/\bhours?\b/gi, "hrs")
            .replace(/\bminutes?\b/gi, "min");
    }
    return String(value);
}

function buildTelemetryLine(stats, field, format = field.format) {
    const value = getTelemetryFieldValue(stats, field.key);
    if (value === undefined) return null;

    const toneValue = typeof field.toneKey === "string"
        ? getTelemetryFieldValue(stats, field.toneKey)
        : value;
    const tone = field.tone === "warnWhenPositive"
        ? (Number(toneValue) > 0 ? "warn" : "success")
        : field.tone === "signed"
            ? (Number(toneValue) > 0 ? "success" : Number(toneValue) < 0 ? "danger" : "neutral")
            : field.tone ?? "neutral";
    return {
        label: field.label,
        value: formatTelemetryFieldValue(value, format),
        tone,
    };
}

function resolveOptionValue(definition, rawValue) {
    const fallback = definition.default;
    if (definition.type === "boolean") return Boolean(rawValue ?? fallback);
    if (definition.type === "integer") {
        const numeric = Math.floor(Number(rawValue));
        return Number.isFinite(numeric) && numeric >= (definition.min ?? 1) ? String(numeric) : String(fallback);
    }
    if (definition.type === "enum") {
        const value = String(rawValue ?? fallback);
        const normalized = definition.caseInsensitive ? value.toLowerCase() : value;
        const match = definition.values.find((candidate) => {
            return definition.caseInsensitive
                ? String(candidate).toLowerCase() === normalized
                : String(candidate) === normalized;
        });
        return match ?? fallback;
    }
    return rawValue ?? fallback;
}

export function getPluginIntegrationDefaultOptions(integration) {
    const defaults = {};
    for (const [optionKey, definition] of Object.entries(getObject(integration?.options))) {
        defaults[optionKey] = getObject(definition).default;
    }
    return defaults;
}

export function normalizePluginIntegrationOptions(integration, rawOptions = {}) {
    const normalized = {};
    const source = getObject(rawOptions);
    for (const [optionKey, rawDefinition] of Object.entries(getObject(integration?.options))) {
        const definition = getObject(rawDefinition);
        normalized[optionKey] = resolveOptionValue(definition, source[optionKey]);
    }
    return normalized;
}

export function arePluginIntegrationOptionsEqual(integration, leftOptions, rightOptions) {
    const left = normalizePluginIntegrationOptions(integration, leftOptions);
    const right = normalizePluginIntegrationOptions(integration, rightOptions);
    return Object.keys(getObject(integration?.options)).every((optionKey) => left[optionKey] === right[optionKey]);
}

export function shouldStartPluginIntegrationAfterOptionChange(integration, previousOptions, currentOptions) {
    const optionKeys = integration?.lifecycle?.startOnOptionIncrease;
    if (!Array.isArray(optionKeys) || optionKeys.length === 0) return false;

    const previous = normalizePluginIntegrationOptions(integration, previousOptions);
    const current = normalizePluginIntegrationOptions(integration, currentOptions);
    return optionKeys.some((optionKey) => {
        if (typeof optionKey !== "string" || !(optionKey in previous) || !(optionKey in current)) return false;
        const previousValue = Number(previous[optionKey]);
        const currentValue = Number(current[optionKey]);
        return Number.isFinite(previousValue) && Number.isFinite(currentValue) && currentValue > previousValue;
    });
}

export function loadPluginIntegrationStats(ns, integration) {
    if (!ns) return null;
    const telemetry = getObject(integration?.telemetry);
    const stats = {};
    let loaded = false;

    const primary = loadTelemetryJsonFile(ns, telemetry.path);
    if (primary) {
        Object.assign(stats, primary);
        loaded = true;
    }

    const additionalSources = Array.isArray(telemetry.sources) ? telemetry.sources : [];
    for (const rawSource of additionalSources) {
        const source = getObject(rawSource);
        const sourceStats = loadTelemetryJsonFile(ns, source.path);
        if (!sourceStats) continue;
        const sourceValue = typeof source.sourceKey === "string"
            ? getTelemetryFieldValue(sourceStats, source.sourceKey)
            : sourceStats;
        if (sourceValue === undefined) continue;

        if (typeof source.targetKey === "string" && source.targetKey.length > 0) {
            setTelemetryFieldValue(stats, source.targetKey, sourceValue);
        } else if (sourceValue && typeof sourceValue === "object") {
            Object.assign(stats, sourceValue);
        }
        loaded = true;
    }

    return loaded ? stats : null;
}

export function applyPluginIntegrationOptions(ns, integration, rawOptions, logAction) {
    if (!ns) return;

    const scriptPath = integration?.scriptPath;
    const displayName = integration?.menuLabel ?? "Plugin";
    if (typeof scriptPath !== "string" || !ns.scriptRunning(scriptPath, "home")) {
        if (typeof logAction === "function") {
            logAction("warning", `${displayName} is not running; start it before applying options.`);
        }
        return;
    }

    const options = normalizePluginIntegrationOptions(integration, rawOptions);
    const commandMetadata = getObject(integration?.commands);
    const port = Number(commandMetadata.port);
    if (!Number.isFinite(port)) return;

    for (const command of commandMetadata.beforeApply ?? []) ns.writePort(port, command);
    for (const binding of commandMetadata.optionBindings ?? []) {
        const optionKey = binding?.optionKey;
        if (typeof optionKey !== "string" || !(optionKey in options)) continue;
        const value = binding.trueValue && binding.falseValue
            ? (options[optionKey] ? binding.trueValue : binding.falseValue)
            : `${binding.prefix ?? ""}${options[optionKey]}`;
        ns.writePort(port, value);
    }

    if (typeof logAction === "function") {
        const summary = (commandMetadata.summaryOptions ?? [])
            .map((optionKey) => `${optionKey}=${options[optionKey]}`)
            .join(", ");
        logAction("success", `Applied ${displayName} options${summary ? `: ${summary}.` : "."}`);
    }
}

export function applyPluginIntegrationCommand(ns, integration, command, logAction) {
    if (!ns || typeof command !== "string" || command.length === 0) return;
    const scriptPath = integration?.scriptPath;
    const displayName = integration?.menuLabel ?? "Plugin";
    const commandMetadata = getObject(integration?.commands);
    const requiresRuntime = commandMetadata.requiresRuntime !== false;
    if (requiresRuntime && (typeof scriptPath !== "string" || !ns.scriptRunning(scriptPath, "home"))) {
        if (typeof logAction === "function") logAction("warning", `${displayName} is not running; start it before sending commands.`);
        return;
    }

    const port = Number(commandMetadata.port);
    if (!Number.isFinite(port)) return;
    for (const prefixCommand of commandMetadata.beforeAction ?? []) ns.writePort(port, prefixCommand);
    ns.writePort(port, command);
}

function isLocked(metadata, stats) {
    const lock = getObject(metadata?.lock);
    return Boolean(stats[lock.flag]) || (lock.key && stats[lock.key] === lock.value);
}

export function buildPluginIntegrationInputs(integration, options = {}, stats = null, context = {}) {
    const safeOptions = getObject(options);
    const safeStats = getObject(stats);
    const locked = isLocked(integration, safeStats);
    const idPrefix = context.idPrefix ?? integration?.id ?? "plugin";

    return (integration?.inputs ?? []).map((rawInput) => {
        const input = getObject(rawInput);
        const optionKey = input.optionKey;
        const minimum = Math.max(1, Math.floor(Number(input.min) || 1));
        const fallbackMaximum = Math.max(minimum, Math.floor(Number(safeOptions[optionKey]) || minimum));
        const statsMaximum = Math.floor(Number(safeStats[input.maximumStatsKey]));
        const configuredMaximum = Math.floor(Number(input.max));
        const hasDynamicMaximum = typeof input.maximumStatsKey === "string";
        const maximum = Number.isFinite(statsMaximum) && statsMaximum >= minimum
            ? statsMaximum
            : Number.isFinite(configuredMaximum) && configuredMaximum >= minimum
                ? configuredMaximum
                : hasDynamicMaximum
                    ? fallbackMaximum
                    : null;
        const rawValue = safeOptions[optionKey];
        const numericValue = String(rawValue).toLowerCase() === "max"
            ? (maximum ?? fallbackMaximum)
            : Math.max(minimum, maximum === null
                ? Math.floor(Number(rawValue) || minimum)
                : Math.min(maximum, Math.floor(Number(rawValue) || maximum)));
        const inputLocked = locked && input.lockWhenIntegrationLocked;
        const lockSuffix = inputLocked ? " (LOCKED)" : "";
        const label = input.showRange && context.includeRanges
            ? `${input.label} (1-${maximum})${lockSuffix}`
            : `${input.label}${lockSuffix}`;
        return {
            id: `${idPrefix}-${input.id}`,
            label,
            optionKey,
            type: input.type,
            value: inputLocked ? (input.lockedValue === "maximum" ? maximum : input.lockedValue) : (input.type === "number" ? numericValue : rawValue),
            ...(Array.isArray(input.values) ? { options: input.values } : {}),
            ...(input.type === "number" ? { min: minimum, ...(maximum === null ? {} : { max: maximum }) } : {}),
            disabled: Boolean(inputLocked),
        };
    });
}

export function buildPluginIntegrationActions(integration, options = {}, stats = null, context = {}) {
    const safeOptions = getObject(options);
    const safeStats = getObject(stats);
    const locked = isLocked(integration, safeStats);
    const idPrefix = context.idPrefix ?? integration?.id ?? "plugin";
    const running = Boolean(context.running);
    const icon = (value) => (context.iconBrackets ? `[${value}]` : value);
    const startingOrder = Number(context.startingOrder) || 0;

    return (integration?.actions ?? []).map((rawAction, index) => {
        const action = getObject(rawAction);
        const statsStateValue = typeof action.stateKey === "string"
            ? getTelemetryFieldValue(safeStats, action.stateKey)
            : undefined;
        const stateValue = statsStateValue ?? safeOptions[action.optionKey] ?? action.defaultValue;
        const variant = getObject(action.variants)?.[String(stateValue)];
        const enabled = action.activeValue !== undefined
            ? String(stateValue) === String(action.activeValue)
            : Boolean(stateValue);
        const requiresRuntime = action.requiresRuntime !== false && integration?.commands?.requiresRuntime !== false;
        return {
            id: `${idPrefix}-${action.id}`,
            label: variant?.label ?? action.label,
            icon: icon(action.icon ?? ""),
            tone: variant?.tone ?? (enabled
                ? action.activeTone ?? action.enabledTone ?? "success"
                : action.inactiveTone ?? action.disabledTone ?? "danger"),
            kind: integration?.commands?.actionKind ?? "plugin-command",
            command: action.command ?? variant?.command ?? (enabled ? action.disableCommand : action.enableCommand),
            disabled: Boolean((requiresRuntime && !running) || (locked && action.lockWhenIntegrationLocked)),
            order: startingOrder + (Number(action.order) || index * 10),
        };
    });
}

export function getPluginIntegrationStateLines(integration, stats, options = {}) {
    const running = Boolean(options.running);
    const daemon = integration?.daemon !== false;
    const panelId = options.panelId;
    const lines = [];
    if (options.includeIntegrationLine) {
        lines.push({ label: "Integration", value: integration?.integrationLabel ?? integration?.displayName, tone: "info" });
    }
    if (options.includeRunningLine !== false) {
        lines.push({ label: "Bot Status", value: running ? "running" : "stopped", tone: running ? "success" : daemon ? "warn" : "neutral" });
    }

    const configuredOptions = getObject(options.configuredOptions);
    for (const field of integration?.status?.optionFields ?? []) {
        if (typeof field?.key !== "string" || !(field.key in configuredOptions)) continue;
        lines.push({ label: field.label, value: String(configuredOptions[field.key]), tone: field.tone ?? "neutral" });
    }

    if (!stats || typeof stats !== "object") {
        lines.push({ label: "Telemetry", value: `${integration?.telemetry?.path} not found`, tone: "warn" });
        return lines;
    }

    let hasKnownStats = false;
    const fields = (integration?.telemetry?.fields ?? []).filter((field) => {
        return typeof field?.panelId !== "string" || typeof panelId !== "string" || field.panelId === panelId;
    });
    for (const field of fields) {
        const line = buildTelemetryLine(stats, field);
        if (!line) continue;
        hasKnownStats = true;
        lines.push(line);
    }
    if (!hasKnownStats) lines.push({ label: "Telemetry", value: "Stats file loaded (no known keys)", tone: "neutral" });
    return lines;
}

export function getPluginIntegrationOverviewLines(integration, stats) {
    if (!stats || typeof stats !== "object") return [];

    return (integration?.telemetry?.fields ?? [])
        .filter((field) => field?.overview === true)
        .sort((left, right) => (Number(left?.overviewOrder) || 0) - (Number(right?.overviewOrder) || 0))
        .map((field) => {
            const overviewField = typeof field.overviewValueKey === "string"
                ? { ...field, key: field.overviewValueKey }
                : field;
            const line = buildTelemetryLine(stats, overviewField, field.overviewFormat ?? field.format);
            return line ? {
                ...line,
                label: field.overviewLabel ?? line.label,
                tone: field.overviewTone ?? line.tone,
                key: field.key,
                order: Number(field.overviewOrder) || 0,
            } : null;
        })
        .filter(Boolean);
}

export function getPluginIntegrationOverviewGauges(integration, stats) {
    const safeStats = getObject(stats);
    return (integration?.telemetry?.overviewGauges ?? [])
        .filter((gauge) => gauge && typeof gauge === "object" && typeof gauge.label === "string")
        .map((gauge, index) => {
            const used = Math.max(0, Number(getTelemetryFieldValue(safeStats, gauge.usedKey)) || 0);
            const total = Math.max(0, Number(getTelemetryFieldValue(safeStats, gauge.totalKey)) || 0);
            const configuredRatio = Number(getTelemetryFieldValue(safeStats, gauge.ratioKey));
            const ratio = Number.isFinite(configuredRatio) && configuredRatio >= 0
                ? configuredRatio
                : total > 0
                    ? used / total
                    : 0;
            return {
                key: typeof gauge.id === "string" ? gauge.id : `${integration?.serviceId ?? "plugin"}:${index}`,
                label: gauge.label,
                shortLabel: typeof gauge.shortLabel === "string" ? gauge.shortLabel : gauge.label,
                used,
                total,
                ratio,
                valueFormat: gauge.valueFormat ?? "number",
                order: Number(gauge.order) || 0,
            };
        })
        .sort((left, right) => left.order - right.order);
}

export function getPluginIntegrationSections(integration, stats, panelId) {
    const safeStats = getObject(stats);
    return (integration?.telemetry?.sections ?? [])
        .filter((section) => typeof section?.panelId !== "string" || section.panelId === panelId)
        .map((section) => {
            const source = getTelemetryFieldValue(safeStats, section.sourceKey);
            if (section.type === "graph") {
                return {
                    ...section,
                    data: Array.isArray(source) ? source : [],
                };
            }
            return {
                ...section,
                items: Array.isArray(source) ? source : [],
            };
        });
}

export function getPluginIntegrationGraphs(integration, stats) {
    const safeStats = getObject(stats);
    return (integration?.telemetry?.sections ?? [])
        .filter((section) => section?.type === "graph")
        .map((section) => {
            const source = getTelemetryFieldValue(safeStats, section.sourceKey);
            return {
                ...section,
                data: Array.isArray(source) ? source : [],
            };
        });
}

export function buildPluginIntegrationService(plugin) {
    const integration = getObject(plugin?.metadata);
    const daemon = integration.daemon !== false;
    const panels = Array.isArray(integration.panels) ? integration.panels : [];
    const defaultPanelId = integration.defaultPanelId ?? panels[0]?.id ?? "status";
    const optionsPanelId = "options";
    return {
        id: integration.serviceId,
        menuGroup: integration.menuGroup,
        menuLabel: integration.menuLabel,
        alwaysVisible: integration.alwaysVisible,
        rendererKey: "plugin.metadata",
        defaultPanelId,
        subviews: panels.map(({ id, label }) => ({ id, label })),
        getPanels: () => [
            ...panels.map(({ id, label }) => ({ id, label })),
            ...(Object.keys(getObject(integration.options)).length > 0 ? [{ id: optionsPanelId, label: "Options" }] : []),
        ],
        panelMeta: Object.fromEntries([
            ...panels.map(({ id, label, ...metadata }) => [id, { title: label, ...metadata }]),
            [optionsPanelId, { title: `${integration.menuLabel} Options`, accent: "#6cb4ff", subtitle: "Script controls" }],
        ]),
        getHealth: ({ homeScripts, telemetryByServiceId }) => {
            const running = (homeScripts ?? []).some((script) => script?.filename === integration.scriptPath && script?.running);
            const stats = telemetryByServiceId?.[integration.serviceId] ?? null;
            const telemetryLines = getPluginIntegrationStateLines(integration, stats, { running });
            const telemetryReady = telemetryLines.some((line) => line.label !== "Bot Status" && line.label !== "Telemetry");
            const summary = running
                ? `${integration.menuLabel} is running${telemetryReady ? " with telemetry" : " (telemetry pending)"}.`
                : daemon
                    ? `${integration.menuLabel} is stopped.`
                    : `${integration.menuLabel} runs on demand.`;
            const level = running || !daemon ? "neutral" : "warn";
            return {
                level,
                summary,
                panels: Object.fromEntries(panels.map(({ id }) => [id, level])),
                panelSummaries: Object.fromEntries(panels.map(({ id }) => [id, summary])),
            };
        },
        getState: ({ selectedCenterPanel, homeScripts, telemetryByServiceId }) => {
            if (selectedCenterPanel === optionsPanelId) return [];
            const running = (homeScripts ?? []).some((script) => script?.filename === integration.scriptPath && script?.running);
            return getPluginIntegrationStateLines(integration, telemetryByServiceId?.[integration.serviceId] ?? null, {
                running,
                panelId: selectedCenterPanel,
            });
        },
        getSections: ({ selectedCenterPanel, telemetryByServiceId }) => {
            if (selectedCenterPanel === optionsPanelId) return [];
            return getPluginIntegrationSections(
                integration,
                telemetryByServiceId?.[integration.serviceId],
                selectedCenterPanel
            );
        },
        getInputs: ({ selectedCenterPanel, options, telemetryByServiceId }) => {
            if (selectedCenterPanel !== optionsPanelId) return [];
            return buildPluginIntegrationInputs(integration, options, telemetryByServiceId?.[integration.serviceId], { includeRanges: true, idPrefix: integration.serviceId });
        },
        getActions: ({ selectedCenterPanel, homeScripts, options, telemetryByServiceId }) => {
            if (selectedCenterPanel !== optionsPanelId) return [];
            const running = (homeScripts ?? []).some((script) => script?.filename === integration.scriptPath && script?.running);
            return buildPluginIntegrationActions({ ...integration, commands: { ...integration.commands, actionKind: "plugin-command" } }, options, telemetryByServiceId?.[integration.serviceId], {
                running,
                idPrefix: integration.serviceId,
                iconBrackets: true,
                startingOrder: 30,
            }).map((action) => ({ ...action, serviceId: integration.serviceId }));
        },
    };
}
