export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "mail.mailbox",
    "menuGroup": "software",
    "menuLabel": "Mailbox Scanner",
    "menuVisible": false,
    "description": "Scans home, the normal network, and the darknet for message, lore, and text files, and tracks their read/unread state.",
    "requirements": [
        { "type": "api", "id": "darknet", "required": false }
    ],
    "daemon": true,
    "panels": [
        { "id": "status", "label": "Status", "title": "Mailbox", "accent": "#ffd17a", "subtitle": "Message discovery and read-state tracking" }
    ],
    "telemetry": {
        "path": "data/mailbox_state.json",
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
