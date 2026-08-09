import { formatMoney, formatRam, formatRelativeAge, formatSignedMoney } from "dashboard/libs/format-utils.js";
import { TELEMETRY_FRESHNESS_STATES, getTelemetryFreshnessState } from "dashboard/libs/telemetry-freshness.js";

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
            ...(typeof input.group === "string" && input.group.length > 0 ? { group: input.group } : {}),
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
            const line = buildTelemetryLine(stats, overviewField, field.overviewFormat ?? field.format);
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
        getSections: ({ selectedCenterPanel, homeScripts, telemetryByServiceId }) => {
            if (selectedCenterPanel === optionsPanelId) return [];
            const running = (homeScripts ?? []).some((script) => script?.filename === integration.scriptPath && script?.running);
            return getPluginIntegrationSections(
                integration,
                telemetryByServiceId?.[integration.serviceId],
                selectedCenterPanel,
                // requiresRuntime mirrors serviceRuntimeById's own Boolean(service.pluginFile) -
                // whether this service has a process to be stale against at all, not whether it's
                // meant to autostart (that's the separate `daemon` flag).
                { running, requiresRuntime: Boolean(integration.scriptPath) }
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
