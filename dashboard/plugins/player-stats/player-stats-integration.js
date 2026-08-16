export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "metadata",
    "serviceId": "system.playerStatus",
    "menuGroup": "overview",
    "menuLabel": "Player Status",
    "menuVisible": true,
    "description": "Publishes player state for dashboard HUD surfaces. Singularity-powered Current Work telemetry is isolated behind a default-off feature toggle.",
    "daemon": true,
    "managedScripts": ["dashboard/plugins/player-stats/player-stats-singularity.js"],
    "options": {
        "playerStatsCurrentWorkEnabled": { "default": false, "type": "boolean" },
        "playerStatsCurrentWorkVisible": { "default": true, "type": "boolean" }
    },
    "actions": [
        { "id": "toggle-current-work-tracking", "kind": "save-options", "label": "[SF-4] Current Work Tracking", "tooltip": "Enable or disable the Singularity-powered background process that tracks your current work (faction, company, class, crime, program, or grafting) so Player Status can display it live. Requires Source-File 4: 9.60 GB at SF4.1; 2.10 GB at SF4.3.", "optionKey": "playerStatsCurrentWorkEnabled", "enabledTone": "success", "disabledTone": "neutral", "featureSize": true, "requiresRuntime": true, "order": 0 },
        { "id": "toggle-current-work-ui", "kind": "save-options", "label": "Current Work UI", "tooltip": "Show or hide Singularity-powered Current Work telemetry in Player Status.", "optionKey": "playerStatsCurrentWorkVisible", "enabledTone": "success", "disabledTone": "neutral", "featureSize": true, "requiresRuntime": true, "order": 10 }
    ],
    "requirements": [
        { "type": "api", "id": "singularity", "required": false }
    ],
    "panels": [
        { "id": "status", "label": "Status", "title": "Player Status", "accent": "#6ee7a8", "subtitle": "Player HUD telemetry" }
    ],
    "telemetry": {
        "path": "data/player_status.json",
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "hasSingularity", "label": "Singularity Access", "tone": "info", "panelId": "status", "visibleOptionKey": "playerStatsCurrentWorkVisible" },
            { "key": "currentWorkEnabled", "label": "Work Tracking", "tone": "neutral", "panelId": "status", "visibleOptionKey": "playerStatsCurrentWorkVisible" },
            { "key": "work", "label": "Current Work", "tone": "info", "panelId": "status", "visibleOptionKey": "playerStatsCurrentWorkVisible" },
            { "key": "workDetail", "label": "Progress", "tone": "neutral", "panelId": "status", "visibleOptionKey": "playerStatsCurrentWorkVisible" }
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
            "rowStart": 2,
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
            "excludeMenuGroups": ["configuration", "services"],
            "serviceIds": ["system.playerStatus"],
            "groupIds": ["core", "location", "work", "history"],
            "orientation": "vertical",
            "emptyText": "Waiting for Player Status telemetry."
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
                "visibleOptionKey": "playerStatsCurrentWorkVisible",
                "items": [
                    { "key": "work", "label": "Activity", "tone": "neutral", "themeColor": "combat" },
                    { "key": "workDetail", "label": "Progress", "tone": "neutral", "themeColor": "rep" }
                ]
            },
            {
                "id": "history",
                "title": "History",
                "items": [
                    { "key": "karma", "label": "Karma", "tone": "success", "format": "number", "themeColor": "hack", "hideBelowAbs": 1 },
                    { "key": "kills", "label": "Kills", "tone": "success", "format": "number", "themeColor": "hack", "hideWhenZero": true },
                    { "key": "factions", "label": "Factions", "tone": "neutral", "format": "number", "themeColor": "rep" },
                    { "key": "jobs", "label": "Jobs", "tone": "neutral", "format": "number", "themeColor": "rep" }
                ]
            }
        ]
    }
};
