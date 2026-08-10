export const DASHBOARD_VIEW_METADATA = {
    "id": "system-overview",
    "renderer": "system-overview",
    "menuGroup": "overview",
    "menuOrder": -100,
    "menuLabel": "System Overview",
    "title": "System Overview",
    "subtitle": "Core dashboard status, capacity, and available service health.",
    "layout": {
        "columns": 4,
        "gap": 10
    },
    "widgets": [
        {
            "id": "live-summary",
            "type": "metrics",
            "title": "Dashboard Status",
            "subtitle": "Core signals and installed integration summaries",
            "columnStart": 1,
            "columnSpan": 4,
            "rowStart": 1,
            "includeSystem": true,
            "maxItems": 12
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
            "subtitle": "Home RAM and service capacity",
            "columnStart": 2,
            "columnSpan": 1,
            "rowStart": 2,
            "gaugeSize": 100,
            "includeSystem": true,
            "maxItems": 6
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
            "id": "available-trends",
            "type": "graphs",
            "title": "Available Trends",
            "subtitle": "Recent history from installed integrations",
            "columnStart": 1,
            "columnSpan": 4,
            "rowStart": 3,
            "graphColumns": 3,
            "graphHeight": 220,
            "maxItems": 3,
            "emptyText": "No integration history is available yet."
        }
    ]
};
