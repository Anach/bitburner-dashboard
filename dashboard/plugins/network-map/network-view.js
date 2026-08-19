// direct/route/hop (and the open-location/work-company nodeActions above) all require Singularity
// (ns.singularity.connect), handled by the dedicated network-navigator-singularity.js worker on
// its own port 25 - see network-navigator.js's tiered split. setModePrefix/refreshCommand stay on
// the base integration's default port (no "port" field) since network-navigator.js itself handles
// those without any Singularity dependency.
//
// NOTE: this object is parsed via a JSON.parse() of its literal text (dashboard/libs/metadata-
// parser.js), not a real JS import - it must stay strict JSON inside the braces below: no
// comments, no trailing commas, string keys only.
export const DASHBOARD_VIEW_METADATA = {
    "id": "network",
    "manualFile": "network-map",
    "renderer": "network-map",
    "menuGroup": "software",
    "menuLabel": "Network Map",
    "title": "Network Navigator",
    "subtitle": "Known normal-network routes, access state, and server resources.",
    "widgets": [],
    "data": {
        "serviceId": "navigation.network",
        "nodesKey": "nodes",
        "edgesKey": "edges",
        "currentKey": "currentHost",
        "updatedKey": "generatedAt",
        "capabilityKey": "canConnect",
        "lastResultKey": "lastCommand",
        "mapsKey": "maps",
        "mapOptionsKey": "mapOptions"
    },
    "fields": {
        "id": "id",
        "parent": "parent",
        "depth": "depth",
        "label": "hostname",
        "subtitle": "ip",
        "detail": "organization",
        "route": "route",
        "neighbors": "neighbors",
        "current": "connected",
        "direct": "directConnect",
        "cloud": "cloud",
        "group": "group",
        "variant": "variant",
        "selectable": "selectable",
        "accent": "accent",
        "status": "status",
        "statusTone": "statusTone",
        "edgeSource": "source",
        "edgeTarget": "target"
    },
    "stateSets": {
        "network": [
            { "key": "hasRoot", "label": "Root", "trueText": "rooted", "falseText": "no root", "trueTone": "success", "falseTone": "danger" },
            { "key": "backdoorInstalled", "label": "Backdoor", "trueText": "installed", "falseText": "missing", "trueTone": "success", "falseTone": "neutral" },
            { "key": "withinHackLevel", "label": "Skill", "trueText": "ready", "falseText": "blocked", "trueTone": "success", "falseTone": "warn" }
        ],
        "city": []
    },
    "metricSets": {
        "network": [
            { "key": "requiredHackingSkill", "label": "Required skill", "format": "number" },
            { "key": "openPorts", "secondaryKey": "portsRequired", "label": "Open ports", "format": "ratio" },
            { "key": "ramUsed", "secondaryKey": "ramMax", "label": "RAM", "format": "ramRatio" },
            { "key": "moneyAvailable", "secondaryKey": "moneyMax", "label": "Money", "format": "moneyRatio" },
            { "key": "moneyRatio", "label": "Current money", "format": "percent" },
            { "key": "security", "secondaryKey": "minSecurity", "label": "Security", "format": "ratio" },
            { "key": "securityAboveMinimum", "label": "Security over minimum", "format": "decimal" },
            { "key": "growth", "label": "Current growth", "format": "number" },
            { "key": "currentlyBeingHacked", "label": "Currently being hacked?", "format": "boolean" },
            { "key": "contractCount", "label": "Number of contracts", "format": "number" },
            { "key": "xpPerSecondPerThread", "label": "XP suitability", "format": "xpSuitability", "rootKey": "hasRoot", "eligibleKey": "withinHackLevel", "selectedKey": "xpTarget", "requiredSkillKey": "requiredHackingSkill", "estimateKey": "xpScoreIsEstimate" }
        ],
        "city": [
            { "key": "locationTypes", "label": "Location type", "visibleKey": "isLocation" },
            { "key": "attachedServerLabel", "label": "Attached server", "visibleKey": "isLocation" },
            { "key": "serverAccessLabel", "label": "Server access", "visibleKey": "hasAttachedServer" },
            { "key": "currentJobLabel", "label": "Current job", "visibleKey": "isCompany" },
            { "key": "companyRepLabel", "label": "Company rep", "visibleKey": "isCompany" },
            { "key": "companyFavorLabel", "label": "Company favor", "visibleKey": "isCompany" },
            { "key": "interactionStatus", "label": "Interaction", "visibleKey": "isLocation" }
        ]
    },
    "resultFields": {
        "status": "status",
        "message": "message",
        "timestamp": "timestamp"
    },
    "filters": {
        "showCloudDefault": false,
        "cloudLabel": "Cloud servers",
        "nodeFilters": [
            { "id": "rooted", "label": "Rooted", "key": "hasRoot", "accent": "#8ef0b5" },
            { "id": "backdoored", "label": "Backdoored", "key": "backdoorInstalled", "accent": "#6cb4ff" },
            { "id": "contracts", "label": "Contracts", "key": "hasContract", "accent": "#ff7bd0" },
            { "id": "story", "label": "Story", "key": "story", "accent": "#f0a65a" }
        ]
    },
    "modeSelector": {
        "defaultId": "network",
        "buttonLabel": "Cities",
        "popupTitle": "Map view",
        "idKey": "id",
        "labelKey": "label",
        "noteKey": "note",
        "currentKey": "current",
        "layoutKey": "layout",
        "routesKey": "showRoutes",
        "cloudKey": "showCloud",
        "filtersKey": "showNodeFilters",
        "stateSetKey": "stateSet",
        "metricSetKey": "metricSet",
        "selectionLabelKey": "selectionLabel",
        "searchPlaceholderKey": "searchPlaceholder"
    },
    "layout": {
        "nodeWidth": 154,
        "nodeHeight": 76,
        "columnGap": 72,
        "rowGap": 24,
        "padding": 80,
        "overlayInsetRight": 404,
        "inspectorWidth": 380,
        "inspectorLabelWidth": 178,
        "groupGap": 34,
        "maxGroupRows": 4,
        "groupOrder": ["Companies", "Training", "Services", "Special"],
        "hubVariant": "hub",
        "groupVariant": "group",
        "minScale": 0.35,
        "maxScale": 1.8
    },
    "nodeActions": [
        {
            "id": "copy-terminal-route",
            "type": "clipboard",
            "label": "Copy terminal path",
            "targetKey": "terminalConnectCommand",
            "visibleKey": "terminalConnectCommand"
        },
        {
            "id": "open-location",
            "label": "Open location",
            "labelKey": "openActionLabel",
            "prefix": "OpenLocation:",
            "targetKey": "actionTarget",
            "visibleKey": "isLocation",
            "enabledKey": "canOpenLocation",
            "disabledReasonKey": "openBlockedReason",
            "lockedLabelSuffix": "LOCKED",
            "port": 25
        },
        {
            "id": "work-company",
            "label": "Work",
            "labelKey": "workActionLabel",
            "prefix": "WorkCompany:",
            "targetKey": "actionTarget",
            "visibleKey": "isEmployed",
            "enabledKey": "canWorkCompany",
            "disabledReasonKey": "workBlockedReason",
            "lockedLabelSuffix": "LOCKED",
            "port": 25
        }
    ],
    "actions": {
        "serviceId": "navigation.network",
        "directPrefix": "ConnectDirect:",
        "routePrefix": "ConnectRoute:",
        "hopPrefix": "ConnectHop:",
        "port": 25,
        "setModePrefix": "SetMode:",
        "refreshCommand": "Refresh",
        "directLabel": "Direct connect",
        "routeLabel": "Auto route",
        "stepLabel": "Step route",
        "unavailableMessage": "Automatic connections require Singularity access. Use Copy terminal path, then paste the command into the Terminal."
    }
};
