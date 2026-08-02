export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "automation.batcher",
    "menuGroup": "automation",
    "menuLabel": "Batcher Service",
    "description": "Coordinates switchable network workload profiles and keeps the selected profile running.",
    "requirements": [
        { "type": "program", "id": "Formulas.exe" }
    ],
    "daemon": true,
    "panels": [
        { "id": "status", "label": "Status", "title": "Batcher Service", "accent": "#6ee7a8", "subtitle": "Profile selection and worker health" },
        { "id": "money", "label": "Money", "title": "Money Profile", "accent": "#6ee7a8", "subtitle": "Distributed profit batching activity" },
        { "id": "balanced", "label": "Balanced", "title": "Balanced Profile", "accent": "#facc6b", "subtitle": "A 50/50 network RAM split between profit batches and XP training" },
        { "id": "xp", "label": "XP", "title": "XP Profile", "accent": "#6cb4ff", "subtitle": "Distributed hacking experience training" }
    ],
    "telemetry": {
        "path": "data/batcher_stats.json",
        "sources": [
            { "path": "data/batcher_money_stats.json", "targetKey": "money" },
            { "path": "data/batcher_balanced_stats.json", "targetKey": "balanced" },
            { "path": "data/batcher_xp_stats.json", "targetKey": "xp" }
        ],
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "modeLabel", "label": "Selected Mode", "tone": "info", "panelId": "status", "overview": true, "overviewValueKey": "strategyLabel", "overviewLabel": "Strategy", "overviewOrder": 70 },
            { "key": "activeProfileLabel", "label": "Active Profile", "tone": "success", "panelId": "status" },
            { "key": "adaptiveXpMoney", "label": "Switch to XP At", "tone": "info", "format": "money", "panelId": "status" },
            { "key": "adaptiveProfitMoney", "label": "Resume Profit Below", "tone": "warn", "format": "money", "panelId": "status" },
            { "key": "profileStatus", "label": "Profile Worker", "tone": "neutral", "panelId": "status" },
            { "key": "profileScript", "label": "Profile Script", "tone": "neutral", "panelId": "status" },
            { "key": "lastSwitchAt", "label": "Last Profile Switch", "tone": "neutral", "format": "time", "panelId": "status" },

            { "key": "money.generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "money" },
            { "key": "money.strategy", "label": "Strategy", "tone": "info", "panelId": "money" },
            { "key": "money.phase", "label": "Dispatch State", "tone": "neutral", "panelId": "money" },
            { "key": "money.cycle", "label": "Cycle", "tone": "neutral", "format": "number", "panelId": "money" },
            { "key": "money.eligibleTargetCount", "label": "Eligible Targets", "tone": "neutral", "format": "number", "panelId": "money" },
            { "key": "money.profitTargetCount", "label": "Profit Targets", "tone": "success", "format": "number", "panelId": "money" },
            { "key": "money.frontierTargetCount", "label": "Frontier Targets", "tone": "info", "format": "number", "panelId": "money" },
            { "key": "money.overflowTargetCount", "label": "Overflow Targets", "tone": "info", "format": "number", "panelId": "money" },
            { "key": "money.activeBatchCount", "label": "Active Batches", "tone": "success", "format": "number", "panelId": "money" },
            { "key": "money.activeTargetCount", "label": "Active Batch Targets", "tone": "neutral", "format": "number", "panelId": "money" },
            { "key": "money.executorCount", "label": "Executor Hosts", "tone": "neutral", "format": "number", "panelId": "money" },
            { "key": "money.availableRam", "label": "RAM Remaining", "tone": "neutral", "format": "ram", "panelId": "money" },
            { "key": "money.totalRam", "label": "RAM at Cycle Start", "tone": "neutral", "format": "ram", "panelId": "money" },
            { "key": "money.lastDispatchAt", "label": "Last Dispatch", "tone": "neutral", "format": "time", "panelId": "money" },

            { "key": "balanced.generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "balanced" },
            { "key": "balanced.strategy", "label": "Strategy", "tone": "info", "panelId": "balanced" },
            { "key": "balanced.ramSplit", "label": "RAM Split", "tone": "success", "panelId": "balanced" },
            { "key": "balanced.phase", "label": "Profit Dispatch", "tone": "neutral", "panelId": "balanced" },
            { "key": "balanced.xpPhase", "label": "XP Training", "tone": "info", "panelId": "balanced" },
            { "key": "balanced.xpTotalThreads", "label": "XP Threads", "tone": "success", "format": "number", "panelId": "balanced" },
            { "key": "balanced.xpTargetCount", "label": "XP Targets", "tone": "info", "format": "number", "panelId": "balanced" },
            { "key": "balanced.profitTargetCount", "label": "Primary Profit Targets", "tone": "success", "format": "number", "panelId": "balanced" },
            { "key": "balanced.frontierTargetCount", "label": "Frontier Profit Targets", "tone": "info", "format": "number", "panelId": "balanced" },
            { "key": "balanced.overflowTargetCount", "label": "Overflow Profit Targets", "tone": "info", "format": "number", "panelId": "balanced" },
            { "key": "balanced.activeBatchCount", "label": "Active Profit Batches", "tone": "success", "format": "number", "panelId": "balanced" },
            { "key": "balanced.executorCount", "label": "Profit Executors", "tone": "neutral", "format": "number", "panelId": "balanced" },
            { "key": "balanced.availableRam", "label": "Unassigned RAM", "tone": "neutral", "format": "ram", "panelId": "balanced" },
            { "key": "balanced.totalRam", "label": "Profit RAM at Cycle Start", "tone": "neutral", "format": "ram", "panelId": "balanced" },

            { "key": "xp.generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "xp" },
            { "key": "xp.phase", "label": "Training State", "tone": "info", "panelId": "xp" },
            { "key": "xp.targetCount", "label": "Training Targets", "tone": "success", "format": "number", "panelId": "xp" },
            { "key": "xp.totalThreads", "label": "Training Threads", "tone": "success", "format": "number", "panelId": "xp" },
            { "key": "xp.executorCount", "label": "Executor Hosts", "tone": "neutral", "format": "number", "panelId": "xp" },
            { "key": "xp.homeBuffer", "label": "Home RAM Buffer", "tone": "neutral", "format": "ram", "panelId": "xp" }
        ],
        "sections": [
            { "type": "string-list", "title": "Profit Targets", "sourceKey": "money.profitTargets", "panelId": "money" },
            { "type": "string-list", "title": "Frontier Targets", "sourceKey": "money.frontierTargets", "panelId": "money" },
            { "type": "string-list", "title": "Overflow Profit Targets", "sourceKey": "money.overflowTargets", "panelId": "money" },
            { "type": "string-list", "title": "Primary Profit Targets", "sourceKey": "balanced.profitTargets", "panelId": "balanced" },
            { "type": "string-list", "title": "Frontier Profit Targets", "sourceKey": "balanced.frontierTargets", "panelId": "balanced" },
            { "type": "string-list", "title": "Overflow Profit Targets", "sourceKey": "balanced.overflowTargets", "panelId": "balanced" },
            { "type": "string-list", "title": "XP Training Targets", "sourceKey": "balanced.xpTargets", "panelId": "balanced" },
            { "type": "string-list", "title": "XP Training Targets", "sourceKey": "xp.targets", "panelId": "xp" }
        ]
    },
    "actions": [
        { "id": "profile-auto", "label": "Adaptive", "icon": "A", "stateKey": "mode", "activeValue": "auto", "activeTone": "success", "inactiveTone": "neutral", "command": "Profile:auto", "order": 0 },
        { "id": "profile-money", "label": "Profit", "icon": "$", "stateKey": "mode", "activeValue": "money", "activeTone": "success", "inactiveTone": "neutral", "command": "Profile:money", "order": 10 },
        { "id": "profile-balanced", "label": "Balanced", "icon": "½", "stateKey": "mode", "activeValue": "balanced", "activeTone": "success", "inactiveTone": "neutral", "command": "Profile:balanced", "order": 20 },
        { "id": "profile-xp", "label": "XP Training", "icon": "XP", "stateKey": "mode", "activeValue": "xp", "activeTone": "success", "inactiveTone": "neutral", "command": "Profile:xp", "order": 30 }
    ],
    "options": {
        "adaptiveXpMoney": { "default": 100000000000000000, "type": "integer", "min": 2 },
        "adaptiveProfitMoney": { "default": 100000000000000000, "type": "integer", "min": 1 }
    },
    "inputs": [
        { "id": "adaptive-xp-money", "label": "Switch to XP At ($)", "optionKey": "adaptiveXpMoney", "type": "number", "min": 2 },
        { "id": "adaptive-profit-money", "label": "Resume Profit Below ($)", "optionKey": "adaptiveProfitMoney", "type": "number", "min": 1 }
    ],
    "commands": {
        "port": 19,
        "optionBindings": [
            { "optionKey": "adaptiveXpMoney", "prefix": "AdaptiveXpMoney:" },
            { "optionKey": "adaptiveProfitMoney", "prefix": "AdaptiveProfitMoney:" }
        ],
        "summaryOptions": ["adaptiveXpMoney", "adaptiveProfitMoney"]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
