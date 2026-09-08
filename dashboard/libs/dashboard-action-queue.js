import { normalizeFilePreviewMaxChars } from "./file-preview.js";

export const DASHBOARD_ACTION_QUEUE_CAPACITY = 64;
export const DASHBOARD_ACTION_QUEUE_RESERVED_CAPACITY = 4;
export const DASHBOARD_ACTIONS_PER_PASS = 4;

const MAX_QUEUE_STRING_LENGTH = 512;
const MAX_QUEUE_OPTION_STRING_LENGTH = 4096;
const MAX_QUEUE_OPTION_DEPTH = 4;
// A single dashboard-options snapshot includes framework settings plus independently discovered
// service options. It can therefore legitimately exceed 64 keys without containing an oversized
// value. Keep the queue bounded, while leaving room for a full metadata-driven installation.
const MAX_QUEUE_OPTION_KEYS = 256;
const MAX_QUEUE_OPTION_ITEMS = 64;
const MAX_QUEUE_FILE_PATHS = 1000;

function normalizeShortString(value, label, maxLength = MAX_QUEUE_STRING_LENGTH, allowEmpty = false) {
    if (typeof value !== "string") throw new Error(`Invalid ${label}.`);
    const normalized = value.trim();
    if ((!allowEmpty && !normalized) || normalized.length > maxLength) throw new Error(`Invalid ${label}.`);
    return normalized;
}

function cloneBoundedValue(value, depth = 0) {
    if (value === null || ["boolean", "number"].includes(typeof value)) {
        if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid queued value.");
        return value;
    }
    if (typeof value === "string") {
        if (value.length > MAX_QUEUE_OPTION_STRING_LENGTH) throw new Error("Queued text is too large.");
        return value;
    }
    if (depth >= MAX_QUEUE_OPTION_DEPTH || !value || typeof value !== "object") {
        throw new Error("Invalid queued value.");
    }
    if (Array.isArray(value)) {
        if (value.length > MAX_QUEUE_OPTION_ITEMS) throw new Error("Queued list is too large.");
        return value.map((item) => cloneBoundedValue(item, depth + 1));
    }
    const entries = Object.entries(value);
    if (entries.length > MAX_QUEUE_OPTION_KEYS) throw new Error("Queued object is too large.");
    return Object.fromEntries(entries.map(([key, item]) => [
        normalizeShortString(key, "queued key", MAX_QUEUE_STRING_LENGTH),
        cloneBoundedValue(item, depth + 1),
    ]));
}

function normalizePathList(value, label) {
    if (!Array.isArray(value) || value.length > MAX_QUEUE_FILE_PATHS) throw new Error(`Invalid ${label}.`);
    return value.map((path) => normalizeShortString(path, label));
}

function normalizeFileCommand(command, allowContinuation) {
    const normalized = {
        kind: "file",
        actionId: normalizeShortString(command.actionId, "file action", 64),
        viewId: normalizeShortString(command.viewId, "view id", 128),
    };
    if (command.path !== undefined) normalized.path = normalizeShortString(command.path, "file path");
    if (command.paths !== undefined) normalized.paths = normalizePathList(command.paths, "file paths");
    if (command.target !== undefined) normalized.target = normalizeShortString(command.target, "file target", MAX_QUEUE_STRING_LENGTH, true);
    if (allowContinuation && command.batch && typeof command.batch === "object") {
        const total = Math.floor(Number(command.batch.total));
        const completedCount = Math.floor(Number(command.batch.completedCount));
        const skippedCount = Math.floor(Number(command.batch.skippedCount));
        if (!Number.isInteger(total) || total < 1 || total > MAX_QUEUE_FILE_PATHS
            || !Number.isInteger(completedCount) || completedCount < 0 || completedCount > total
            || !Number.isInteger(skippedCount) || skippedCount < 0 || skippedCount > total) {
            throw new Error("Invalid file batch state.");
        }
        normalized.batch = { total, completedCount, skippedCount };
    }
    return normalized;
}

export function normalizeDashboardQueueAction(command, { allowContinuation = false } = {}) {
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new Error("Invalid dashboard action.");
    const kind = normalizeShortString(command.kind, "action kind", 64);
    if (kind === "window-mode") return { kind, mode: normalizeShortString(command.mode, "window mode", 64) };
    if (kind === "minimize-tail") return { kind };
    if (kind === "save-options") return { kind, options: cloneBoundedValue(command.options) };
    if (kind === "plugin-options") {
        return {
            kind,
            serviceId: normalizeShortString(command.serviceId, "service id", 128),
            options: cloneBoundedValue(command.options),
        };
    }
    if (kind === "plugin-command") {
        const port = command.port === undefined ? null : Number(command.port);
        if (port !== null && !Number.isFinite(port)) throw new Error("Invalid plugin port.");
        return {
            kind,
            serviceId: normalizeShortString(command.serviceId, "service id", 128),
            command: normalizeShortString(command.command, "plugin command"),
            ...(port === null ? {} : { port }),
            ...(command.runtimeScripts === undefined ? {} : { runtimeScripts: normalizePathList(command.runtimeScripts, "runtime scripts") }),
        };
    }
    if (kind === "dashboard") return { kind, actionId: normalizeShortString(command.actionId, "dashboard action", 128) };
    if (kind === "script") {
        return {
            kind,
            actionId: normalizeShortString(command.actionId, "script action", 128),
            filename: normalizeShortString(command.filename, "script filename"),
        };
    }
    if (kind === "file") return normalizeFileCommand(command, allowContinuation);
    if (kind === "file-preview") {
        return {
            kind,
            viewId: normalizeShortString(command.viewId, "view id", 128),
            path: normalizeShortString(command.path, "preview path"),
            requestId: normalizeShortString(command.requestId, "preview request id", 128),
            maxChars: normalizeFilePreviewMaxChars(command.maxChars),
        };
    }
    throw new Error(`Unknown dashboard action kind: ${kind}.`);
}

export function getDashboardActionCoalesceKey(command) {
    if (command?.kind === "window-mode" || command?.kind === "minimize-tail") return command.kind;
    // A persisted options action always carries the complete normalized snapshot. Retaining only
    // the latest one prevents rapid button toggles from consuming the normal action capacity.
    if (command?.kind === "save-options") return "save-options";
    if (command?.kind === "file" && command.actionId === "refresh") return `file:refresh:${command.viewId}`;
    if (command?.kind === "file-preview") return `file-preview:${command.viewId}:${command.path}`;
    return "";
}

export function enqueueDashboardQueueAction(queue, action, { continuation = false } = {}) {
    const existing = Array.isArray(queue) ? queue : [];
    const normalized = normalizeDashboardQueueAction(action, { allowContinuation: continuation });
    const coalesceKey = continuation ? "" : getDashboardActionCoalesceKey(normalized);
    if (coalesceKey) {
        const index = existing.findIndex((candidate) => getDashboardActionCoalesceKey(candidate) === coalesceKey);
        if (index >= 0) {
            const next = [...existing];
            next[index] = normalized;
            return { accepted: true, queue: next, coalesced: true };
        }
    }
    const capacity = continuation
        ? DASHBOARD_ACTION_QUEUE_CAPACITY
        : DASHBOARD_ACTION_QUEUE_CAPACITY - DASHBOARD_ACTION_QUEUE_RESERVED_CAPACITY;
    if (existing.length >= capacity) {
        return { accepted: false, queue: existing, reason: "Dashboard action queue is full." };
    }
    return { accepted: true, queue: continuation ? [normalized, ...existing] : [...existing, normalized], coalesced: false };
}

export function takeDashboardQueueActions(queue, maximum = DASHBOARD_ACTIONS_PER_PASS) {
    const existing = Array.isArray(queue) ? queue : [];
    const count = Math.max(1, Math.floor(Number(maximum) || DASHBOARD_ACTIONS_PER_PASS));
    return { actions: existing.slice(0, count), remaining: existing.slice(count) };
}
