import { buildCapabilitySnapshot, isCapabilityRequirementMet } from "dashboard/libs/capabilities.js";

const API_LABELS = {
    singularity: "Singularity API",
    bladeburner: "Bladeburner API",
    gang: "Gang API",
    corporation: "Corporation API",
    sleeve: "Sleeve API",
    stanek: "Stanek's Gift API",
    darknet: "Darknet API",
};

const STOCK_ACCESS_LABELS = {
    wse: "WSE Account",
    tix: "TIX API",
    "4s": "4S Market Data",
    "4s-tix": "4S Market Data TIX API",
};

const MENU_REQUIREMENT_BADGES = {
    "api:singularity": { symbol: "∞", color: "#facc6b", label: "Singularity API" },
    "api:gang": { symbol: "G", color: "#fb7185", label: "Gang API" },
    "api:sleeve": { symbol: "Ⅱ", color: "#fb923c", label: "Sleeve API" },
    "api:grafting": { symbol: "+", color: "#4f7fd9", label: "Grafting API" },
    "api:bladeburner": { symbol: "†", color: "#7dd3fc", label: "Bladeburner API" },
    "api:darknet": { symbol: "D", color: "#6ee7a8", label: "Darknet access" },
    "api:corporation": { symbol: "C", color: "#fbbf24", label: "Corporation API" },
    "api:stanek": { symbol: "◇", color: "#c084fc", label: "Stanek's Gift API" },
    "program:Formulas.exe": { symbol: "ƒ", color: "#d8b4fe", label: "Formulas.exe" },
};

const GROUPED_MENU_REQUIREMENT_BADGES = {
    stock: {
        id: "stock:trading",
        symbol: "$",
        color: "#5eead4",
        label: "Trading APIs",
    },
    sourceFile: {
        id: "sourceFile:any",
        symbol: "§",
        color: "#60a5fa",
        label: "Source Files",
    },
    augmentation: {
        id: "augmentation:any",
        symbol: "Δ",
        color: "#d8b4fe",
        label: "Augmentations",
    },
};

const PANEL_REQUIREMENTS_BY_SERVICE_KEY = "__dashboardPanelRequirementsByService";

function getRequirementLabel(requirement) {
    if (typeof requirement.label === "string" && requirement.label.length > 0) return requirement.label;
    if (requirement.type === "api") return API_LABELS[requirement.id] ?? `${requirement.id} API`;
    if (requirement.type === "sourceFile") return `Source-File ${requirement.id}`;
    if (requirement.type === "augmentation") return String(requirement.id);
    if (requirement.type === "program") return String(requirement.id);
    if (requirement.type === "stock") return STOCK_ACCESS_LABELS[requirement.id] ?? `Stock: ${requirement.id}`;
    if (requirement.type === "bitNode") return `BitNode ${requirement.id}`;
    return String(requirement.id ?? "Unknown requirement");
}

export function hasUnmetPluginRequirements(requirements = []) {
    return (Array.isArray(requirements) ? requirements : []).some((requirement) => !requirement?.unlocked && !requirement?.optional);
}

// Maps a "Hide unqualified plugins" dropdown mode to the specific capability requirement it
// gates on. Add an entry here (and a matching mode value in dashboard-options.js) as other
// capability-gated plugins become worth blanket-hiding - today only Singularity applies.
const QUALIFICATION_MODE_REQUIREMENT_FILTERS = {
    Singularity: { type: "api", id: "singularity" },
};

export function isHiddenByQualificationMode(requirements, mode) {
    const filter = QUALIFICATION_MODE_REQUIREMENT_FILTERS[mode];
    if (!filter) return false;
    return (Array.isArray(requirements) ? requirements : []).some((requirement) => {
        return !requirement?.unlocked
            && !requirement?.optional
            && requirement?.type === filter.type
            && requirement?.id === filter.id;
    });
}

function evaluateRequirements(requirements, snapshot) {
    return (Array.isArray(requirements) ? requirements : []).map((requirement) => ({
        type: requirement.type,
        id: requirement.id,
        label: getRequirementLabel(requirement),
        unlocked: isCapabilityRequirementMet(requirement, snapshot),
        optional: requirement.required === false,
    }));
}

/**
 * Convert standard requirement metadata into compact menu-only unlock markers.
 * Multiple stock access requirements intentionally collapse into one Trading APIs marker.
 */
export function buildPluginMenuRequirementBadges(requirements = []) {
    const badges = new Map();

    for (const requirement of Array.isArray(requirements) ? requirements : []) {
        if (!requirement || typeof requirement !== "object") continue;

        const requirementKey = `${requirement.type}:${requirement.id}`;
        const definition = GROUPED_MENU_REQUIREMENT_BADGES[requirement.type]
            ?? MENU_REQUIREMENT_BADGES[requirementKey];
        if (!definition) continue;

        const id = definition.id ?? requirementKey;
        if (badges.has(id)) continue;
        const label = typeof requirement.menuLabel === "string" && requirement.menuLabel.length > 0
            ? requirement.menuLabel
            : definition.label ?? getRequirementLabel(requirement);
        badges.set(id, {
            id,
            symbol: definition.symbol,
            color: definition.color,
            label,
            title: `${definition.symbol} - ${label}`,
        });
    }

    return [...badges.values()];
}

/**
 * Keep the menu rail compact while preserving access to every unlock through the overflow tooltip.
 */
export function compactPluginMenuRequirementBadges(badges = [], maxBadges = 5) {
    const normalizedBadges = Array.isArray(badges) ? badges : [];
    const limit = Math.max(0, Math.floor(Number(maxBadges) || 0));
    if (normalizedBadges.length <= limit) return normalizedBadges;
    if (limit === 0) return [];

    const visibleCount = Math.max(0, limit - 1);
    const hiddenBadges = normalizedBadges.slice(visibleCount);
    const hiddenKey = hiddenBadges
        .map((badge) => `${badge.symbol} - ${badge.label}`)
        .join("\n");
    return [
        ...normalizedBadges.slice(0, visibleCount),
        {
            id: "menu-unlock-overflow",
            symbol: `+${hiddenBadges.length}`,
            color: "#9ab0cc",
            label: `${hiddenBadges.length} more unlocks`,
            title: `Additional unlocks:\n${hiddenKey}`,
        },
    ];
}

export function getPluginMenuRequirementBadgeBudget(maxGlyphCount, healthLevel = "neutral", hasRuntimeStatus = false) {
    const limit = Math.max(0, Math.floor(Number(maxGlyphCount) || 0));
    const healthGlyphCount = healthLevel === "danger" ? 2 : healthLevel === "warn" ? 1 : 0;
    const runtimeGlyphCount = hasRuntimeStatus ? 1 : 0;
    return Math.max(0, limit - healthGlyphCount - runtimeGlyphCount);
}

export function buildPluginRequirementsSnapshot(ns, services = [], capabilitySnapshot) {
    const snapshot = capabilitySnapshot ?? buildCapabilitySnapshot(ns);
    const result = {};
    const panelRequirementsByService = {};

    for (const service of services ?? []) {
        result[service.id] = evaluateRequirements(service?.requirements, snapshot);

        const panels = Array.isArray(service?.pluginMetadata?.panels)
            ? service.pluginMetadata.panels
            : [];
        const panelRequirements = Object.fromEntries(panels
            .filter((panel) => Array.isArray(panel?.requirements) && panel.requirements.length > 0)
            .map((panel) => [panel.id, evaluateRequirements(panel.requirements, snapshot)]));
        if (Object.keys(panelRequirements).length > 0) {
            panelRequirementsByService[service.id] = panelRequirements;
        }
    }

    result[PANEL_REQUIREMENTS_BY_SERVICE_KEY] = panelRequirementsByService;
    return result;
}

export function getPluginRequirementsForPanel(pluginRequirements, serviceId, panelId) {
    const serviceRequirements = pluginRequirements?.[serviceId] ?? [];
    const panelRequirements = pluginRequirements?.[PANEL_REQUIREMENTS_BY_SERVICE_KEY]?.[serviceId]?.[panelId] ?? [];
    return [...serviceRequirements, ...panelRequirements];
}

export function buildPluginRequirementSection(requirements = []) {
    if (!Array.isArray(requirements)) return null;
    const hasUnmetRequirements = hasUnmetPluginRequirements(requirements);
    return {
        type: "items",
        title: "Requirements",
        items: requirements.length > 0
            ? requirements.map((requirement) => {
                const status = requirement.unlocked
                    ? "Unlocked"
                    : requirement.optional ? "Locked (optional)" : "Locked (required)";
                return { title: `${requirement.label} - ${status}`, detail: "" };
            })
            : [{ title: "None", detail: "" }],
        borderColor: hasUnmetRequirements ? "rgba(255, 198, 92, 0.45)" : "rgba(108, 180, 255, 0.18)",
        background: hasUnmetRequirements ? "rgba(34, 22, 10, 0.95)" : undefined,
        titleColor: hasUnmetRequirements ? "#ffd88a" : undefined,
        itemColor: hasUnmetRequirements ? "#ffe1a6" : undefined,
    };
}
