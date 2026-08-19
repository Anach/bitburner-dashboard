export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "static",
    "serviceId": "global.portRegistry",
    "manualFile": "port-registry",
    "menuGroup": "configuration",
    "menuLabel": "Port Registry",
    "description": "Lists the Netscript ports declared by installed dashboard and script integrations.",
    "daemon": false,
    "alwaysVisible": true,
    "defaultPanelId": "status",
    "panels": [
        {
            "id": "status",
            "label": "Status",
            "title": "Port Registry Status",
            "accent": "#c084fc",
            "subtitle": "Installed assignment coverage and collision health"
        },
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
            "statusPanelId": "status",
            "minWidth": "760px",
            "emptyText": "No installed integration has declared a port assignment.",
            "statusFields": [
                { "label": "Assigned Ports", "aggregate": "count", "tone": "info" },
                { "label": "Contributors", "aggregate": "distinctCount", "key": "_contributionServiceId", "tone": "info" },
                { "label": "Next Free Port", "aggregate": "maxPlusOne", "key": "port", "tone": "success" },
                { "label": "Conflicts", "aggregate": "conflictCount", "tone": "dangerWhenPositive" }
            ],
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
