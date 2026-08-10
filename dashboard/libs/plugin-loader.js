import { parseDashboardMetadataFromSource } from "dashboard/libs/metadata-parser.js";

const DASHBOARD_INTEGRATION_FOLDER_PREFIX = "dashboard/integrations/";
const DASHBOARD_PLUGIN_FOLDER_PREFIX = "dashboard/plugins/";
const DASHBOARD_PLUGIN_INTEGRATION_SUFFIX = "-integration.js";
const DASHBOARD_PLUGIN_METADATA_DECLARATION = "export const DASHBOARD_PLUGIN_METADATA =";
const DASHBOARD_VIEW_SUFFIX = "-view.js";
const DASHBOARD_VIEW_METADATA_DECLARATION = "export const DASHBOARD_VIEW_METADATA =";

export function discoverDashboardViews(ns, scriptFilenames = []) {
    if (!ns || !Array.isArray(scriptFilenames)) return [];

    const discovered = [];
    const normalizedFilenames = scriptFilenames
        .filter((filename) => typeof filename === "string" && filename.length > 0)
        .map((filename) => filename.replace(/\\/g, "/"));

    for (const filename of normalizedFilenames) {
        const integrationDescriptor = filename.startsWith(DASHBOARD_INTEGRATION_FOLDER_PREFIX)
            && !filename.slice(DASHBOARD_INTEGRATION_FOLDER_PREFIX.length).includes("/");
        const pluginDescriptor = filename.startsWith(DASHBOARD_PLUGIN_FOLDER_PREFIX)
            && filename.slice(DASHBOARD_PLUGIN_FOLDER_PREFIX.length).split("/").length === 2;
        if (!integrationDescriptor && !pluginDescriptor) continue;
        if (!filename.endsWith(DASHBOARD_VIEW_SUFFIX)) continue;
        if (!ns.fileExists(filename, "home")) continue;

        let sourceText = "";
        try {
            sourceText = ns.read(filename);
        } catch (e) {
            continue;
        }

        const metadata = parseDashboardMetadataFromSource(sourceText, DASHBOARD_VIEW_METADATA_DECLARATION);
        if (!metadata || metadata.enabled === false) continue;
        if (typeof metadata.id !== "string" || metadata.id.length === 0) continue;
        if (typeof metadata.menuLabel !== "string" || metadata.menuLabel.length === 0) continue;
        if (!Array.isArray(metadata.widgets)) continue;

        discovered.push({
            ...metadata,
            descriptorFile: filename,
            pluginFolder: pluginDescriptor
                ? filename.slice(DASHBOARD_PLUGIN_FOLDER_PREFIX.length).split("/")[0]
                : "",
        });
    }

    return discovered;
}

export function isDashboardPluginDescriptorFilename(filename) {
    if (typeof filename !== "string") return false;
    const integrationDescriptor = filename.startsWith(DASHBOARD_INTEGRATION_FOLDER_PREFIX)
        && !filename.slice(DASHBOARD_INTEGRATION_FOLDER_PREFIX.length).includes("/");
    const pluginDescriptor = filename.startsWith(DASHBOARD_PLUGIN_FOLDER_PREFIX)
        && filename.slice(DASHBOARD_PLUGIN_FOLDER_PREFIX.length).split("/").length === 2;
    if (!integrationDescriptor && !pluginDescriptor) return false;
    return filename.endsWith(DASHBOARD_PLUGIN_INTEGRATION_SUFFIX);
}

export function discoverDashboardPlugins(ns, scriptFilenames = [], options = {}) {
    if (!ns || !Array.isArray(scriptFilenames)) return [];

    const normalizedFilenames = scriptFilenames
        .filter((filename) => typeof filename === "string" && filename.length > 0)
        .map((filename) => filename.replace(/\\/g, "/"));
    const excludedRuntimeFolders = Array.isArray(options?.excludedRuntimeFolders)
        ? options.excludedRuntimeFolders
            .filter((folder) => typeof folder === "string" && folder.trim().length > 0)
            .map((folder) => folder.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
            .filter(Boolean)
        : [];
    const discovered = [];
    for (const normalized of normalizedFilenames) {
        if (!isDashboardPluginDescriptorFilename(normalized)) continue;
        const pluginDescriptor = normalized.startsWith(DASHBOARD_PLUGIN_FOLDER_PREFIX);
        if (!ns.fileExists(normalized, "home")) continue;

        let sourceText = "";
        try {
            sourceText = ns.read(normalized);
        } catch (e) {
            continue;
        }

        const metadata = parseDashboardMetadataFromSource(sourceText, DASHBOARD_PLUGIN_METADATA_DECLARATION);
        if (!metadata) continue;
        if (metadata.enabled === false) continue;
        if (typeof metadata.adapter !== "string" || metadata.adapter.length === 0) continue;
        const descriptorFilename = normalized.slice(normalized.lastIndexOf("/") + 1);
        const pluginName = descriptorFilename.slice(0, -DASHBOARD_PLUGIN_INTEGRATION_SUFFIX.length);
        if (!pluginName) continue;
        const runtimeFilename = `${pluginName}.js`;
        const runtimeCandidates = pluginDescriptor
            ? [normalized.slice(0, normalized.lastIndexOf("/") + 1) + runtimeFilename]
                .filter((filename) => normalizedFilenames.includes(filename))
            : normalizedFilenames.filter((filename) => {
                if (filename.startsWith(DASHBOARD_INTEGRATION_FOLDER_PREFIX)) return false;
                if (excludedRuntimeFolders.some((folder) => filename === folder || filename.startsWith(`${folder}/`))) {
                    return false;
                }
                return filename === runtimeFilename || filename.endsWith(`/${runtimeFilename}`);
            });
        if (runtimeCandidates.length !== 1) continue;
        const scriptPath = runtimeCandidates[0];
        if (!ns.fileExists(scriptPath, "home")) continue;
        const normalizedMetadata = { ...metadata, scriptPath };

        discovered.push({
            filename: scriptPath,
            integrationFile: normalized,
            adapter: metadata.adapter,
            serviceId: typeof metadata.serviceId === "string" ? metadata.serviceId : "",
            menuGroup: metadata.menuGroup,
            menuGroupLabel: typeof metadata.menuGroupLabel === "string" ? metadata.menuGroupLabel : "",
            menuGroupOrder: typeof metadata.menuGroupOrder === "number" && Number.isFinite(metadata.menuGroupOrder)
                ? metadata.menuGroupOrder
                : undefined,
            menuOrder: typeof metadata.menuOrder === "number" && Number.isFinite(metadata.menuOrder)
                ? metadata.menuOrder
                : undefined,
            menuLabel: typeof metadata.menuLabel === "string" ? metadata.menuLabel : "",
            description: typeof metadata.description === "string" ? metadata.description : "",
            requirements: Array.isArray(metadata.requirements) ? metadata.requirements : [],
            alwaysVisible: typeof metadata.alwaysVisible === "boolean" ? metadata.alwaysVisible : undefined,
            menuVisible: typeof metadata.menuVisible === "boolean" ? metadata.menuVisible : undefined,
            defaultPanelId: typeof metadata.defaultPanelId === "string" ? metadata.defaultPanelId : "",
            metadata: normalizedMetadata,
        });
    }

    return discovered;
}

export function buildDashboardPluginServices(pluginDefinitions = [], adapterFactories = {}) {
    if (!Array.isArray(pluginDefinitions)) return [];

    const services = [];
    const seenServiceIds = new Set();

    for (const plugin of pluginDefinitions) {
        if (!plugin || typeof plugin !== "object") continue;
        const adapter = typeof plugin.adapter === "string" ? plugin.adapter : "";
        if (!adapter) continue;

        const factory = adapterFactories?.[adapter];
        if (typeof factory !== "function") continue;

        const builtService = factory(plugin);
        if (!builtService || typeof builtService !== "object") continue;

        const service = {
            ...builtService,
            ...(plugin.serviceId ? { id: plugin.serviceId } : {}),
            ...(plugin.menuGroup != null ? { menuGroup: plugin.menuGroup } : {}),
            ...(plugin.menuGroupLabel ? { menuGroupLabel: plugin.menuGroupLabel } : {}),
            ...(Number.isFinite(plugin.menuGroupOrder) ? { menuGroupOrder: plugin.menuGroupOrder } : {}),
            ...(Number.isFinite(plugin.menuOrder) ? { menuOrder: plugin.menuOrder } : {}),
            ...(plugin.menuLabel ? { menuLabel: plugin.menuLabel } : {}),
            ...(plugin.description ? { description: plugin.description } : {}),
            requirements: plugin.requirements,
            ...(plugin.defaultPanelId ? { defaultPanelId: plugin.defaultPanelId } : {}),
            ...(typeof plugin.alwaysVisible === "boolean" ? { alwaysVisible: plugin.alwaysVisible } : {}),
            ...(typeof plugin.menuVisible === "boolean" ? { menuVisible: plugin.menuVisible } : {}),
            pluginFile: plugin.filename,
            pluginIntegrationFile: plugin.integrationFile,
            pluginAdapter: adapter,
            pluginMetadata: plugin.metadata,
        };

        if (typeof service.id !== "string" || service.id.length === 0) continue;
        if (seenServiceIds.has(service.id)) continue;
        seenServiceIds.add(service.id);

        services.push(service);
    }

    return services;
}
