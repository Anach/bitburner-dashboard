export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "automation.serverBuyer",
    "menuGroup": "hardware",
    "menuLabel": "Server Buyer",
    "description": "Purchases and upgrades personal servers while tracking cloud-host hacking profit against server costs.",
    "requirements": [
        { "type": "api", "id": "singularity", "required": false }
    ],
    "daemon": false,
    "panels": [
        { "id": "status", "label": "Status", "title": "Server Buyer", "accent": "#6cb4ff", "subtitle": "Capacity, profit, and investment totals" },
        { "id": "graphs", "label": "Graphs", "title": "Server Buyer Graphs", "accent": "#c084fc", "subtitle": "Recent cloud-server profit and cost trends" },
        { "id": "servers", "label": "Servers", "title": "Cloud Servers", "accent": "#6cb4ff", "subtitle": "Fleet capacity and live utilization" }
    ],
    "lifecycle": {
        "startOnOptionIncrease": ["cloudCap"]
    },
    "options": {
        "cloudCap": { "default": 25, "type": "integer", "min": 1 }
    },
    "inputs": [
        { "id": "cloud-cap", "label": "Cloud Cap", "optionKey": "cloudCap", "type": "number", "min": 1 }
    ],
    "status": {
        "optionFields": [
            { "key": "cloudCap", "label": "Configured Cap", "tone": "info" }
        ]
    },
    "telemetry": {
        "path": "data/server_buyer_stats.json",
        "sources": [
            { "path": "data/infrastructure_economics.json", "sourceKey": "servers", "targetKey": "economics" }
        ],
        "overviewGauges": [
            {
                "id": "cloud-ram",
                "label": "Cloud RAM",
                "shortLabel": "CLOUD",
                "usedKey": "economics.ram.used",
                "totalKey": "economics.ram.total",
                "ratioKey": "economics.ram.ratio",
                "valueFormat": "ram",
                "order": 10
            }
        ],
        "fields": [
            { "key": "ownedServers", "label": "Owned Servers", "tone": "success", "panelId": "status" },
            { "key": "economics.totalProfit", "label": "Tracked Profit", "tone": "success", "format": "money", "panelId": "status" },
            { "key": "economics.totalCost", "label": "Total Cost", "tone": "warn", "format": "money", "panelId": "status" },
            { "key": "economics.netProfit", "label": "Net Return", "tone": "signed", "format": "signedMoney", "panelId": "status" },
            { "key": "economics.trackingStartedAt", "label": "Profit Tracking Since", "tone": "neutral", "format": "time", "panelId": "status" }
        ],
        "sections": [
            {
                "id": "server-economics",
                "type": "graph",
                "panelId": "graphs",
                "title": "Profit / Cost",
                "sourceKey": "economics.history",
                "xKey": "timestamp",
                "xFormat": "time",
                "yFormat": "money",
                "height": 250,
                "maxPoints": 240,
                "includeZero": true,
                "emptyText": "Collecting cloud-server economics history...",
                "series": [
                    { "key": "profit", "label": "Profit", "color": "#6ee7a8", "strokeWidth": 2.5 },
                    { "key": "cost", "label": "Cost", "color": "#ffc66c" },
                    { "key": "net", "label": "Net", "color": "#c084fc" }
                ]
            },
            {
                "type": "resource-cards",
                "panelId": "servers",
                "standalone": true,
                "sourceKey": "economics.inventory",
                "nameKey": "name",
                "idKey": "name",
                "nameLabel": "Cloud server",
                "nameEdit": {
                    "title": "Click to rename this cloud server",
                    "commandPrefix": "RenameServer:",
                    "separator": ":",
                    "encoding": "uri-component",
                    "startRuntime": true
                },
                "emptyText": "No cloud servers purchased.",
                "metrics": [
                    { "key": "ramTotal", "label": "RAM", "format": "ram" },
                    { "key": "cpuCores", "label": "Cores", "format": "number" },
                    { "key": "processCount", "label": "Processes", "format": "number" },
                    { "key": "threadCount", "label": "Threads", "format": "number" }
                ],
                "utilization": {
                    "label": "RAM utilization",
                    "ratioKey": "utilization",
                    "usedKey": "ramUsed",
                    "totalKey": "ramTotal",
                    "valueFormat": "ram"
                }
            }
        ]
    },
    "commands": {
        "port": 16,
        "requiresRuntime": false,
        "optionBindings": [
            { "optionKey": "cloudCap", "prefix": "CloudCap:" }
        ],
        "summaryOptions": ["cloudCap"]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
