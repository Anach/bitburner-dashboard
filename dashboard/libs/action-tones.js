export const ACTION_TONE_VALUES = new Set(["neutral", "success", "info", "warn", "danger"]);

export function normalizeActionTone(tone) {
    return ACTION_TONE_VALUES.has(tone) ? tone : "neutral";
}

export const ACTION_TONE_STYLES = {
    neutral: {
        borderColor: "rgba(120, 149, 137, 0.4)",
        color: "#789589",
        background: "rgba(14, 20, 17, 0.9)",
    },
    success: {
        borderColor: "rgba(110, 231, 168, 0.5)",
        color: "#d8ffea",
        background: "rgba(10, 32, 14, 0.95)",
    },
    info: {
        borderColor: "rgba(108, 180, 255, 0.5)",
        color: "#d8ecff",
        background: "rgba(10, 20, 34, 0.95)",
    },
    warn: {
        borderColor: "rgba(255, 198, 92, 0.5)",
        color: "#ffe8b5",
        background: "rgba(36, 24, 10, 0.95)",
    },
    danger: {
        borderColor: "rgba(255, 122, 122, 0.55)",
        color: "#ffd3d3",
        background: "rgba(36, 12, 12, 0.95)",
    },
};
