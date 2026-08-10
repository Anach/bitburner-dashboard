import { buildPluginIntegrationService } from "dashboard/libs/plugin-integration.js";
import { buildScriptPluginService } from "dashboard/libs/script-plugin.js";
import { buildStaticIntegrationService } from "dashboard/libs/static-integration.js";

export function getDashboardPluginAdapterFactories() {
    return {
        script: (plugin) => buildScriptPluginService(plugin),
        metadata: (plugin) => buildPluginIntegrationService(plugin),
        static: (plugin) => buildStaticIntegrationService(plugin),
    };
}
