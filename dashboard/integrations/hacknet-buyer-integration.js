export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "automation.hacknetBuyer",
    "menuGroup": "hardware",
    "menuLabel": "Hacknet Buyer",
    "description": "Purchases and upgrades Hacknet nodes while tracking production profit against Hacknet costs.",
    "requirements": [],
    "daemon": false,
    "panels": [
        { "id": "status", "label": "Status", "title": "Hacknet Buyer", "accent": "#6ee7a8", "subtitle": "Capacity, profit, and investment totals" },
        { "id": "graphs", "label": "Graphs", "title": "Hacknet Buyer Graphs", "accent": "#c084fc", "subtitle": "Recent Hacknet profit and cost trends" }
    ],
    "lifecycle": {
        "startOnOptionIncrease": ["hacknetCap"]
    },
    "options": {
        "hacknetCap": { "default": 25, "type": "integer", "min": 1 }
    },
    "inputs": [
        { "id": "hacknet-cap", "label": "Hacknet Cap", "optionKey": "hacknetCap", "type": "number", "min": 1 }
    ],
    "status": {
        "optionFields": [
            { "key": "hacknetCap", "label": "Configured Cap", "tone": "info" }
        ]
    },
    "telemetry": {
        "path": "data/hacknet_buyer_stats.json",
        "sources": [
            { "path": "data/infrastructure_economics.json", "sourceKey": "hacknet", "targetKey": "economics" }
        ],
        "fields": [
            { "key": "ownedNodes", "label": "Owned Nodes", "tone": "success", "panelId": "status" },
            { "key": "economics.totalProfit", "label": "Total Profit", "tone": "success", "format": "money", "panelId": "status" },
            { "key": "economics.totalCost", "label": "Total Cost", "tone": "warn", "format": "money", "panelId": "status" },
            { "key": "economics.netProfit", "label": "Net Return", "tone": "signed", "format": "signedMoney", "panelId": "status" }
        ],
        "sections": [
            {
                "id": "hacknet-economics",
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
                "emptyText": "Collecting Hacknet economics history...",
                "series": [
                    { "key": "profit", "label": "Profit", "color": "#6ee7a8", "strokeWidth": 2.5 },
                    { "key": "cost", "label": "Cost", "color": "#ffc66c" },
                    { "key": "net", "label": "Net", "color": "#c084fc" }
                ]
            }
        ]
    },
    "commands": {
        "port": 17,
        "optionBindings": [
            { "optionKey": "hacknetCap", "prefix": "HacknetCap:" }
        ],
        "summaryOptions": ["hacknetCap"]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
