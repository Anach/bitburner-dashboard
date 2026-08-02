import { buildPluginIntegrationService } from "dashboard/libs/plugin-integration.js";
import { buildScriptPluginService } from "dashboard/libs/script-plugin.js";

export function getDashboardPluginAdapterFactories() {
    return {
        script: (plugin) => buildScriptPluginService(plugin),
        metadata: (plugin) => buildPluginIntegrationService(plugin),
    };
}
