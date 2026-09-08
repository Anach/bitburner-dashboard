const MAX_AUTHORITIES = 16;
const MAX_SERVICES_PER_AUTHORITY = 128;
const MAX_LEASE_TTL_MS = 30000;
const AUTHORITY_ID_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;
const STATE_PATH_PATTERN = /^data\/[a-z0-9_./-]+\.json$/;
const LIFECYCLE_STATES = new Set(["running", "stopped"]);
const STATE_KEYS = new Set(["schemaVersion", "authority", "generatedAt", "expiresAt", "intents"]);
const INTENT_KEYS = new Set(["serviceId", "desiredState", "reason"]);

function isPlainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function isAuthorityId(value) {
    return typeof value === "string" && AUTHORITY_ID_PATTERN.test(value);
}

function isStatePath(value) {
    return typeof value === "string" && STATE_PATH_PATTERN.test(value);
}

function isServiceId(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 128;
}

// Optional, checked-in companion configuration. The dashboard remains standalone when this file
// is absent or invalid; callers receive an empty list rather than an exception.
export function normalizeExternalLifecycleAuthorities(rawConfig) {
    if (!isPlainObject(rawConfig) || !Array.isArray(rawConfig.authorities) || rawConfig.authorities.length > MAX_AUTHORITIES) {
        return [];
    }
    const authorityIds = new Set();
    const serviceIds = new Set();
    const normalized = [];
    for (const rawAuthority of rawConfig.authorities) {
        if (!isPlainObject(rawAuthority) || !isAuthorityId(rawAuthority.id) || !isStatePath(rawAuthority.statePath)) return [];
        if (!Array.isArray(rawAuthority.serviceIds) || rawAuthority.serviceIds.length === 0 || rawAuthority.serviceIds.length > MAX_SERVICES_PER_AUTHORITY) return [];
        const uniqueServiceIds = new Set(rawAuthority.serviceIds);
        if (authorityIds.has(rawAuthority.id) || uniqueServiceIds.size !== rawAuthority.serviceIds.length || !rawAuthority.serviceIds.every(isServiceId)) return [];
        if (rawAuthority.serviceIds.some((serviceId) => serviceIds.has(serviceId))) return [];
        authorityIds.add(rawAuthority.id);
        for (const serviceId of rawAuthority.serviceIds) serviceIds.add(serviceId);
        normalized.push({ id: rawAuthority.id, statePath: rawAuthority.statePath, serviceIds: [...rawAuthority.serviceIds] });
    }
    return normalized;
}

// Validates a single expiring authority lease. The caller supplies the static authority record so
// a runtime file can never nominate a different writer or expand its own target set.
export function readExternalLifecycleLease(rawState, authority, now = Date.now()) {
    if (!isPlainObject(rawState) || !authority || !isAuthorityId(authority.id)) return [];
    if (!Object.keys(rawState).every((key) => STATE_KEYS.has(key))) return [];
    if (rawState.schemaVersion !== 1 || rawState.authority !== authority.id) return [];
    if (!Number.isInteger(rawState.generatedAt) || !Number.isInteger(rawState.expiresAt)
        || rawState.generatedAt > now || rawState.expiresAt <= rawState.generatedAt
        || rawState.expiresAt - rawState.generatedAt > MAX_LEASE_TTL_MS || now >= rawState.expiresAt
        || !Array.isArray(rawState.intents) || rawState.intents.length > authority.serviceIds.length) return [];

    const permitted = new Set(authority.serviceIds);
    const seenServiceIds = new Set();
    const intents = [];
    for (const rawIntent of rawState.intents) {
        if (!isPlainObject(rawIntent) || !Object.keys(rawIntent).every((key) => INTENT_KEYS.has(key))) return [];
        if (!permitted.has(rawIntent.serviceId) || seenServiceIds.has(rawIntent.serviceId) || !LIFECYCLE_STATES.has(rawIntent.desiredState)) return [];
        if (typeof rawIntent.reason !== "string" || rawIntent.reason.length === 0 || rawIntent.reason.length > 512) return [];
        seenServiceIds.add(rawIntent.serviceId);
        intents.push({ serviceId: rawIntent.serviceId, desiredState: rawIntent.desiredState, reason: rawIntent.reason });
    }
    return intents;
}
