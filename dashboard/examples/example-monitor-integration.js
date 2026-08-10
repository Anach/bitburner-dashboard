export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "example.monitor",
    "menuGroup": "automation",
    "menuLabel": "Example Monitor",
    "description": "Demonstrates status, telemetry, graphs, options, requirements, and runtime commands.",
    "requirements": [
        { "type": "program", "id": "Formulas.exe", "required": false }
    ],
    "daemon": true,
    "panels": [
        {
            "id": "status",
            "label": "Status",
            "title": "Example Monitor",
            "accent": "#6ee7a8",
            "subtitle": "Current state and lifetime totals"
        },
        {
            "id": "history",
            "label": "Graphs",
            "title": "Example Monitor History",
            "accent": "#c084fc",
            "subtitle": "Recent values published by the runtime"
        }
    ],
    "serviceTables": [
        {
            "targetServiceId": "global.portRegistry",
            "tableId": "ports",
            "rows": [
                { "port": 29, "constant": "EXAMPLE_MONITOR_COMMAND_PORT", "service": "Example Monitor", "channel": "Example", "repo": "dashboard", "owner": "dashboard/examples/example-monitor-integration.js" }
            ]
        }
    ],
    "options": {
        "sampleInterval": { "default": 5000, "type": "integer", "min": 1000 },
        "notifications": { "default": true, "type": "boolean" }
    },
    "inputs": [
        {
            "id": "sample-interval",
            "label": "Sample Interval (ms)",
            "optionKey": "sampleInterval",
            "type": "number",
            "min": 1000
        },
        {
            "id": "notifications",
            "label": "Notifications",
            "optionKey": "notifications",
            "type": "checkbox"
        }
    ],
    "telemetry": {
        "path": "data/example_monitor.json",
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "state", "label": "State", "tone": "info", "panelId": "status" },
            { "key": "cycles", "label": "Cycles", "tone": "success", "format": "number", "panelId": "status" },
            { "key": "profit", "label": "Lifetime Profit", "tone": "signed", "format": "signedMoney", "panelId": "status" }
        ],
        "sections": [
            {
                "id": "example-profit",
                "type": "graph",
                "panelId": "history",
                "title": "Profit",
                "sourceKey": "history",
                "xKey": "timestamp",
                "xFormat": "time",
                "yFormat": "money",
                "height": 250,
                "maxPoints": 240,
                "includeZero": true,
                "emptyText": "Waiting for example history...",
                "series": [
                    { "key": "profit", "label": "Profit", "color": "#6ee7a8", "strokeWidth": 2.5 }
                ]
            }
        ]
    },
    "actions": [
        {
            "id": "reset-history",
            "label": "Reset History",
            "icon": "R",
            "command": "ResetHistory",
            "activeTone": "warn",
            "inactiveTone": "warn",
            "order": 10
        }
    ],
    "commands": {
        "port": 29,
        "optionBindings": [
            { "optionKey": "sampleInterval", "prefix": "SampleInterval:" },
            { "optionKey": "notifications", "trueValue": "Notifications:on", "falseValue": "Notifications:off" }
        ],
        "summaryOptions": ["sampleInterval", "notifications"]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
