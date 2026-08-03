export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "metadata",
    "serviceId": "system.playerStatus",
    "menuGroup": "globalOptions",
    "menuLabel": "Player Status",
    "menuVisible": false,
    "description": "Publishes player state for metadata-driven dashboard HUD surfaces.",
    "daemon": true,
    "requirements": [
        { "type": "api", "id": "singularity", "required": false }
    ],
    "panels": [
        { "id": "status", "label": "Status", "title": "Player Status", "accent": "#6ee7a8", "subtitle": "Player HUD telemetry" }
    ],
    "telemetry": {
        "path": "data/player_status.json",
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" }
        ]
    },
    "viewWidgets": [
        {
            "viewId": "system-overview",
            "viewLayout": {
                "columns": 5,
                "columnsWithoutPlayerStats": 4
            },
            "id": "player-stats",
            "type": "player-stats",
            "title": "Player Status",
            "columnStart": 5,
            "columnSpan": 1,
            "rowStart": 1,
            "rowSpan": 3,
            "orientation": "vertical",
            "serviceIds": ["system.playerStatus"],
            "groupIds": ["core", "location", "work", "history"],
            "emptyText": "Waiting for Player Status telemetry."
        }
    ],
    "workspaceWidgets": [
        {
            "id": "player-dashboard",
            "type": "player-stats",
            "title": "Player Status",
            "subtitle": "Live player telemetry",
            "menuGroups": ["overview", "affiliations", "hacking", "finances", "hardware", "automation"],
            "serviceIds": ["system.playerStatus"],
            "groupIds": ["core", "location", "work", "history"],
            "orientation": "vertical",
            "emptyText": "Waiting for Player Status telemetry."
        }
    ],
    "dashboardOptions": [
        {
            "id": "dashboard-player-stats-mode",
            "label": "Player stats",
            "optionKey": "dashboardPlayerHudMode",
            "type": "select",
            "options": ["Auto", "Shown", "Hidden"]
        }
    ],
    "hud": {
        "title": "Player",
        "updatedAtKey": "generatedAt",
        "groups": [
            {
                "id": "core",
                "title": "Core",
                "items": [
                    { "key": "hp", "label": "HP", "tone": "danger", "themeColor": "hp" },
                    { "key": "money", "label": "Money", "tone": "warn", "format": "compactMoney", "themeColor": "money" },
                    { "key": "hacking", "label": "Hack", "tone": "success", "format": "number", "themeColor": "hack", "progressKey": "hackingProgress.ratio" },
                    { "key": "strength", "label": "Str", "tone": "neutral", "format": "number", "themeColor": "combat", "progressKey": "strengthProgress.ratio" },
                    { "key": "defense", "label": "Def", "tone": "neutral", "format": "number", "themeColor": "combat", "progressKey": "defenseProgress.ratio" },
                    { "key": "dexterity", "label": "Dex", "tone": "neutral", "format": "number", "themeColor": "combat", "progressKey": "dexterityProgress.ratio" },
                    { "key": "agility", "label": "Agi", "tone": "neutral", "format": "number", "themeColor": "combat", "progressKey": "agilityProgress.ratio" },
                    { "key": "charisma", "label": "Cha", "tone": "neutral", "format": "number", "themeColor": "cha", "progressKey": "charismaProgress.ratio" },
                    { "key": "intelligence", "label": "Int", "tone": "info", "format": "number", "themeColor": "int", "progressKey": "intelligenceProgress.ratio", "hideWhenZero": true }
                ]
            },
            {
                "id": "location",
                "title": "Location",
                "items": [
                    { "key": "city", "label": "City", "tone": "success", "themeColor": "hack" },
                    { "key": "location", "label": "Location", "tone": "success", "themeColor": "hack" }
                ]
            },
            {
                "id": "work",
                "title": "Current Work",
                "items": [
                    { "key": "work", "label": "Activity", "tone": "neutral", "themeColor": "combat" },
                    { "key": "workDetail", "label": "Progress", "tone": "neutral", "themeColor": "rep" }
                ]
            },
            {
                "id": "history",
                "title": "History",
                "items": [
                    { "key": "karma", "label": "Karma", "tone": "success", "format": "number", "themeColor": "hack", "hideWhenZero": true },
                    { "key": "kills", "label": "Kills", "tone": "success", "format": "number", "themeColor": "hack", "hideWhenZero": true },
                    { "key": "factions", "label": "Factions", "tone": "neutral", "format": "number", "themeColor": "rep" },
                    { "key": "jobs", "label": "Jobs", "tone": "neutral", "format": "number", "themeColor": "rep" }
                ]
            }
        ]
    }
};
