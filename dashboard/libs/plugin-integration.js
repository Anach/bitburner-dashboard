import { formatMoney, formatRam, formatRelativeAge, formatSignedMoney } from "dashboard/libs/format-utils.js";
import { TELEMETRY_FRESHNESS_STATES, getTelemetryFreshnessState } from "dashboard/libs/telemetry-freshness.js";

// A persistent worker briefly between relaunches ("owner-stopped") or a one-shot that simply
// finished or was turned off ("completed"/"cancelled") is expected, not a problem - only the
// remaining statuses mean a declared network child isn't doing its job while its parent runs fine.
export const NETWORK_CHILD_HEALTHY_STATUSES = new Set(["running", "completed", "cancelled", "owner-stopped"]);

export function getNetworkChildScriptStatus(scriptPath, networkChildStatus) {
    if (typeof scriptPath !== "string" || !scriptPath) return null;
    const children = networkChildStatus?.children;
    if (!children || typeof children !== "object") return null;
    const entry = Object.values(children).find((candidate) => candidate?.script === scriptPath);
    if (!entry) return null;
    return {
        healthy: NETWORK_CHILD_HEALTHY_STATUSES.has(entry.status),
        label: entry.label ?? scriptPath,
        detail: entry.detail ?? entry.status,
    };
}

// "Warn" requires positive evidence of a problem - a script with no Home process AND no network-child
// status entry at all is treated as neutral, not warn. Absence is the common, benign case (the
// feature's own option is simply off and it has never published a request), not evidence of failure;
// a real problem always leaves behind a status entry (waiting-for-ram/missing/etc.), while an
// intentional off-switch leaves a "cancelled" entry, already in the healthy allowlist above. Accepts
// an array so one panel/service can be backed by more than one child script.
export function getScriptGroupHealth(scripts, homeScripts, networkChildStatus) {
    const problems = [];
    for (const scriptPath of Array.isArray(scripts) ? scripts : []) {
        if (typeof scriptPath !== "string" || !scriptPath) continue;
        const runningOnHome = (homeScripts ?? []).some((script) => script?.filename === scriptPath && script?.running);
        if (runningOnHome) continue;
        const netStatus = getNetworkChildScriptStatus(scriptPath, networkChildStatus);
        if (!netStatus || netStatus.healthy) continue;
        problems.push(`${netStatus.label}: ${netStatus.detail}`);
    }
    return problems.length > 0
        ? { level: "warn", summary: problems.slice(0, 2).join("; ") }
        : { level: "neutral", summary: "" };
}

const telemetryJsonCache = new Map();
const integrationStatsCache = new WeakMap();
// Default freshness window for a labeled `sources[]` entry (see loadPluginIntegrationStats /
// getTelemetrySourceFreshness) - overridable per-source via that entry's own `staleAfterMs`.
const DEFAULT_SOURCE_STALE_AFTER_MS = 30000;
// Keyed by serviceId (a stable string), not the integration object itself - the object reference
// changes every time the service registry regenerates (every 5s), but we need this to remember
// the last-toasted summary for the life of the whole running script.
const lastAppliedOptionsSummaries = new Map();

function getObject(value) {
    return value && typeof value === "object" ? /** @type {Record<string, any>} */ (value) : {};
}

/** An enum option's optional display-label map: plain value -> shown text, strings both sides. */
export function isOptionLabelMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.entries(value);
    return entries.length > 0 && entries.every(([key, label]) => (
        typeof key === "string" && key.length > 0 && typeof label === "string" && label.length > 0
    ));
}

function isOptionControlledEntryVisible(entry, integration, configuredOptions) {
    const visibleOptionKey = typeof entry?.visibleOptionKey === "string" ? entry.visibleOptionKey : "";
    if (!visibleOptionKey) return true;
    const optionDefinition = getObject(getObject(integration?.options)[visibleOptionKey]);
    const currentValue = configuredOptions[visibleOptionKey] ?? optionDefinition.default ?? true;
    if (Object.prototype.hasOwnProperty.call(entry, "visibleOptionValue")) {
        return String(currentValue) === String(entry.visibleOptionValue);
    }
    return Boolean(currentValue);
}

// A merged integration's option-carrying siblings (faction-manager-gangs.js, faction-manager-boost.js,
// server-manager-cloud.js, hacking-ops-beginner.js, etc.) can be autostarted and running entirely on
// their own, independent of whether the integration's own paired script (scriptPath) is running -
// confirmed real: with "progression.factions" autostart disabled but faction-gangs.js's own
// autostart left on, every option send for this integration silently no-op'd forever (checks that
// only looked at scriptPath), so a changed value could never reach the gang daemon. Checking
// managedScripts too means delivery/enablement still works as long as anything that consumes it is
// actually alive.
export function isIntegrationScriptRunning(integration, runningFilenames) {
    if (!integration || !(runningFilenames instanceof Set)) return false;
    if (typeof integration.scriptPath === "string" && runningFilenames.has(integration.scriptPath)) return true;
    const managedScripts = Array.isArray(integration.managedScripts) ? integration.managedScripts : [];
    return managedScripts.some((filename) => runningFilenames.has(filename));
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
    let raw = "";
    try {
        raw = ns.read(path);
        if (!raw) return null;
        const cached = telemetryJsonCache.get(path);
        if (cached?.raw === raw) return cached.value;
        const parsed = JSON.parse(raw);
        const value = parsed && typeof parsed === "object" ? parsed : null;
        telemetryJsonCache.set(path, { raw, value });
        return value;
    } catch (error) {
        if (raw) telemetryJsonCache.set(path, { raw, value: null });
        return null;
    }
}

export function formatTelemetryFieldValue(value, format) {
    if (format === "money") return formatMoney(Number(value) || 0);
    if (format === "signedMoney") return formatSignedMoney(Number(value) || 0);
    if (format === "ram") return formatRam(Number(value) || 0);
    if (format === "number") return (Number(value) || 0).toLocaleString();
    if (format === "time") return Number(value) > 0 ? new Date(Number(value)).toLocaleTimeString() : "n/a";
    if (format === "uppercase") return String(value).toUpperCase();
    if (format === "shortDurationText") {
        // Covers every unit formatDuration can emit - it escalates past hours into days and years
        // for long-range ETAs, and the overview stat bar is too narrow to spell those out.
        return String(value)
            .replace(/\byears?\b/gi, "yr")
            .replace(/\bdays?\b/gi, "d")
            .replace(/\bhours?\b/gi, "hrs")
            .replace(/\bminutes?\b/gi, "min");
    }
    return String(value);
}

export function buildPluginIntegrationTelemetryLine(stats, field, format) {
    if (!field || typeof field !== "object" || typeof field.key !== "string" || typeof field.label !== "string") {
        return null;
    }
    const value = getTelemetryFieldValue(stats, field.key);
    if (value === undefined) {
        if (field?.emptyValue === undefined) return null;
        return {
            label: field.label,
            value: String(field.emptyValue),
            tone: field.emptyTone ?? "neutral",
        };
    }

    const toneValue = typeof field.toneKey === "string"
        ? getTelemetryFieldValue(stats, field.toneKey)
        : value;
    const tone = field.tone === "warnWhenPositive"
        ? (Number(toneValue) > 0 ? "warn" : "success")
        : field.tone === "signed"
            ? (Number(toneValue) > 0 ? "success" : Number(toneValue) < 0 ? "danger" : "neutral")
            // A *Worker.status/*WorkerStatus field mirrors a network-child-supervisor status string
            // verbatim (see NETWORK_CHILD_HEALTHY_STATUSES) - color it by what that value actually
            // means instead of a fixed tone, so a blocked worker (waiting-for-ram/missing/etc.)
            // stands out in yellow right in the status text, not just on the badge/tooltip.
            : field.tone === "networkChildStatus"
                ? (String(toneValue) === "running"
                    ? "success"
                    : NETWORK_CHILD_HEALTHY_STATUSES.has(String(toneValue)) ? "neutral" : "warn")
                : field.tone ?? "neutral";
    return {
        label: field.label,
        value: formatTelemetryFieldValue(value, format ?? field.format),
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
    const sourceValues = [];
    // One entry per labeled `sources[]` entry (see getTelemetrySourceFreshness) - deliberately
    // just the facts (which key, whose label, when that source last wrote, how stale is too
    // stale), not a computed "is it stale right now" boolean. That boolean depends on Date.now(),
    // and this whole stats object gets cached below keyed on raw source content - baking a
    // time-sensitive value into a content-keyed cache would freeze it at whatever was true the
    // moment the cache was last actually populated, never re-evaluating once a source's content
    // (and therefore this cache) stops changing, which is exactly the "stopped" case this exists
    // to detect. The actual staleness check happens at render time in getTelemetrySourceFreshness.
    const sourceMeta = [];
    let loaded = false;

    const primary = loadTelemetryJsonFile(ns, telemetry.path);
    sourceValues.push(primary);
    if (primary) {
        Object.assign(stats, primary);
        loaded = true;
    }

    const additionalSources = Array.isArray(telemetry.sources) ? telemetry.sources : [];
    for (const rawSource of additionalSources) {
        const source = getObject(rawSource);
        const sourceStats = loadTelemetryJsonFile(ns, source.path);
        sourceValues.push(sourceStats);
        if (!sourceStats) continue;
        const sourceValue = typeof source.sourceKey === "string"
            ? getTelemetryFieldValue(sourceStats, source.sourceKey)
            : sourceStats;
        if (sourceValue === undefined) continue;

        if (typeof source.targetKey === "string" && source.targetKey.length > 0) {
            setTelemetryFieldValue(stats, source.targetKey, sourceValue);
            // `label` is opt-in - a source with no label is unattributed plumbing (the merged-in
            // data is treated as if it were this integration's own, same as before this existed).
            if (typeof source.label === "string" && source.label.length > 0) {
                sourceMeta.push({
                    targetKey: source.targetKey,
                    label: source.label,
                    // generatedAt comes from the *whole* parsed source file, not sourceValue - a
                    // sourceKey extraction (e.g. "servers") can slice away a sibling top-level
                    // generatedAt field, so this must be read before that slicing.
                    generatedAt: Number(sourceStats.generatedAt) || 0,
                    staleAfterMs: Number.isFinite(Number(source.staleAfterMs)) && Number(source.staleAfterMs) > 0
                        ? Number(source.staleAfterMs)
                        : DEFAULT_SOURCE_STALE_AFTER_MS,
                });
            }
        } else if (sourceValue && typeof sourceValue === "object") {
            Object.assign(stats, sourceValue);
        }
        loaded = true;
    }

    const value = loaded ? stats : null;
    if (value && sourceMeta.length > 0) {
        value.__sourceMeta = sourceMeta;
    }
    if (!integration || typeof integration !== "object") return value;
    const cached = integrationStatsCache.get(integration);
    if (cached
        && cached.sources.length === sourceValues.length
        && cached.sources.every((sourceValue, index) => sourceValue === sourceValues[index])) {
        return cached.value;
    }
    integrationStatsCache.set(integration, { sources: sourceValues, value });
    return value;
}

// Resolves whether a specific telemetry key (e.g. "economics.ram.used") was populated via a
// labeled `sources[]` entry, and if so, that source's own freshness - independent of whether the
// *owning* integration's own script is currently running. This is what lets a merged field go
// "offline" on its own schedule when its actual backing service stops, rather than only ever
// reflecting whatever script happens to own the panel it's displayed in.
export function getTelemetrySourceFreshness(stats, key) {
    const sourceMeta = Array.isArray(stats?.__sourceMeta) ? stats.__sourceMeta : [];
    if (sourceMeta.length === 0 || typeof key !== "string") return null;
    const meta = sourceMeta.find((entry) => key === entry.targetKey || key.startsWith(`${entry.targetKey}.`));
    if (!meta) return null;

    const fresh = meta.generatedAt > 0 && (Date.now() - meta.generatedAt) <= meta.staleAfterMs;
    const state = getTelemetryFreshnessState({ hasStats: true, requiresRuntime: true, running: fresh });
    const ageText = state === TELEMETRY_FRESHNESS_STATES.STALE && meta.generatedAt > 0
        ? formatRelativeAge(Date.now() - meta.generatedAt)
        : null;
    return { sourceLabel: meta.label, state, ageText, offline: state === TELEMETRY_FRESHNESS_STATES.STALE };
}

export function applyPluginIntegrationOptions(ns, integration, rawOptions, logAction, context = {}) {
    if (!ns) return;

    const scriptPath = integration?.scriptPath;
    const displayName = integration?.menuLabel ?? "Plugin";
    if (typeof scriptPath !== "string" || context.running !== true) {
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
        // Per-binding override for an integration whose merged components each still run their
        // own independent command-drain loop on their own port (only one script can safely drain
        // a given port - see SCRIPTS_OPTIMIZATION_PLAN.md's Server Buyer merge). Falls back to the
        // integration's single default port when absent, unchanged for every integration that
        // doesn't need this.
        const bindingPort = Number.isFinite(Number(binding.port)) ? Number(binding.port) : port;
        ns.writePort(bindingPort, value);
    }

    // The port writes above always happen - a freshly (re)started script has no memory of prior
    // port commands and must be re-primed every time. But it's the same options every routine
    // (re)start, so only toast when the values actually differ from what was last applied,
    // not every time a script happens to (re)start with unchanged settings.
    const summary = (commandMetadata.summaryOptions ?? [])
        .map((optionKey) => `${optionKey}=${options[optionKey]}`)
        .join(", ");
    const serviceId = integration?.serviceId;
    const changed = typeof serviceId !== "string" || lastAppliedOptionsSummaries.get(serviceId) !== summary;
    if (typeof serviceId === "string") lastAppliedOptionsSummaries.set(serviceId, summary);

    if (changed && typeof logAction === "function") {
        logAction("success", `Applied ${displayName} options${summary ? `: ${summary}.` : "."}`);
    }
}

export function applyPluginIntegrationCommand(ns, integration, command, logAction, context = {}) {
    if (!ns || typeof command !== "string" || command.length === 0) return;
    const scriptPath = integration?.scriptPath;
    const displayName = integration?.menuLabel ?? "Plugin";
    const commandMetadata = getObject(integration?.commands);
    const requiresRuntime = commandMetadata.requiresRuntime !== false;
    if (requiresRuntime && (typeof scriptPath !== "string" || context.running !== true)) {
        if (typeof logAction === "function") logAction("warning", `${displayName} is not running; start it before sending commands.`);
        return;
    }

    // Per-action override (see buildPluginIntegrationActions) for an integration whose merged
    // components each still run their own independent command-drain loop on their own port.
    const port = Number.isFinite(Number(context.port)) ? Number(context.port) : Number(commandMetadata.port);
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

    return (integration?.inputs ?? []).filter(
        (rawInput) => isOptionControlledEntryVisible(rawInput, integration, safeOptions),
    ).map((rawInput) => {
        const input = getObject(rawInput);
        const optionKey = input.optionKey;
        const optionDefinition = getObject(getObject(integration?.options)[optionKey]);
        const integerInput = optionDefinition.type === "integer";
        const normalizeNumeric = (value) => integerInput ? Math.floor(value) : value;
        const configuredMinimum = Number(input.min);
        const minimum = Number.isFinite(configuredMinimum)
            ? (integerInput ? Math.ceil(configuredMinimum) : configuredMinimum)
            : (integerInput ? 1 : 0);
        const configuredStep = Number(input.step);
        const step = Number.isFinite(configuredStep) && configuredStep > 0
            ? configuredStep
            : integerInput ? 1 : "any";
        const currentOptionValue = Number(safeOptions[optionKey]);
        const fallbackMaximum = Math.max(
            minimum,
            Number.isFinite(currentOptionValue) ? normalizeNumeric(currentOptionValue) : minimum
        );
        const rawStatsMaximum = Number(safeStats[input.maximumStatsKey]);
        const statsMaximum = Number.isFinite(rawStatsMaximum) ? normalizeNumeric(rawStatsMaximum) : NaN;
        const rawConfiguredMaximum = Number(input.max);
        const configuredMaximum = Number.isFinite(rawConfiguredMaximum) ? normalizeNumeric(rawConfiguredMaximum) : NaN;
        const hasDynamicMaximum = typeof input.maximumStatsKey === "string";
        const maximum = Number.isFinite(statsMaximum) && statsMaximum >= minimum
            ? statsMaximum
            : Number.isFinite(configuredMaximum) && configuredMaximum >= minimum
                ? configuredMaximum
                : hasDynamicMaximum
                    ? fallbackMaximum
                    : null;
        const rawValue = safeOptions[optionKey];
        const parsedValue = Number(rawValue);
        const fallbackValue = maximum ?? minimum;
        const normalizedValue = Number.isFinite(parsedValue) ? normalizeNumeric(parsedValue) : fallbackValue;
        const numericValue = String(rawValue).toLowerCase() === "max"
            ? (maximum ?? fallbackMaximum)
            : Math.max(minimum, maximum === null ? normalizedValue : Math.min(maximum, normalizedValue));
        const inputLocked = locked && input.lockWhenIntegrationLocked;
        const lockSuffix = inputLocked ? " (LOCKED)" : "";
        const label = input.showRange && context.includeRanges
            ? `${input.label} (1-${maximum})${lockSuffix}`
            : `${input.label}${lockSuffix}`;
        return {
            id: `${idPrefix}-${input.id}`,
            label,
            optionKey,
            ...(typeof input.group === "string" && input.group.length > 0 ? { group: input.group } : {}),
            ...(typeof input.description === "string" && input.description.length > 0 ? { description: input.description } : {}),
            ...(typeof input.tooltip === "string" && input.tooltip.length > 0 ? { tooltip: input.tooltip } : {}),
            ...(typeof input.format === "string" && input.format.length > 0 ? { format: input.format } : {}),
            type: input.type,
            value: inputLocked ? (input.lockedValue === "maximum" ? maximum : input.lockedValue) : (input.type === "number" ? numericValue : rawValue),
            ...(Array.isArray(input.values) ? { options: input.values } : {}),
            // Display-only text for enum choices, keyed by the persisted value. Declared once on the
            // option definition so every consumer of that option renders the same wording while the
            // stored value stays the raw id.
            ...(isOptionLabelMap(optionDefinition.labels) ? { optionLabels: optionDefinition.labels } : {}),
            ...(input.type === "number" ? { min: minimum, step, ...(maximum === null ? {} : { max: maximum }) } : {}),
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
    const icon = (value) => {
        const normalized = typeof value === "string" ? value.trim() : "";
        if (!normalized) return "";
        return context.iconBrackets ? `[${normalized}]` : normalized;
    };
    const startingOrder = Number(context.startingOrder) || 0;

    return (integration?.actions ?? []).map((rawAction, index) => {
        const action = getObject(rawAction);
        const statsStateValue = typeof action.stateKey === "string"
            ? getTelemetryFieldValue(safeStats, action.stateKey)
            : undefined;
        // Some command buttons are only meaningful in one authoritative runtime state (for
        // example Activate only while inactive, Resume only while paused). Descriptors can publish
        // that state as telemetry and name it here without teaching dashboard core about any
        // particular integration. Missing/stale telemetry fails closed to disabled.
        const enabledStateValue = typeof action.enabledStateKey === "string"
            ? getTelemetryFieldValue(safeStats, action.enabledStateKey)
            : true;
        const enabledByState = action.enabledStateKey === undefined || enabledStateValue === true;
        // A persisted action updates the options store the instant it is clicked, while the daemon
        // it targets only reflects the change once its own loop drains the command and publishes
        // telemetry. Preferring the saved option here makes both toggles and explicit enum/mode
        // choices update immediately instead of waiting out that daemon's full cycle.
        const hasOptionKey = typeof action.optionKey === "string" && action.optionKey.length > 0;
        const hasExplicitOptionValue = Object.prototype.hasOwnProperty.call(action, "optionValue");
        const variants = getObject(action.variants);
        const hasVariantOptionValue = Object.values(variants)
            .some((entry) => Object.prototype.hasOwnProperty.call(getObject(entry), "optionValue"));
        const isPersistedToggle = hasOptionKey && action.activeValue === undefined && !hasVariantOptionValue;
        const isPersistedAction = isPersistedToggle || (hasOptionKey && (hasExplicitOptionValue || hasVariantOptionValue));
        const stateValue = isPersistedAction
            ? (safeOptions[action.optionKey] ?? statsStateValue ?? action.defaultValue)
            : (statsStateValue ?? safeOptions[action.optionKey] ?? action.defaultValue);
        const variant = variants[String(stateValue)];
        const enabled = action.activeValue !== undefined
            ? String(stateValue) === String(action.activeValue)
            : Boolean(stateValue);
        const actionKind = action.kind ?? integration?.commands?.actionKind ?? "plugin-command";
        // A metadata-owned save-options action changes only the persisted dashboard option store.
        // It deliberately does not require, or send a command to, the service runtime. This makes
        // fail-closed feature gates usable before a daemon is started and lets cheap parents poll
        // the same saved setting without allocating a command port solely for configuration.
        const isSaveOptions = actionKind === "save-options";
        const requiresRuntime = action.requiresRuntime === true
            || (!isSaveOptions
                && action.requiresRuntime !== false
                && integration?.commands?.requiresRuntime !== false);
        // A "clipboard" action just hands the player a string to paste - it dispatches nothing, so
        // it must not be gated on the integration's script running, and its payload comes from
        // telemetry rather than from the descriptor (the target changes as the game progresses).
        const clipboardText = typeof action.textKey === "string"
            ? String(getTelemetryFieldValue(safeStats, action.textKey) ?? "")
            : "";
        const isClipboard = action.kind === "clipboard";
        const nextOptionValue = Object.prototype.hasOwnProperty.call(getObject(variant), "optionValue")
            ? variant.optionValue
            : hasExplicitOptionValue ? action.optionValue : !enabled;
        // Mutual-exclusion pair: a toggle turning ITSELF on (never off) can force one or more other,
        // unrelated services' own option keys to false in the same options-store write - e.g. two
        // automations that would otherwise fight over the same in-game "current work" slot every
        // cycle if both were enabled at once. Each service's own launcher already polls the shared
        // options store live (loadDashboardOptionsState) to decide whether to run, so persisting the
        // other key's new value here is sufficient - no cross-service command-port call needed.
        const clearsOptionKeys = nextOptionValue && Array.isArray(action.clearsOptionKeys)
            ? action.clearsOptionKeys.filter((key) => typeof key === "string" && key.length > 0)
            : [];
        const clearedOptionOverrides = Object.fromEntries(clearsOptionKeys.map((key) => [key, false]));
        return {
            id: `${idPrefix}-${action.id}`,
            label: variant?.label ?? action.label,
            icon: icon(action.icon ?? ""),
            ...(typeof action.tooltip === "string" && action.tooltip ? { tooltip: action.tooltip } : {}),
            tone: variant?.tone ?? (enabled
                ? action.activeTone ?? action.enabledTone ?? "success"
                : action.inactiveTone ?? action.disabledTone ?? "danger"),
            // Per-action kind wins over the integration-level actionKind. Required for "clipboard":
            // buildPluginIntegrationService.getActions hard-overrides actionKind to "plugin-command"
            // for the auto Options panel, so without this a clipboard entry would silently be
            // dispatched as a port command instead.
            kind: actionKind,
            featureSize: action.featureSize === true,
            ...(typeof action.group === "string" && action.group.length > 0 ? { group: action.group } : {}),
            ...(action.afterInputs === true ? { afterInputs: true } : {}),
            ...(isClipboard ? { text: clipboardText } : {}),
            command: action.command ?? variant?.command ?? (enabled ? action.disableCommand : action.enableCommand),
            // Per-action override for an integration whose merged components each still run their
            // own independent command-drain loop on their own port - same rationale as
            // optionBindings' port override below in applyPluginIntegrationOptions.
            ...(Number.isFinite(Number(action.port)) ? { port: Number(action.port) } : {}),
            // Opt-in actions report the value they are about to select so the click handler can
            // persist it alongside the live port command. Plain toggles derive the inverse boolean;
            // enum/mode buttons declare their exact optionValue in metadata.
            ...(isPersistedAction
                ? { optionKey: action.optionKey, optionValue: nextOptionValue }
                : {}),
            ...(isSaveOptions && isPersistedAction
                ? { optionOverrides: { [action.optionKey]: nextOptionValue, ...clearedOptionOverrides } }
                : {}),
            // Same clearedOptionOverrides, exposed ungated by kind so a "plugin-command" toggle
            // (which persists its own optionKey/optionValue through a different path in
            // runServiceAction, not optionOverrides) can merge it in too.
            ...(isPersistedAction && clearsOptionKeys.length > 0 ? { clearedOptionOverrides } : {}),
            // A clipboard action copies telemetry, so it is gated on having something to copy
            // rather than on the integration's own script running - the whole point of these is to
            // work while the Singularity-gated worker is stopped.
            disabled: isClipboard
                ? clipboardText.length === 0
                : Boolean(
                    (requiresRuntime && !running)
                    || (locked && action.lockWhenIntegrationLocked)
                    || !enabledByState
                ),
            // Number(action.order) || index * 10 would silently discard an explicit order: 0 (0 is
            // falsy) and fall through to the index-based default instead - mirrors the
            // Number.isFinite(Number(action.port)) pattern just above for the same reason.
            order: startingOrder + (Number.isFinite(Number(action.order)) ? Number(action.order) : index * 10),
            // Mirrors telemetry sections' own panelId scoping (getPluginIntegrationSections) - an
            // action with no panelId shows on every panel (the pre-existing, still-default
            // behavior), one with a panelId is confined to it. Lets buy-style actions live on their
            // own dedicated panel instead of bleeding into the generic auto-injected "Options" tab
            // every plugin service gets, which is meant for configuration, not shopping.
            ...(typeof action.panelId === "string" ? { panelId: action.panelId } : {}),
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
        lines.push({ label: options.runningLabel ?? "Bot Status", value: running ? "running" : "stopped", tone: running ? "success" : daemon ? "warn" : "neutral" });
    }

    const configuredOptions = getObject(options.configuredOptions);
    for (const field of integration?.status?.optionFields ?? []) {
        if (typeof field?.panelId === "string" && typeof panelId === "string" && field.panelId !== panelId) continue;
        if (typeof field?.key !== "string" || !(field.key in configuredOptions)) continue;
        lines.push({
            label: field.label,
            value: formatTelemetryFieldValue(configuredOptions[field.key], field.format),
            tone: field.tone ?? "neutral",
    });
    }

    if (!stats || typeof stats !== "object") {
        lines.push({ label: "Telemetry", value: `${integration?.telemetry?.path} not found`, tone: "warn" });
        return lines;
    }

    let hasKnownStats = false;
    const fields = (integration?.telemetry?.fields ?? []).filter((field) => {
        if (typeof field?.panelId === "string" && typeof panelId === "string" && field.panelId !== panelId) return false;
        return isOptionControlledEntryVisible(field, integration, configuredOptions);
    });
    for (const field of fields) {
        const line = buildPluginIntegrationTelemetryLine(stats, field);
        if (!line) continue;
        hasKnownStats = true;
        lines.push(line);
    }
    if (!hasKnownStats) lines.push({ label: "Telemetry", value: "Stats file loaded (no known keys)", tone: "neutral" });
    return lines;
}

// context is optional and additive - a 2-arg call (integration, stats) keeps today's exact
// behavior (empty array when stats is null) for any caller that doesn't know about the
// live/stale/missing freshness states yet.
export function getPluginIntegrationOverviewLines(integration, stats, context = {}) {
    const hasStats = Boolean(stats && typeof stats === "object");
    const overviewFields = (integration?.telemetry?.fields ?? [])
        .filter((field) => field?.overview === true)
        .sort((left, right) => (Number(left?.overviewOrder) || 0) - (Number(right?.overviewOrder) || 0));

    if (!hasStats) {
        if (context.includeMissingPlaceholders !== true) return [];
        return overviewFields.map((field) => ({
            label: field.overviewLabel ?? field.label,
            value: "Not started",
            tone: "neutral",
            key: field.key,
            order: Number(field.overviewOrder) || 0,
            state: TELEMETRY_FRESHNESS_STATES.MISSING,
            ageText: null,
        }));
    }

    const state = getTelemetryFreshnessState({
        hasStats: true,
        requiresRuntime: context.requiresRuntime !== false,
        running: Boolean(context.running),
    });
    const generatedAt = Number(getTelemetryFieldValue(stats, "generatedAt"));
    // Date.now() here is fine - this only ever runs inside DashboardWidget's already-gated render
    // body (see automation-dashboard.jsx's canSkipRender), and the result never flows into the
    // top-level renderSignature or telemetryByServiceId's reuseRecord cache. If it ever did, this
    // would make that signature differ every tick and force a full printRaw()/renderTail() every
    // tick forever - don't wire ageText or Date.now() into either of those.
    const ageText = state === TELEMETRY_FRESHNESS_STATES.STALE && Number.isFinite(generatedAt) && generatedAt > 0
        ? formatRelativeAge(Date.now() - generatedAt)
        : null;

    return overviewFields
        .map((field) => {
            const overviewField = typeof field.overviewValueKey === "string"
                ? { ...field, key: field.overviewValueKey }
                : field;
            const line = buildPluginIntegrationTelemetryLine(stats, overviewField, field.overviewFormat ?? field.format);
            if (!line) return null;
            // A stale tile doesn't show its last-known value at all, same as a graph's history
            // data getting zeroed out when offline (see getPluginIntegrationGraphs) - a plain
            // "Offline" replaces it, rather than a real-looking number with an overlay badge on
            // top of it, which read as cluttered/collided in practice.
            const isStale = state === TELEMETRY_FRESHNESS_STATES.STALE;
            return {
                ...line,
                label: field.overviewLabel ?? line.label,
                value: isStale ? "Offline" : line.value,
                tone: isStale ? "neutral" : (field.overviewTone ?? line.tone),
                key: field.key,
                order: Number(field.overviewOrder) || 0,
                state,
                ageText,
            };
        })
        .filter(Boolean);
}

export function getPluginIntegrationOverviewGauges(integration, stats, context = {}) {
    const safeStats = getObject(stats);
    // Stale (was publishing real numbers, service now stopped) is deliberately NOT treated the
    // same as "field never published" above - that stays hidden, this stays visible but flagged
    // offline, same distinction getPluginIntegrationOverviewLines already makes for tiles.
    const offline = isOfflineContext(context);
    return (integration?.telemetry?.overviewGauges ?? [])
        .filter((gauge) => gauge && typeof gauge === "object" && typeof gauge.label === "string")
        .map((gauge, index) => {
            const rawUsed = getTelemetryFieldValue(safeStats, gauge.usedKey);
            const rawTotal = getTelemetryFieldValue(safeStats, gauge.totalKey);
            // A runtime that deliberately hasn't published this field yet (e.g. a capability-gated
            // stat like Hacknet Server RAM before Source-File 9 is unlocked) means "not applicable
            // right now" - distinct from a published value of 0, which is a legitimate reading.
            // Skipping here, rather than defaulting to a 0/0 gauge, lets a gauge stay hidden until
            // its data is actually meaningful with no dashboard-side requirement/capability wiring
            // needed - the runtime publishing (or not publishing) the field is the single source
            // of truth for whether it currently applies.
            if (rawUsed === undefined && rawTotal === undefined) return null;
            const used = Math.max(0, Number(rawUsed) || 0);
            const total = Math.max(0, Number(rawTotal) || 0);
            const configuredRatio = Number(getTelemetryFieldValue(safeStats, gauge.ratioKey));
            const ratio = Number.isFinite(configuredRatio) && configuredRatio >= 0
                ? configuredRatio
                : total > 0
                    ? used / total
                    : 0;
            // A gauge fed by a labeled `sources[]` entry (e.g. Cloud RAM, merged in from
            // Infrastructure Report) tracks that source's own freshness independently of whether
            // *this* integration's own script is running - see getTelemetrySourceFreshness().
            const sourceFreshness = getTelemetrySourceFreshness(safeStats, gauge.usedKey)
                ?? getTelemetrySourceFreshness(safeStats, gauge.totalKey);
            return {
                key: typeof gauge.id === "string" ? gauge.id : `${integration?.serviceId ?? "plugin"}:${index}`,
                label: gauge.label,
                shortLabel: typeof gauge.shortLabel === "string" ? gauge.shortLabel : gauge.label,
                used,
                total,
                ratio,
                valueFormat: gauge.valueFormat ?? "number",
                order: Number(gauge.order) || 0,
                offline: offline || Boolean(sourceFreshness?.offline),
                sourceLabel: sourceFreshness?.sourceLabel,
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.order - right.order);
}

// Both functions below are pure functions of their arguments, and `stats` is already
// reference-stable when telemetry content is unchanged (see loadPluginIntegrationStats' own
// WeakMap cache). Memoizing by reference avoids rebuilding every section wrapper object (and,
// downstream, DataGraph's point/path recomputation) on every call when nothing changed.
let cachedPluginIntegrationSections = null;

// offline: a graph section's data is zeroed out entirely (not just faded in the UI) once its
// backing service is stale - so an inactive widget shows no history line rather than a last-known
// curve. Only affects "graph" sections; "items"/"string-list" sections are left as-is.
function isOfflineContext(context) {
    return getTelemetryFreshnessState({
        hasStats: true,
        requiresRuntime: context?.requiresRuntime !== false,
        running: Boolean(context?.running),
    }) === TELEMETRY_FRESHNESS_STATES.STALE;
}

export function getPluginIntegrationSections(integration, stats, panelId, context = {}) {
    if (cachedPluginIntegrationSections
        && cachedPluginIntegrationSections.integration === integration
        && cachedPluginIntegrationSections.stats === stats
        && cachedPluginIntegrationSections.panelId === panelId
        && cachedPluginIntegrationSections.running === context.running
        && cachedPluginIntegrationSections.requiresRuntime === context.requiresRuntime) {
        return cachedPluginIntegrationSections.result;
    }

    const safeStats = getObject(stats);
    const offline = isOfflineContext(context);
    const result = (integration?.telemetry?.sections ?? [])
        .filter((section) => typeof section?.panelId !== "string" || section.panelId === panelId)
        .map((section) => {
            const source = getTelemetryFieldValue(safeStats, section.sourceKey);
            // A section fed by a labeled `sources[]` entry (e.g. the Servers resource-cards list
            // or Profit vs Cost graph, both merged in from Infrastructure Report) tracks that
            // source's own freshness independently of whether *this* integration's own script is
            // running - see getTelemetrySourceFreshness().
            const sourceFreshness = getTelemetrySourceFreshness(safeStats, section.sourceKey);
            const sectionOffline = offline || Boolean(sourceFreshness?.offline);
            if (section.type === "graph") {
                return {
                    ...section,
                    data: sectionOffline ? [] : (Array.isArray(source) ? source : []),
                    offline: sectionOffline,
                    sourceLabel: sourceFreshness?.sourceLabel,
                    sourceAgeText: sourceFreshness?.ageText,
                };
            }
            // DashboardDataTable (dashboard/renderers/dashboard-table.jsx) reads section.rows, not
            // section.items - every other non-graph section type reads items instead, so a table
            // section needs its own branch rather than falling into the generic one below (which
            // would resolve sourceKey into a field the renderer never looks at, leaving the table
            // permanently empty regardless of live data). Same stale-data behavior as the generic
            // branch: keep last-known rows rather than zeroing them like a graph does.
            if (section.type === "table") {
                return {
                    ...section,
                    rows: Array.isArray(source) ? source : [],
                    offline: sectionOffline,
                    sourceLabel: sourceFreshness?.sourceLabel,
                    sourceAgeText: sourceFreshness?.ageText,
                };
            }
            // Non-graph sections (resource-cards, string-list, items) deliberately keep their
            // last-known items when the source goes stale, rather than zeroing them like a graph
            // does - an empty "no cloud servers purchased" list would misleadingly imply zero
            // servers exist, when what actually happened is the *tracker* stopped reporting.
            // offline/sourceLabel are still surfaced so the UI can flag "this data may be stale".
            return {
                ...section,
                items: Array.isArray(source) ? source : [],
                offline: sectionOffline,
                sourceLabel: sourceFreshness?.sourceLabel,
                sourceAgeText: sourceFreshness?.ageText,
            };
        });

    cachedPluginIntegrationSections = { integration, stats, panelId, running: context.running, requiresRuntime: context.requiresRuntime, result };
    return result;
}

// Called via flatMap() over every service at once (see the "home graphs" overview widget), so a
// single-slot cache would thrash on every iteration - a WeakMap keyed by the per-service
// integration object naturally partitions the cache without any manual key composition.
const cachedPluginIntegrationGraphsByIntegration = new WeakMap();

export function getPluginIntegrationGraphs(integration, stats, context = {}) {
    if (!integration || typeof integration !== "object") {
        return buildPluginIntegrationGraphs(integration, stats, context);
    }

    const cached = cachedPluginIntegrationGraphsByIntegration.get(integration);
    if (cached && cached.stats === stats && cached.running === context.running && cached.requiresRuntime === context.requiresRuntime) {
        return cached.result;
    }

    const result = buildPluginIntegrationGraphs(integration, stats, context);
    cachedPluginIntegrationGraphsByIntegration.set(integration, { stats, running: context.running, requiresRuntime: context.requiresRuntime, result });
    return result;
}

function buildPluginIntegrationGraphs(integration, stats, context = {}) {
    const safeStats = getObject(stats);
    const offline = isOfflineContext(context);
    return (integration?.telemetry?.sections ?? [])
        .filter((section) => section?.type === "graph")
        .map((section) => {
            const source = getTelemetryFieldValue(safeStats, section.sourceKey);
            const sourceFreshness = getTelemetrySourceFreshness(safeStats, section.sourceKey);
            const sectionOffline = offline || Boolean(sourceFreshness?.offline);
            return {
                ...section,
                data: sectionOffline ? [] : (Array.isArray(source) ? source : []),
                offline: sectionOffline,
                sourceLabel: sourceFreshness?.sourceLabel,
            };
        });
}

export function buildPluginIntegrationService(plugin) {
    const integration = getObject(plugin?.metadata);
    const daemon = integration.daemon !== false;
    const panels = Array.isArray(integration.panels) ? integration.panels : [];
    const defaultPanelId = integration.defaultPanelId ?? panels[0]?.id ?? "status";
    const optionsPanelId = "options";
    const getPanelRuntimeScript = (panelId) => {
        const panel = panels.find((candidate) => candidate?.id === panelId);
        return typeof panel?.runtimeScript === "string" && panel.runtimeScript.length > 0
            ? panel.runtimeScript
            : integration.scriptPath;
    };
    const getPanelRuntimeLabel = (panelId) => {
        const panel = panels.find((candidate) => candidate?.id === panelId);
        if (!panel?.runtimeScript) return undefined;
        const runtimeLabel = panel.runtimeLabel ?? panel.title ?? panel.label ?? panel.id;
        return `${runtimeLabel} Status`;
    };
    // A panel may declare a single "runtimeScript" or (for a panel that represents more than one
    // network child - e.g. Faction Manager's "Gang" panel covering Gangs, Gang Bootstrap, and the
    // reputation-share Boost filler together) a "runtimeScripts" array. Falls back to the
    // integration's own main script when a panel declares neither, matching the previous behavior.
    const getPanelRuntimeScripts = (panelId) => {
        const panel = panels.find((candidate) => candidate?.id === panelId);
        if (Array.isArray(panel?.runtimeScripts) && panel.runtimeScripts.length > 0) return panel.runtimeScripts;
        if (typeof panel?.runtimeScript === "string" && panel.runtimeScript.length > 0) return [panel.runtimeScript];
        return [integration.scriptPath];
    };
    const getPanelRuntimeHealth = (panelId, homeScripts, networkChildStatus) => (
        getScriptGroupHealth(getPanelRuntimeScripts(panelId), homeScripts, networkChildStatus)
    );
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
        getHealth: ({ homeScripts, telemetryByServiceId, networkChildStatus }) => {
            const running = (homeScripts ?? []).some((script) => script?.filename === integration.scriptPath && script?.running);
            const stats = telemetryByServiceId?.[integration.serviceId] ?? null;
            const telemetryLines = getPluginIntegrationStateLines(integration, stats, { running });
            const telemetryReady = telemetryLines.some((line) => line.label !== "Bot Status" && line.label !== "Telemetry");
            const summary = running
                ? `${integration.menuLabel} is running${telemetryReady ? " with telemetry" : " (telemetry pending)"}.`
                : daemon
                    ? `${integration.menuLabel} is stopped.`
                    : `${integration.menuLabel} runs on demand.`;
            // "danger" (not "warn") for a stopped daemon - matches the left-menu dot's own red for
            // this exact case, and keeps it visually distinct from "warn", which now also means "a
            // network child is stuck/blocked while the parent is running fine" (see
            // getNetworkChildHealthContribution/getScriptGroupHealth). Not running because the
            // service is merely on-demand (!daemon) stays "neutral" - nothing wrong there.
            const level = running || !daemon ? "neutral" : "danger";
            const panelHealth = Object.fromEntries(panels.map((panel) => {
                if (!panel?.runtimeScript && !panel?.runtimeScripts) return [panel.id, { level, summary }];
                const panelHealthResult = getPanelRuntimeHealth(panel.id, homeScripts, networkChildStatus);
                return [panel.id, panelHealthResult.level === "warn"
                    ? panelHealthResult
                    : { level: "neutral", summary: `${panel.label ?? panel.id} is running.` }];
            }));
            return {
                level,
                summary,
                panels: Object.fromEntries(Object.entries(panelHealth).map(([id, health]) => [id, health.level])),
                panelSummaries: Object.fromEntries(Object.entries(panelHealth).map(([id, health]) => [id, health.summary])),
            };
        },
        getState: ({ selectedCenterPanel, homeScripts, telemetryByServiceId, options, networkChildStatus }) => {
            if (selectedCenterPanel === optionsPanelId) return [];
            const running = getPanelRuntimeHealth(selectedCenterPanel, homeScripts, networkChildStatus).level === "neutral";
            return getPluginIntegrationStateLines(integration, telemetryByServiceId?.[integration.serviceId] ?? null, {
                running,
                panelId: selectedCenterPanel,
                runningLabel: getPanelRuntimeLabel(selectedCenterPanel),
                configuredOptions: options,
            });
        },
        getSections: ({ selectedCenterPanel, homeScripts, telemetryByServiceId, networkChildStatus }) => {
            if (selectedCenterPanel === optionsPanelId) return [];
            const running = getPanelRuntimeHealth(selectedCenterPanel, homeScripts, networkChildStatus).level === "neutral";
            const runtimeScript = getPanelRuntimeScript(selectedCenterPanel);
            return getPluginIntegrationSections(
                integration,
                telemetryByServiceId?.[integration.serviceId],
                selectedCenterPanel,
                // requiresRuntime mirrors serviceRuntimeById's own Boolean(service.pluginFile) -
                // whether this service has a process to be stale against at all, not whether it's
                // meant to autostart (that's the separate `daemon` flag).
                { running, requiresRuntime: Boolean(runtimeScript) }
            );
        },
        getInputs: ({ selectedCenterPanel, options, telemetryByServiceId }) => {
            if (selectedCenterPanel !== optionsPanelId) return [];
            return buildPluginIntegrationInputs(integration, options, telemetryByServiceId?.[integration.serviceId], { includeRanges: true, idPrefix: integration.serviceId });
        },
        getActions: ({ homeScripts, options, telemetryByServiceId }) => {
            // Not gated to the Options panel - see the matching comment in script-plugin.js's
            // getActions. Placement is decided by renderStandardServicePanel's panelId filter.
            // Own scriptPath OR any managedScripts sibling - see isIntegrationScriptRunning's own
            // comment for why this can't just check scriptPath alone.
            const runningFilenames = new Set((homeScripts ?? []).filter((s) => s?.running).map((s) => s.filename));
            const running = isIntegrationScriptRunning(integration, runningFilenames);
            return buildPluginIntegrationActions({ ...integration, commands: { ...integration.commands, actionKind: "plugin-command" } }, options, telemetryByServiceId?.[integration.serviceId], {
                running,
                idPrefix: integration.serviceId,
                iconBrackets: true,
                startingOrder: 30,
            }).map((action) => ({ ...action, serviceId: integration.serviceId }));
        },
    };
}
