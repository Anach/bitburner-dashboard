export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "metadata",
    "serviceId": "automation.contractScanner",
    "menuGroup": "hacking",
    "menuLabel": "Contract Scanner",
    "description": "Scans the network for coding contracts, messages, and lore while tracking supported and unsupported contract work.",
    "daemon": true,
    "requirements": [],
    "alwaysVisible": true,
    "defaultPanelId": "status",
    "panels": [
        { "id": "status", "label": "Status", "title": "Contract Scanner", "accent": "#6cb4ff", "subtitle": "Contract discovery and solver coverage" }
    ],
    "telemetry": {
        "path": "data/contract_scanner_stats.json",
        "sources": [
            { "path": "data/contract_rewards.json", "targetKey": "rewards" }
        ],
        "fields": [
            { "key": "knownAlgorithms", "label": "Known Algorithms", "tone": "info" },
            { "key": "lifetimeSolved", "label": "Lifetime Solved", "tone": "success" },
            { "key": "rewards.totalMoney", "label": "Total Money Rewards", "tone": "success", "format": "money" },
            { "key": "rewards.totalFactionReputation", "label": "Total Faction Rep", "tone": "success", "format": "number" },
            { "key": "rewards.totalCompanyReputation", "label": "Total Company Rep", "tone": "success", "format": "number" },
            { "key": "rewards.trackingStartedAt", "label": "Reward Tracking Since", "tone": "neutral", "format": "time" },
            { "key": "pendingSolvable", "label": "Pending Solvable", "tone": "info" },
            { "key": "pendingUnsupported", "label": "Pending Unsupported", "tone": "warnWhenPositive" }
        ],
        "sections": [
            { "type": "string-list", "title": "Known Algorithms", "sourceKey": "supportedAlgorithms" }
        ]
    }
};
