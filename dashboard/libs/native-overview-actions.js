export const NATIVE_OVERVIEW_ACTIONS = Object.freeze([
    {
        id: "save",
        nativeAriaLabel: "save game",
        ariaLabel: "Save game from Player Status",
        title: "Save game",
        fallbackColor: "#8ef0b5",
    },
    {
        id: "remote-api",
        nativeAriaLabel: "Remote API status",
        ariaLabel: "Toggle Remote API from Player Status",
        title: "Remote API connection",
        fallbackColor: "#8fc5ff",
    },
]);

export function findNativeOverviewButton(node, ariaLabel) {
    const documentApi = node?.ownerDocument;
    if (typeof documentApi?.querySelector !== "function") return null;
    return documentApi.querySelector(`button[aria-label="${ariaLabel}"]`);
}

export function readNativeOverviewActionState(node, action) {
    const nativeButton = findNativeOverviewButton(node, action.nativeAriaLabel);
    const nativeIcon = nativeButton?.querySelector?.("svg");
    const viewApi = node?.ownerDocument?.defaultView;
    const computedColor = nativeIcon && typeof viewApi?.getComputedStyle === "function"
        ? viewApi.getComputedStyle(nativeIcon).color
        : "";
    return {
        available: Boolean(nativeButton),
        color: computedColor || action.fallbackColor,
    };
}

export function runNativeOverviewAction(node, action) {
    const nativeButton = findNativeOverviewButton(node, action.nativeAriaLabel);
    if (typeof nativeButton?.click !== "function") return false;
    nativeButton.click();
    return true;
}
