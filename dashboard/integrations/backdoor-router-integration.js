export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "automation.backdoors",
    "menuGroup": "hacking",
    "menuLabel": "Backdoor Router",
    "description": "Finds reachable faction servers and installs backdoors when hacking and Singularity requirements are met.",
    "requirements": [
        { "type": "api", "id": "singularity" }
    ],
    "daemon": true,
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
