// The single visual/reference catalog for every compact navigation glyph. Keep presentation,
// visibility, priority, and slot cost here so a glyph can be adjusted or audited without tracing
// individual menu render paths. Lower optional priority values remain visible first.
export const MENU_GLYPH_REFERENCE = Object.freeze({
    "api:singularity": { id: "api:singularity", family: "requirement", symbol: "∞", color: "#facc6b", label: "Singularity API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:gang": { id: "api:gang", family: "requirement", symbol: "G", color: "#fb7185", label: "Gang API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:sleeve": { id: "api:sleeve", family: "requirement", symbol: "Ⅱ", color: "#fb923c", label: "Sleeve API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:grafting": { id: "api:grafting", family: "requirement", symbol: "+", color: "#4f7fd9", label: "Grafting API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:bladeburner": { id: "api:bladeburner", family: "requirement", symbol: "†", color: "#7dd3fc", label: "Bladeburner API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:darknet": { id: "api:darknet", family: "requirement", symbol: "D", color: "#6ee7a8", label: "Darknet access", visibility: "optional", priority: 100, slotCost: 1 },
    "api:corporation": { id: "api:corporation", family: "requirement", symbol: "C", color: "#fbbf24", label: "Corporation API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:stanek": { id: "api:stanek", family: "requirement", symbol: "◇", color: "#c084fc", label: "Stanek's Gift API", visibility: "optional", priority: 100, slotCost: 1 },
    "api:hacknetServers": { id: "api:hacknetServers", family: "requirement", symbol: "H", color: "#67e8f9", label: "Hacknet Server API", visibility: "optional", priority: 100, slotCost: 1 },
    "program:Formulas.exe": { id: "program:Formulas.exe", family: "requirement", symbol: "ƒ", color: "#d8b4fe", label: "Formulas.exe", visibility: "optional", priority: 100, slotCost: 1 },
    "group:stock": { id: "stock:trading", family: "requirement", symbol: "$", color: "#5eead4", label: "Trading APIs", visibility: "optional", priority: 100, slotCost: 1 },
    "group:sourceFile": { id: "sourceFile:any", family: "requirement", symbol: "§", color: "#60a5fa", label: "Source Files", visibility: "optional", priority: 100, slotCost: 1 },
    "group:augmentation": { id: "augmentation:any", family: "requirement", symbol: "Δ", color: "#d8b4fe", label: "Augmentations", visibility: "optional", priority: 100, slotCost: 1 },
    "origin:core": { id: "menu-origin-core", family: "origin", symbol: "C", color: "#c8e0ff", label: "Dashboard core", visibility: "optional", priority: 1000, slotCost: 1 },
    "origin:plugin": { id: "menu-origin-plugin", family: "origin", symbol: "P", color: "#d9c4ff", label: "Dashboard plugin", visibility: "optional", priority: 1000, slotCost: 1 },
    "origin:integration": { id: "menu-origin-integration", family: "origin", symbol: "E", color: "#9ee9c0", label: "External integration", visibility: "optional", priority: 1000, slotCost: 1 },
    "health:warn": { id: "menu-health-warn", family: "health", symbol: "!", color: "#ffd88a", label: "Warning health", visibility: "persistent", priority: 0, slotCost: 1 },
    "health:danger": { id: "menu-health-danger", family: "health", symbol: "!!", color: "#ff9a9a", label: "Danger health", visibility: "persistent", priority: 0, slotCost: 2 },
    "daemon:running": { id: "menu-daemon-running", family: "runtime", symbol: "●", color: "#6ee7a8", label: "Daemon running", visibility: "persistent", priority: 0, slotCost: 1 },
    "daemon:stopped": { id: "menu-daemon-stopped", family: "runtime", symbol: "●", color: "#ff8080", label: "Daemon stopped", visibility: "persistent", priority: 0, slotCost: 1 },
    overflow: { id: "menu-unlock-overflow", family: "overflow", symbol: "+N", color: "#9ab0cc", label: "Additional optional glyphs", visibility: "optional", priority: 1000, slotCost: 1 },
});

const MENU_REQUIREMENT_GROUPS = Object.freeze({
    stock: "group:stock",
    sourceFile: "group:sourceFile",
    augmentation: "group:augmentation",
});

function toBadge(definition, label = definition?.label) {
    if (!definition) return null;
    return {
        id: definition.id,
        symbol: definition.symbol,
        color: definition.color,
        label,
        title: `${definition.symbol} - ${label}`,
        priority: definition.priority,
    };
}

export function getMenuRequirementGlyphDefinition(requirement) {
    if (!requirement || typeof requirement !== "object") return null;
    const referenceKey = MENU_REQUIREMENT_GROUPS[requirement.type] ?? `${requirement.type}:${requirement.id}`;
    return MENU_GLYPH_REFERENCE[referenceKey] ?? null;
}

export function buildMenuOriginGlyph(origin) {
    return toBadge(MENU_GLYPH_REFERENCE[`origin:${origin}`]);
}

export function getMenuHealthGlyph(level) {
    return MENU_GLYPH_REFERENCE[`health:${level}`] ?? null;
}

export function getMenuDaemonStatusGlyph(daemonRunning) {
    return MENU_GLYPH_REFERENCE[daemonRunning ? "daemon:running" : "daemon:stopped"];
}

export function getMenuGlyphSlotCost(referenceKey) {
    return Number(MENU_GLYPH_REFERENCE[referenceKey]?.slotCost) || 0;
}

export function sortOptionalMenuGlyphs(glyphs = []) {
    return (Array.isArray(glyphs) ? glyphs : [])
        .map((glyph, index) => ({ glyph, index }))
        .sort((left, right) => (left.glyph.priority ?? 0) - (right.glyph.priority ?? 0) || left.index - right.index)
        .map(({ glyph }) => glyph);
}

export function buildMenuGlyphOverflow(hiddenGlyphs = []) {
    const hidden = Array.isArray(hiddenGlyphs) ? hiddenGlyphs : [];
    const definition = MENU_GLYPH_REFERENCE.overflow;
    return {
        ...toBadge(definition, `${hidden.length} more optional glyphs`),
        symbol: `+${hidden.length}`,
        title: `Additional glyphs:\n${hidden.map((glyph) => `${glyph.symbol} - ${glyph.label}`).join("\n")}`,
    };
}
