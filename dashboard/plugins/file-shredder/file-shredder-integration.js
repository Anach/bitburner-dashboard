export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "software.fileShredder",
    "manualFile": "file-shredder",
    "menuGroup": "configuration",
    "menuLabel": "File Shredder",
    "description": "Clears registered run-scoped data immediately after a new game, BitNode destruction, or augmentation install. Installed sources contribute their own reset-file manifests, so dashboard-only installs remain self-contained while optional integrations clean up their own history.",
    "requirements": [],
    "daemon": true,
    "panels": [
        { "id": "status", "label": "Status", "title": "File Shredder", "accent": "#9ab0cc", "subtitle": "Reset detection and run-data cleanup" }
    ],
    "options": {
        "filesToClear": {
            "default": "",
            "type": "string"
        }
    },
    "inputs": [
        { "id": "files-to-clear", "label": "Additional reset files (comma-separated)", "tooltip": "For a local run-scoped file that its owning source has not yet declared in dashboard/reset-files/. Dashboard and installed integrations contribute their ordinary history automatically.", "optionKey": "filesToClear", "type": "text" }
    ],
    "status": {
        "optionFields": [
            { "key": "filesToClear", "label": "Configured Additional Files", "tone": "neutral", "panelId": "status" }
        ]
    },
    "telemetry": {
        "path": "data/file_shredder_stats.json",
        "fields": [
            { "key": "generatedAt", "label": "Last Updated", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "lastAugReset", "label": "Last Reset Detected", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "lastSweepAt", "label": "Last Swept", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "lastClearedCount", "label": "Files Cleared Last Sweep", "tone": "success", "format": "number", "panelId": "status" },
            { "key": "manifestPathCount", "label": "Auto-Covered (Installed Sources)", "tone": "info", "format": "number", "panelId": "status" },
            { "key": "totalPathCount", "label": "Total Files Watched", "tone": "info", "format": "number", "panelId": "status" }
        ]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
