export const DASHBOARD_VIEW_METADATA = {
    "id": "files",
    "renderer": "file-manager",
    "menuGroup": "software",
    "menuLabel": "File Manager",
    "title": "Home File Manager",
    "subtitle": "Two-pane filesystem control for home scripts and data.",
    "searchPlaceholder": "Filter current directories…",
    "widgets": [],
    "layout": {
        "leftPath": "",
        "rightPath": "dashboard",
        "showHiddenDefault": true
    },
    "commands": {
        "edit": "nano {path}"
    },
    "archive": {
        "root": "trashbin"
    },
    "preview": {
        "maxChars": 80000
    },
    "manifest": {
        "path": "data/deploy_manifest.json",
        "currentFilesKey": "files",
        "previousFilesKey": "previousFiles",
        "staleFilesKey": "staleFiles",
        "generatedAtKey": "generatedAt"
    },
    "protection": {
        "protectRunning": true,
        "paths": [
            "dashboard/automation-dashboard.jsx",
            "dashboard/action-worker.js",
            "dashboard/service-supervisor.js",
            "dashboard/plugins/file-manager/file-manager-view.js",
            "dashboard/renderers/file-manager-view.jsx",
            "dashboard/renderers/file-manager-snapshot.js",
            "data/dashboard_options.json",
            "data/dashboard_action_result.json",
            "data/deploy_manifest.json"
        ],
        "prefixes": [
            "dashboard/libs/"
        ]
    }
};
