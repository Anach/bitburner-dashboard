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
