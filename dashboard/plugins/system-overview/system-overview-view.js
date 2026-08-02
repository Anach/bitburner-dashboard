export const DASHBOARD_VIEW_METADATA = {
    "id": "system-overview",
    "renderer": "system-overview",
    "menuGroup": "overview",
    "menuLabel": "System Overview",
    "title": "System Overview",
    "subtitle": "Live automation, progression, capacity, and economic signals.",
    "layout": {
        "columns": 4,
        "gap": 10
    },
    "widgets": [
        {
            "id": "live-summary",
            "type": "metrics",
            "title": "Live Summary",
            "subtitle": "Current quick-view signals",
            "columnStart": 1,
            "columnSpan": 4,
            "rowStart": 1,
            "includeSystem": true,
            "itemIds": [
                "progression.report:rootedUnrooted",
                "progression.report:hosts",
                "progression.report:xpRate",
                "progression.report:nextLevel",
                "progression.report:eta",
                "automation.batcher:modeLabel",
                "system:runningScripts"
            ]
        },
        {
            "id": "system-health",
            "type": "health",
            "title": "System Health",
            "subtitle": "Warnings and service state",
            "columnStart": 1,
            "columnSpan": 1,
            "rowStart": 2,
            "maxAlerts": 2
        },
        {
            "id": "capacity",
            "type": "gauges",
            "title": "Capacity",
            "subtitle": "Live utilization",
            "columnStart": 2,
            "columnSpan": 1,
            "rowStart": 2,
            "gaugeSize": 100,
            "itemIds": [
                "automation.serverBuyer:cloud-ram",
                "hardware.home:ram"
            ]
        },
        {
            "id": "service-landscape",
            "type": "service-health",
            "title": "Service Landscape",
            "subtitle": "Health by dashboard category",
            "columnStart": 3,
            "columnSpan": 2,
            "rowStart": 2
        },
        {
            "id": "priority-history",
            "type": "graphs",
            "title": "Priority History",
            "subtitle": "Selected integration trends",
            "columnStart": 1,
            "columnSpan": 4,
            "rowStart": 3,
            "graphColumns": 4,
            "graphHeight": 250,
            "maxItems": 4,
            "itemIds": [
                "automation.stockTrader:stock-pnl",
                "automation.serverBuyer:server-economics",
                "automation.hacknetBuyer:hacknet-economics",
                "automation.ipvgo:ipvgo-results"
            ]
        }
    ]
};
