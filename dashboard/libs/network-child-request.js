export const NETWORK_CHILD_REQUEST_DIRECTORY = "data/network-child-requests/";
export const NETWORK_CHILD_STATUS_FILE = "data/network_child_status.json";
export const DEFAULT_NETWORK_CHILD_REQUEST_TTL_MS = 15000;

function normalizeStringList(values) {
    return [...new Set((Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && value.length > 0))];
}

export function normalizeNetworkChildId(value) {
    const normalized = String(value ?? "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized;
}

export function getNetworkChildRequestPath(id) {
    const normalizedId = normalizeNetworkChildId(id);
    return normalizedId ? `${NETWORK_CHILD_REQUEST_DIRECTORY}${normalizedId}.json` : "";
}

export function normalizeNetworkChildRequest(value, now = Date.now()) {
    if (!value || typeof value !== "object") return null;
    const id = normalizeNetworkChildId(value.id);
    const script = typeof value.script === "string" ? value.script.trim() : "";
    const ownerScript = typeof value.ownerScript === "string" ? value.ownerScript.trim() : "";
    if (!id || !script || !ownerScript) return null;

    const requestedAt = Number.isFinite(Number(value.requestedAt)) ? Number(value.requestedAt) : now;
    const ttlMs = Math.max(1000, Number(value.ttlMs) || DEFAULT_NETWORK_CHILD_REQUEST_TTL_MS);
    const suppliedExpiry = Number(value.expiresAt);
    return {
        version: 1,
        id,
        desired: value.desired !== false,
        script,
        ownerScript,
        ownerHost: typeof value.ownerHost === "string" && value.ownerHost ? value.ownerHost : "home",
        args: Array.isArray(value.args) ? value.args : [],
        dependencies: normalizeStringList(value.dependencies).filter((dependency) => dependency !== script),
        lifecycle: value.lifecycle === "persistent" ? "persistent" : "one-shot",
        preferRemote: value.preferRemote !== false,
        reserveRamGb: Math.max(0, Number(value.reserveRamGb) || 0),
        label: typeof value.label === "string" && value.label ? value.label : script,
        requestedAt,
        expiresAt: Number.isFinite(suppliedExpiry) && suppliedExpiry > requestedAt
            ? suppliedExpiry
            : requestedAt + ttlMs,
    };
}

/** @param {NS} ns */
export async function publishNetworkChildRequest(ns, request) {
    const normalized = normalizeNetworkChildRequest(request);
    if (!normalized) return { status: "invalid", path: "" };
    const path = getNetworkChildRequestPath(normalized.id);
    const written = await ns.write(path, JSON.stringify(normalized), "w");
    return { status: written === false ? "failed" : "published", path, request: normalized };
}

/** @param {NS} ns */
export async function cancelNetworkChildRequest(ns, request) {
    return publishNetworkChildRequest(ns, { ...request, desired: false });
}

/** @param {NS} ns */
export function readNetworkChildStatus(ns, id) {
    try {
        if (!ns.fileExists(NETWORK_CHILD_STATUS_FILE, "home")) return null;
        const raw = ns.read(NETWORK_CHILD_STATUS_FILE);
        const parsed = raw ? JSON.parse(raw) : null;
        const child = parsed?.children?.[normalizeNetworkChildId(id)];
        return child && typeof child === "object" ? child : null;
    } catch (error) {
        return null;
    }
}
