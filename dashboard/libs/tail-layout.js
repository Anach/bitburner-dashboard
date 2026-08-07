export const DASHBOARD_WINDOW_MODE_WINDOWED = "windowed";
export const DASHBOARD_WINDOW_MODE_MAXIMIZED = "maximized";

export const DASHBOARD_STARTUP_MODE_REMEMBER = "Remember last mode";
export const DASHBOARD_STARTUP_MODE_WINDOWED = "Start windowed";
export const DASHBOARD_STARTUP_MODE_MAXIMIZED = "Start maximized";
export const DASHBOARD_STARTUP_MODES = [
    DASHBOARD_STARTUP_MODE_REMEMBER,
    DASHBOARD_STARTUP_MODE_WINDOWED,
    DASHBOARD_STARTUP_MODE_MAXIMIZED,
];

export const DASHBOARD_LAYOUT_TIER_COMPACT = "compact";
export const DASHBOARD_LAYOUT_TIER_STANDARD = "standard";
export const DASHBOARD_LAYOUT_TIER_WIDE = "wide";

export const DEFAULT_TAIL_WIDTH = 1420;
export const DEFAULT_TAIL_HEIGHT = 900;
export const DEFAULT_TAIL_TITLE_HEIGHT = 33;
export const MINIMUM_TAIL_WIDTH = 150;
export const MINIMUM_TAIL_HEIGHT = 33;
export const MINIMIZED_TAIL_WIDTH = 190;
export const MINIMIZED_TAIL_MARGIN = 12;

function finiteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function normalizeDashboardWindowMode(value) {
    return String(value ?? "").trim().toLowerCase() === DASHBOARD_WINDOW_MODE_MAXIMIZED
        ? DASHBOARD_WINDOW_MODE_MAXIMIZED
        : DASHBOARD_WINDOW_MODE_WINDOWED;
}

export function normalizeDashboardStartupMode(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === DASHBOARD_STARTUP_MODE_WINDOWED.toLowerCase()) return DASHBOARD_STARTUP_MODE_WINDOWED;
    if (normalized === DASHBOARD_STARTUP_MODE_MAXIMIZED.toLowerCase()) return DASHBOARD_STARTUP_MODE_MAXIMIZED;
    return DASHBOARD_STARTUP_MODE_REMEMBER;
}

export function resolveDashboardStartupWindowMode(startupMode, rememberedMode) {
    const normalizedStartup = normalizeDashboardStartupMode(startupMode);
    if (normalizedStartup === DASHBOARD_STARTUP_MODE_WINDOWED) return DASHBOARD_WINDOW_MODE_WINDOWED;
    if (normalizedStartup === DASHBOARD_STARTUP_MODE_MAXIMIZED) return DASHBOARD_WINDOW_MODE_MAXIMIZED;
    return normalizeDashboardWindowMode(rememberedMode);
}

export function normalizeViewport(rawViewport, fallback = { width: 1920, height: 1080 }) {
    const source = Array.isArray(rawViewport)
        ? { width: rawViewport[0], height: rawViewport[1] }
        : rawViewport ?? {};
    return {
        width: Math.max(MINIMUM_TAIL_WIDTH, Math.floor(finiteNumber(source.width, fallback.width))),
        height: Math.max(MINIMUM_TAIL_HEIGHT, Math.floor(finiteNumber(source.height, fallback.height))),
    };
}

export function normalizeTailGeometry(rawGeometry = {}, fallback = {}) {
    return {
        x: Math.floor(finiteNumber(rawGeometry.x, finiteNumber(fallback.x, 0))),
        y: Math.floor(finiteNumber(rawGeometry.y, finiteNumber(fallback.y, 0))),
        width: Math.max(MINIMUM_TAIL_WIDTH, Math.floor(finiteNumber(rawGeometry.width, finiteNumber(fallback.width, DEFAULT_TAIL_WIDTH)))),
        height: Math.max(MINIMUM_TAIL_HEIGHT, Math.floor(finiteNumber(rawGeometry.height, finiteNumber(fallback.height, DEFAULT_TAIL_HEIGHT)))),
    };
}

export function getDefaultWindowedGeometry(rawViewport) {
    const viewport = normalizeViewport(rawViewport);
    const width = Math.min(DEFAULT_TAIL_WIDTH, viewport.width);
    const height = Math.min(DEFAULT_TAIL_HEIGHT, viewport.height);
    return {
        x: Math.max(0, Math.floor((viewport.width - width) / 2)),
        y: Math.max(0, Math.floor((viewport.height - height) / 2)),
        width,
        height,
    };
}

export function fitWindowedGeometryToViewport(rawGeometry, rawViewport) {
    const viewport = normalizeViewport(rawViewport);
    const fallback = getDefaultWindowedGeometry(viewport);
    const geometry = normalizeTailGeometry(rawGeometry, fallback);
    const width = clamp(geometry.width, MINIMUM_TAIL_WIDTH, viewport.width);
    const height = clamp(geometry.height, MINIMUM_TAIL_HEIGHT, viewport.height);
    return {
        x: clamp(geometry.x, 0, viewport.width - width),
        y: clamp(geometry.y, 0, viewport.height - height),
        width,
        height,
    };
}

export function getMaximizedTailGeometry(rawViewport) {
    const viewport = normalizeViewport(rawViewport);
    return { x: 0, y: 0, width: viewport.width, height: viewport.height };
}

export function getMinimizedTailGeometry(rawViewport, expandedHeight = DEFAULT_TAIL_HEIGHT) {
    const viewport = normalizeViewport(rawViewport);
    const width = Math.min(MINIMIZED_TAIL_WIDTH, viewport.width);
    const height = clamp(expandedHeight, MINIMUM_TAIL_HEIGHT, viewport.height);
    return {
        x: Math.max(0, viewport.width - width - MINIMIZED_TAIL_MARGIN),
        y: Math.min(MINIMIZED_TAIL_MARGIN, Math.max(0, viewport.height - height)),
        width,
        height,
    };
}

export function tailGeometryDiffers(left, right, tolerance = 0.5) {
    if (!left || !right) return true;
    return ["x", "y", "width", "height"].some((key) => {
        const leftValue = Number(left[key]);
        const rightValue = Number(right[key]);
        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return true;
        return Math.abs(leftValue - rightValue) > tolerance;
    });
}

export function getDashboardLayoutTier(width) {
    const normalizedWidth = Math.max(0, finiteNumber(width));
    if (normalizedWidth < 1500) return DASHBOARD_LAYOUT_TIER_COMPACT;
    if (normalizedWidth < 2100) return DASHBOARD_LAYOUT_TIER_STANDARD;
    return DASHBOARD_LAYOUT_TIER_WIDE;
}

/**
 * @param {{mode?: string, minimized?: boolean, geometry?: object, viewport?: object | number[], titleHeight?: number}} [raw]
 */
// Every call otherwise allocates a fresh object even when nothing about the layout actually
// changed. The upstream geometry/viewport inputs are themselves freshly allocated most calls, so
// memoize on this function's own small set of final (cheap, primitive) output fields instead of
// trying to stabilize every object further upstream.
let cachedDashboardLayoutSnapshot = null;

export function buildDashboardLayoutSnapshot(raw = {}) {
    const { mode, minimized = false, geometry, viewport, titleHeight = DEFAULT_TAIL_TITLE_HEIGHT } = raw;
    const normalizedViewport = normalizeViewport(viewport);
    const normalizedGeometry = normalizeTailGeometry(geometry, getDefaultWindowedGeometry(normalizedViewport));
    const normalizedTitleHeight = clamp(finiteNumber(titleHeight, DEFAULT_TAIL_TITLE_HEIGHT), 0, normalizedGeometry.height);
    const contentHeight = Math.max(0, normalizedGeometry.height - normalizedTitleHeight);
    const normalizedMode = normalizeDashboardWindowMode(mode);

    const next = {
        mode: normalizedMode,
        maximized: normalizedMode === DASHBOARD_WINDOW_MODE_MAXIMIZED,
        minimized: Boolean(minimized),
        tailWidth: normalizedGeometry.width,
        tailHeight: normalizedGeometry.height,
        contentWidth: normalizedGeometry.width,
        contentHeight,
        viewportWidth: normalizedViewport.width,
        viewportHeight: normalizedViewport.height,
        layoutTier: getDashboardLayoutTier(normalizedGeometry.width),
    };

    const cached = cachedDashboardLayoutSnapshot;
    if (cached && Object.keys(next).every((key) => cached[key] === next[key])) {
        return cached;
    }
    cachedDashboardLayoutSnapshot = next;
    return next;
}
