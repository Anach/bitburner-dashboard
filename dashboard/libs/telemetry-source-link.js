// Turns a telemetry attribution label into a link back to the service that owns the data.
//
// A widget footer reads "via Cloud Server Buyer", but that string is a display label chosen by the
// consuming descriptor - it does not name a service, and several descriptors merge sources from
// services whose menu entry is nowhere near the panel you are looking at (Server Manager shows
// Infrastructure Report's economics; Hacking Engine shows Progression Report's story state). The
// telemetry *path* is the identity: exactly one descriptor declares each file as its own
// `telemetry.path`, so a path resolves to a single owning service.
//
// This module deliberately holds no React. The renderers that show a source label each carry
// their own React accessor (theme-adapter wraps a themed copy per module), so a shared component
// would have to pick one of them. Sharing only the resolve/navigate logic keeps every renderer
// building its own element with its own React, exactly as they already do.

/** @type {(sourcePath?: unknown, sourceLabel?: unknown) => string} */
let resolveOwningServiceId = () => "";
let navigateToService = null;

// Configured once from dashboard core, which is the only place that knows the service registry and
// how to change the selection. Renderers stay ignorant of both.
/** @param {{ resolve?: (sourcePath?: unknown, sourceLabel?: unknown) => string, onNavigate?: (serviceId: string) => void }} options */
export function configureTelemetrySourceNavigation({ resolve, onNavigate } = {}) {
    if (typeof resolve === "function") resolveOwningServiceId = resolve;
    if (typeof onNavigate === "function") navigateToService = onNavigate;
}

/**
 * The service that owns `sourcePath` (or matches `sourceLabel`), or "" when there is nowhere useful to go:
 * an unattributed source, a path/label no descriptor claims, or the service you are already looking at.
 * Callers render plain text in that case rather than a link that does nothing.
 */
export function getTelemetrySourceTarget(sourcePath, currentServiceId = "", sourceLabel = "") {
    if (typeof navigateToService !== "function") return "";
    const owner = resolveOwningServiceId(sourcePath, sourceLabel);
    if (typeof owner !== "string" || !owner) return "";
    return owner === currentServiceId ? "" : owner;
}

export function navigateToTelemetrySource(serviceId) {
    if (typeof navigateToService !== "function") return;
    if (typeof serviceId !== "string" || !serviceId) return;
    navigateToService(serviceId);
}

export function normalizeTelemetrySourceLabel(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return value == null ? "" : String(value);
    return String(value.label ?? value.sourceLabel ?? value.name ?? "");
}

export function getTelemetrySourceLinkInteractionHandlers(baseStyle = {}) {
    const baseColor = baseStyle.color ?? "";
    return {
        onMouseEnter: (event) => {
            event.currentTarget.style.color = "#b8f7c8";
            event.currentTarget.style.background = "rgba(110, 231, 168, 0.12)";
        },
        onMouseLeave: (event) => {
            event.currentTarget.style.color = baseColor;
            event.currentTarget.style.background = "transparent";
        },
    };
}

/**
 * Shared presentation for a source label rendered as a link. Kept here so all renderers agree:
 * a dotted underline reading as "this is followable" without turning a muted footnote into a button.
 */
export function getTelemetrySourceLinkStyle(baseStyle) {
    return {
        ...baseStyle,
        padding: 0,
        border: 0,
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
    };
}
