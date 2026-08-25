export const CURRENT_WORK_FOCUS_MODE_FOCUSED = "focused";
export const CURRENT_WORK_FOCUS_MODE_BACKGROUND = "background";

export function normalizeCurrentWorkFocusMode(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === CURRENT_WORK_FOCUS_MODE_FOCUSED) return CURRENT_WORK_FOCUS_MODE_FOCUSED;
    if (normalized === CURRENT_WORK_FOCUS_MODE_BACKGROUND) return CURRENT_WORK_FOCUS_MODE_BACKGROUND;
    return null;
}

export function applyCurrentWorkFocus(ns, mode) {
    const normalizedMode = normalizeCurrentWorkFocusMode(mode);
    if (!normalizedMode) return false;
    try {
        return ns.singularity.setFocus(normalizedMode === CURRENT_WORK_FOCUS_MODE_FOCUSED);
    } catch (error) {
        // No active work, or Singularity access disappeared during a reset. Both are harmless:
        // the dashboard window transition must never produce an error popup or retry toast.
        return false;
    }
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    applyCurrentWorkFocus(ns, ns.args[0]);
}
