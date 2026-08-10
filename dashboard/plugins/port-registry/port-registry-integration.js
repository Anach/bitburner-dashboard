export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "static",
    "serviceId": "global.portRegistry",
    "menuGroup": "globalOptions",
    "menuLabel": "Port Registry",
    "description": "Lists the Netscript ports declared by installed dashboard and script integrations.",
    "daemon": false,
    "alwaysVisible": true,
    "defaultPanelId": "registry",
    "panels": [
        {
            "id": "registry",
            "label": "Registry",
            "title": "Port Registry",
            "accent": "#c084fc",
            "subtitle": "Netscript IPC assignments contributed by installed integrations"
        }
    ],
    "tables": [
        {
            "id": "ports",
            "panelId": "registry",
            "standalone": true,
            "rowKey": "constant",
            "sortKey": "port",
            "conflictKey": "port",
            "minWidth": "760px",
            "emptyText": "No installed integration has declared a port assignment.",
            "summaries": [
                { "label": "assigned ports", "aggregate": "count", "format": "suffix" },
                { "label": "Next free", "aggregate": "maxPlusOne", "key": "port" },
                { "label": "Conflicts", "aggregate": "conflictCount", "hideWhenZero": true, "tone": "danger" }
            ],
            "columns": [
                { "key": "port", "label": "Port", "width": "58px", "emphasis": true, "accent": "#c084fc" },
                { "key": "service", "secondaryKey": "constant", "label": "Service / Constant", "width": "225px" },
                { "key": "channel", "label": "Channel", "width": "105px" },
                { "key": "repo", "label": "Repo", "width": "90px", "uppercase": true },
                { "key": "owner", "label": "Owner", "wrap": true }
            ]
        }
    ]
};
