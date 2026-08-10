import { buildPluginIntegrationTelemetryLine } from "dashboard/libs/plugin-integration.js";

export function applyDashboardServiceTelemetryContributions(services = []) {
    const serviceList = Array.isArray(services) ? services : [];
    const knownServiceIds = new Set(serviceList.map((service) => service?.id).filter(Boolean));
    const contributionsByServiceId = new Map();

    for (const sourceService of serviceList) {
        const contributions = Array.isArray(sourceService?.pluginMetadata?.serviceTelemetry)
            ? sourceService.pluginMetadata.serviceTelemetry
            : [];
        for (const contribution of contributions) {
            const targetServiceId = typeof contribution?.targetServiceId === "string"
                ? contribution.targetServiceId
                : "";
            if (!targetServiceId || !knownServiceIds.has(targetServiceId) || !Array.isArray(contribution?.fields)) {
                continue;
            }

            const { targetServiceId: ignoredTargetServiceId, ...definition } = contribution;
            const targetContributions = contributionsByServiceId.get(targetServiceId) ?? [];
            targetContributions.push({
                ...definition,
                contributionServiceId: sourceService.id,
                contributionSourceLabel: sourceService.menuLabel,
            });
            contributionsByServiceId.set(targetServiceId, targetContributions);
        }
    }

    return serviceList.map((service) => {
        const additions = contributionsByServiceId.get(service?.id) ?? [];
        if (additions.length === 0) return service;
        return {
            ...service,
            telemetryContributions: [
                ...(Array.isArray(service?.telemetryContributions) ? service.telemetryContributions : []),
                ...additions,
            ],
        };
    });
}

export function getDashboardServiceTelemetryStateLines(service, context = {}) {
    const panelId = context?.selectedCenterPanel;
    const telemetryByServiceId = context?.telemetryByServiceId ?? {};
    const lines = [];

    for (const contribution of Array.isArray(service?.telemetryContributions)
        ? service.telemetryContributions
        : []) {
        if (typeof contribution?.panelId === "string" && contribution.panelId !== panelId) continue;
        const sourceServiceId = typeof contribution?.contributionServiceId === "string"
            ? contribution.contributionServiceId
            : "";
        if (!sourceServiceId) continue;
        const stats = telemetryByServiceId?.[sourceServiceId] ?? null;
        const sourceLabel = contribution.sourceLabel ?? contribution.contributionSourceLabel;

        for (const field of contribution.fields ?? []) {
            const line = buildPluginIntegrationTelemetryLine(stats, field);
            if (!line) continue;
            lines.push(sourceLabel ? { ...line, sourceLabel } : line);
        }
    }

    return lines;
}
