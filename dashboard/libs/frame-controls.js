export const DASHBOARD_FRAME_CONTROL_LABELS = Object.freeze({
    close: "CLOSE",
    maximize: "MAXIMIZE",
    restore: "RESTORE",
});

const FRAME_CONTROL_BASE_STYLE = Object.freeze({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flex: "0 0 auto",
    minWidth: 0,
    height: "24px",
    minHeight: "24px",
    width: "auto",
    padding: "4px 12px",
    fontFamily: "inherit",
    borderRadius: "5px",
    fontSize: "12px",
    lineHeight: 1,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "nowrap",
    pointerEvents: "auto",
    userSelect: "none",
    WebkitUserSelect: "none",
});

const FRAME_CONTROL_VARIANT_STYLES = Object.freeze({
    neutral: Object.freeze({
        border: "1px solid rgba(143, 197, 255, 0.58)",
        background: "rgba(7, 13, 17, 0.82)",
        color: "#c8e0ff",
    }),
    danger: Object.freeze({
        border: "1px solid rgba(255, 154, 154, 0.54)",
        background: "rgba(44, 12, 12, 0.82)",
        color: "#ffd2d2",
    }),
});

const FRAME_CONTROL_GROUP_STYLE = Object.freeze({
    display: "flex",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: "8px",
    flexWrap: "wrap",
});

const FRAME_HEADER_STYLE = Object.freeze({
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "start",
    gap: "12px",
    flex: "0 0 auto",
    minHeight: "44px",
    padding: "10px 10px 7px",
    boxSizing: "border-box",
});

const FRAME_CONTROL_OVERLAY_STYLE = Object.freeze({
    position: "absolute",
    top: "11px",
    right: "12px",
    zIndex: 8,
    ...FRAME_CONTROL_GROUP_STYLE,
});

export function getDashboardFrameControlStyle(variant = "neutral", overrides = null) {
    const tone = FRAME_CONTROL_VARIANT_STYLES[variant] ?? FRAME_CONTROL_VARIANT_STYLES.neutral;
    return {
        ...FRAME_CONTROL_BASE_STYLE,
        ...tone,
        ...(overrides && typeof overrides === "object" ? overrides : {}),
    };
}

export function getDashboardFrameControlGroupStyle(overrides = null) {
    return {
        ...FRAME_CONTROL_GROUP_STYLE,
        ...(overrides && typeof overrides === "object" ? overrides : {}),
    };
}

export function getDashboardFrameHeaderStyle(overrides = null) {
    return {
        ...FRAME_HEADER_STYLE,
        ...(overrides && typeof overrides === "object" ? overrides : {}),
    };
}

export function getDashboardFrameControlOverlayStyle(overrides = null) {
    return {
        ...FRAME_CONTROL_OVERLAY_STYLE,
        ...(overrides && typeof overrides === "object" ? overrides : {}),
    };
}

export function runDashboardFrameControlMouseDown(event, action) {
    event?.stopPropagation?.();
    if (typeof action === "function") action();
}

export function runDashboardFrameControlClick(event, action) {
    event?.stopPropagation?.();
    if (event?.detail !== 0 || typeof action !== "function") return;
    action();
}