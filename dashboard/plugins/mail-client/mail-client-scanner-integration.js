export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "workspace",
    "serviceId": "mail.mailbox",
    "workspaceId": "mail.mailbox",
    "menuGroup": "software",
    "menuLabel": "Mail Client",
    "description": "Persistent mailbox workspace backed by the scanner for messages, lore, and text files discovered across the network.",
    "requirements": [
        { "type": "api", "id": "darknet", "required": false }
    ],
    "daemon": true,
    "managedNetworkScripts": ["dashboard/plugins/mail-client/mail-client-reader.js", "dashboard/plugins/mail-client/mail-client-darknet-agent.js"],
    "panels": [
        { "id": "status", "label": "Status", "title": "Mail Client", "accent": "#ffd17a", "subtitle": "Message discovery and read-state tracking" }
    ],
    "serviceTables": [
        {
            "targetServiceId": "global.portRegistry",
            "tableId": "ports",
            "rows": [
                { "port": 27, "constant": "MAILBOX_COMMAND_PORT", "service": "Mail Client Scanner", "channel": "Command", "repo": "dashboard", "owner": "dashboard/plugins/mail-client/mail-client-scanner.js" },
                { "port": 28, "constant": "MAILBOX_FEED_PORT", "service": "Mail Client Reader", "channel": "Internal feed", "repo": "dashboard", "owner": "mail-client-darknet-agent.js / mail-client-scanner.js -> mail-client-reader.js" }
            ]
        }
    ],
    "telemetry": {
        "path": "data/mail_client_state.json",
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "totalUnread", "label": "Unread", "tone": "warnWhenPositive", "format": "number", "panelId": "status" },
            { "key": "totalCounts.Messages", "label": "Messages", "tone": "info", "format": "number", "panelId": "status" },
            { "key": "totalCounts.Lore", "label": "Lore", "tone": "info", "format": "number", "panelId": "status" },
            { "key": "totalCounts.Other", "label": "Other", "tone": "info", "format": "number", "panelId": "status" },
            { "key": "lastCommand.message", "label": "Last Action", "tone": "neutral", "panelId": "status" }
        ]
    },
    "commands": {
        "port": 27,
        "requiresRuntime": true
    }
};
