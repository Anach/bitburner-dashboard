/** Small React bridge kept inside BBS Connect so the package has no dashboard dependency. */
export function getReact() {
    const react = globalThis.React ?? null;
    if (!react) throw new Error("globalThis.React is unavailable in this game version.");
    return react;
}

export function h(type, props, ...children) {
    return getReact().createElement(type, props, ...children);
}


