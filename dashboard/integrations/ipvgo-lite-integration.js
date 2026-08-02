export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "metadata",
    "serviceId": "automation.ipvgo",
    "menuGroup": "automation",
    "menuLabel": "IPvGO",
    "description": "Plays IPvGO matches automatically and tracks opponent progress, results, and strategy settings.",
    "requirements": [],
    "daemon": true,
    "alwaysVisible": true,
    "defaultPanelId": "stats",
    "launchArgs": ["loop", "headless"],
    "panels": [
        { "id": "stats", "label": "Stats", "title": "IPvGO Stats", "accent": "#6cb4ff", "subtitle": "Live automation telemetry" },
        { "id": "graphs", "label": "Graphs", "title": "IPvGO Graphs", "accent": "#c084fc", "subtitle": "Match results and streaks over time" }
    ],
    "telemetry": {
        "path": "data/ipvgo_stats.json",
        "sources": [
            { "path": "data/ipvgo_history.json", "targetKey": "history" }
        ],
        "fields": [
            { "key": "mode", "label": "Mode" },
            { "key": "effort", "label": "Effort" },
            { "key": "memory", "label": "Memory" },
            { "key": "repeat", "label": "Repeat" },
            { "key": "netburners", "label": "Netburners" },
            { "key": "slumSnakes", "label": "Slum Snakes" },
            { "key": "blackHand", "label": "Black Hand" },
            { "key": "tetrads", "label": "Tetrads" },
            { "key": "daedalus", "label": "Daedalus" },
            { "key": "illuminati", "label": "Illuminati" },
            { "key": "unknown", "label": "????????" },
            { "key": "threads", "label": "Threads" },
            { "key": "currentOpponent", "label": "Current Opponent" },
            { "key": "games", "label": "Games" },
            { "key": "wins", "label": "Wins" },
            { "key": "losses", "label": "Losses" },
            { "key": "ties", "label": "Ties" },
            { "key": "winStreak", "label": "Win Streak" },
            { "key": "lossStreak", "label": "Loss Streak" },
            { "key": "winRate", "label": "Win Rate" },
            { "key": "lastResult", "label": "Last Result" },
            { "key": "lastOpponent", "label": "Last Opponent" },
            { "key": "lastUpdated", "label": "Last Updated" }
        ],
        "sections": [
            {
                "id": "ipvgo-results",
                "type": "graph",
                "panelId": "graphs",
                "title": "Cumulative Results",
                "sourceKey": "history",
                "xKey": "timestamp",
                "xFormat": "time",
                "yFormat": "number",
                "height": 250,
                "maxPoints": 300,
                "includeZero": true,
                "emptyText": "Collecting IPvGO match history...",
                "series": [
                    { "key": "wins", "label": "Wins", "color": "#6ee7a8", "strokeWidth": 2.5 },
                    { "key": "losses", "label": "Losses", "color": "#ff9696", "strokeWidth": 2.5 }
                ]
            },
            {
                "id": "ipvgo-streaks",
                "type": "graph",
                "panelId": "graphs",
                "title": "Current Streaks",
                "sourceKey": "history",
                "xKey": "timestamp",
                "xFormat": "time",
                "yFormat": "number",
                "height": 250,
                "maxPoints": 300,
                "includeZero": true,
                "emptyText": "Collecting IPvGO streak history...",
                "series": [
                    { "key": "winStreak", "label": "Win Streak", "color": "#6cb4ff", "strokeWidth": 2.5 },
                    { "key": "lossStreak", "label": "Loss Streak", "color": "#ffc66c", "strokeWidth": 2.5 }
                ]
            }
        ]
    },
    "lock": { "key": "mode", "value": "aggressive", "flag": "aggressiveLocked" },
    "options": {
        "ipvgoMode": { "default": "balanced", "type": "enum", "values": ["balanced", "aggressive"], "caseInsensitive": true },
        "ipvgoEffort": { "default": "Med", "type": "enum", "values": ["Min", "Low", "Med", "High", "Max", "Ultra"], "caseInsensitive": false },
        "ipvgoMemory": { "default": "Med", "type": "enum", "values": ["Min", "Low", "Med", "High", "Max"], "caseInsensitive": false },
        "ipvgoThreads": { "default": "max", "type": "integer", "min": 1 },
        "ipvgoSlowMode": { "default": false, "type": "boolean" }
    },
    "inputs": [
        { "id": "effort", "label": "Effort", "optionKey": "ipvgoEffort", "type": "select", "values": ["Min", "Low", "Med", "High", "Max", "Ultra"], "lockWhenIntegrationLocked": true, "lockedValue": "Ultra" },
        { "id": "memory", "label": "Memory", "optionKey": "ipvgoMemory", "type": "select", "values": ["Min", "Low", "Med", "High", "Max"], "lockWhenIntegrationLocked": true, "lockedValue": "Max" },
        { "id": "threads", "label": "Threads", "optionKey": "ipvgoThreads", "type": "number", "showRange": true, "maximumStatsKey": "maximumThreads", "lockWhenIntegrationLocked": true, "lockedValue": "maximum" }
    ],
    "actions": [
        { "id": "toggle-repeat", "label": "Repeat", "icon": "R", "stateKey": "repeat", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "Repeat On", "disableCommand": "Repeat Off", "order": 0 },
        { "id": "toggle-slowmode", "label": "SlowMode", "icon": "SM", "stateKey": "slowMode", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "SlowMode On", "disableCommand": "SlowMode Off", "lockWhenIntegrationLocked": true, "order": 10 },
        { "id": "toggle-mode", "label": "Mode", "icon": "M", "stateKey": "mode", "variants": { "aggressive": { "label": "Mode: Aggressive", "tone": "warn", "command": "Mode:balanced" }, "balanced": { "label": "Mode: Balanced", "tone": "info", "command": "Mode:aggressive" } }, "order": 20 },
        { "id": "toggle-unknown", "label": "????????", "icon": "?", "stateKey": "unknown", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "???? On", "disableCommand": "???? Off", "order": 30 },
        { "id": "toggle-net", "label": "Netburners", "icon": "N", "stateKey": "netburners", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "Net On", "disableCommand": "Net Off", "order": 40 },
        { "id": "toggle-slum", "label": "Slum Snakes", "icon": "SS", "stateKey": "slumSnakes", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "Slum On", "disableCommand": "Slum Off", "order": 50 },
        { "id": "toggle-bh", "label": "The Black Hand", "icon": "BH", "stateKey": "blackHand", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "BH On", "disableCommand": "BH Off", "order": 60 },
        { "id": "toggle-tetrad", "label": "Tetrads", "icon": "T", "stateKey": "tetrads", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "Tetrad On", "disableCommand": "Tetrad Off", "order": 70 },
        { "id": "toggle-daed", "label": "Daedalus", "icon": "D", "stateKey": "daedalus", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "Daed On", "disableCommand": "Daed Off", "order": 80 },
        { "id": "toggle-illum", "label": "Illuminati", "icon": "I", "stateKey": "illuminati", "enabledTone": "success", "disabledTone": "danger", "enableCommand": "Illum On", "disableCommand": "Illum Off", "order": 90 }
    ],
    "commands": {
        "port": 15,
        "beforeAction": ["Silent"],
        "beforeApply": ["Silent"],
        "optionBindings": [
            { "optionKey": "ipvgoEffort", "prefix": "Effort:" },
            { "optionKey": "ipvgoMemory", "prefix": "Memory:" },
            { "optionKey": "ipvgoThreads", "prefix": "Threads:" },
            { "optionKey": "ipvgoSlowMode", "trueValue": "SlowMode On", "falseValue": "SlowMode Off" }
        ],
        "summaryOptions": ["ipvgoEffort", "ipvgoMemory", "ipvgoThreads", "ipvgoSlowMode"]
    }
};
