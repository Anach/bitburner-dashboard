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

export function buildPluginRequirementsSnapshot(ns, services = []) {
    const snapshot = buildCapabilitySnapshot(ns);

    return Object.fromEntries((services ?? []).map((service) => {
        const requirements = Array.isArray(service?.requirements) ? service.requirements : [];
        return [service.id, requirements.map((requirement) => ({
            label: getRequirementLabel(requirement),
            unlocked: isCapabilityRequirementMet(requirement, snapshot),
            optional: requirement.required === false,
        }))];
    }));
}

export function buildPluginRequirementSection(requirements = []) {
    if (!Array.isArray(requirements)) return null;
    const hasUnmetRequirements = requirements.some((requirement) => !requirement.unlocked && !requirement.optional);
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
