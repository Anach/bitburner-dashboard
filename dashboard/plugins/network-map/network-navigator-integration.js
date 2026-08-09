export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "navigation.network",
    "menuGroup": "software",
    "menuLabel": "Network Telemetry",
    "menuVisible": false,
    "description": "Publishes normal-network topology and city locations, and handles dashboard navigation requests.",
    "requirements": [
        { "type": "api", "id": "singularity", "required": false }
    ],
    "daemon": true,
    "panels": [
        { "id": "status", "label": "Status", "title": "Network Telemetry", "accent": "#6ee7a8", "subtitle": "Known server topology, city locations, and navigation capability" }
    ],
    "telemetry": {
        "path": "data/network_navigator_stats.json",
        "overviewGauges": [
            {
                "id": "network-ram",
                "label": "Network RAM",
                "shortLabel": "NETWORK",
                "usedKey": "networkRam.used",
                "totalKey": "networkRam.total",
                "ratioKey": "networkRam.ratio",
                "valueFormat": "ram",
                "order": 20
            }
        ],
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "currentHost", "label": "Connected To", "tone": "info", "panelId": "status" },
            { "key": "currentCity", "label": "Current City", "tone": "info", "panelId": "status" },
            { "key": "knownServers", "label": "Known Servers", "tone": "neutral", "format": "number", "panelId": "status" },
            { "key": "rootedServers", "label": "Rooted", "tone": "success", "format": "number", "panelId": "status" },
            { "key": "backdooredServers", "label": "Backdoored", "tone": "success", "format": "number", "panelId": "status" },
            { "key": "formulasAvailable", "label": "Formulas Score (precise XP scoring)", "tone": "info", "panelId": "status" },
            { "key": "canConnect", "label": "Singularity Access (travel, auto-connect, company work)", "tone": "info", "panelId": "status" },
            { "key": "lastCommand.message", "label": "Last Navigation", "tone": "neutral", "panelId": "status" }
        ]
    },
    "commands": {
        "port": 20,
        "requiresRuntime": true
    }
};
