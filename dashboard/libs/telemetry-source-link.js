// Turns a telemetry attribution label into a link back to the service that owns the data.
//
// A widget footer reads "via Cloud Server Buyer", but that string is a display label chosen by the
// consuming descriptor - it does not name a service, and several descriptors merge sources from
// services whose menu entry is nowhere near the panel you are looking at (Server Manager shows
// Infrastructure Report's economics; Hacking Engine shows Progression Report's story state). The
// telemetry *path* is the identity: exactly one descriptor declares each file as its own
// `telemetry.path`, so a path resolves to a single owning service.
//
// This module deliberately holds no React. The four renderers that show a source label each carry
// their own React accessor (theme-adapter wraps a themed copy per module), so a shared component
// would have to pick one of them. Sharing only the resolve/navigate logic keeps every renderer
// building its own element with its own React, exactly as they already do.

let resolveOwningServiceId = () => "";
let navigateToService = null;

// Configured once from dashboard core, which is the only place that knows the service registry and
// how to change the selection. Renderers stay ignorant of both.
export function configureTelemetrySourceNavigation({ resolve, onNavigate } = {}) {
    if (typeof resolve === "function") resolveOwningServiceId = resolve;
    if (typeof onNavigate === "function") navigateToService = onNavigate;
}

/**
 * The service that owns `sourcePath`, or "" when there is nowhere useful to go: an unattributed
 * source, a path no descriptor claims, or the service you are already looking at. Callers render
 * plain text in that case rather than a link that does nothing.
 */
export function getTelemetrySourceTarget(sourcePath, currentServiceId = "") {
    if (typeof sourcePath !== "string" || !sourcePath) return "";
    if (typeof navigateToService !== "function") return "";
    const owner = resolveOwningServiceId(sourcePath);
    if (typeof owner !== "string" || !owner) return "";
    return owner === currentServiceId ? "" : owner;
}

export function navigateToTelemetrySource(serviceId) {
    if (typeof navigateToService !== "function") return;
    if (typeof serviceId !== "string" || !serviceId) return;
    navigateToService(serviceId);
}

/**
 * Shared presentation for a source label rendered as a link. Kept here so all four renderers agree:
 * a dotted underline reading as "this is followable" without turning a muted footnote into a button.
 */
export function getTelemetrySourceLinkStyle(baseStyle) {
    return {
        ...baseStyle,
        padding: 0,
        border: 0,
        background: "transparent",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        textDecoration: "underline dotted",
        textUnderlineOffset: "2px",
    };
}
