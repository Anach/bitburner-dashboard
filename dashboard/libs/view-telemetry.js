function getPathValue(source, path) {
    if (!source || typeof source !== "object" || typeof path !== "string" || !path) return undefined;
    const segments = path.split(".");
    if (segments.some((segment) => ["__proto__", "constructor", "prototype"].includes(segment))) return undefined;
    return segments.reduce((value, segment) => {
        if (!value || typeof value !== "object" || !(segment in value)) return undefined;
        return value[segment];
    }, source);
}

function setPathValue(source, path, value) {
    if (!source || typeof source !== "object" || typeof path !== "string" || !path) return source;
    const segments = path.split(".").filter(Boolean);
    if (segments.length === 0 || segments.some((segment) => ["__proto__", "constructor", "prototype"].includes(segment))) {
        return source;
    }

    const root = Array.isArray(source) ? [...source] : { ...source };
    let sourceCursor = source;
    let targetCursor = root;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        const nextSource = sourceCursor?.[segment];
        const nextTarget = Array.isArray(nextSource)
            ? [...nextSource]
            : nextSource && typeof nextSource === "object"
                ? { ...nextSource }
                : {};
        targetCursor[segment] = nextTarget;
        sourceCursor = nextSource;
        targetCursor = nextTarget;
    }
    targetCursor[segments[segments.length - 1]] = value;
    return root;
}

function normalizeFieldMappings(fields) {
    return (Array.isArray(fields) ? fields : []).flatMap((field) => {
        if (typeof field === "string" && field) return [{ sourceKey: field, targetKey: field }];
        if (!field || typeof field !== "object") return [];
        const sourceKey = typeof field.sourceKey === "string" ? field.sourceKey : "";
        const targetKey = typeof field.targetKey === "string" ? field.targetKey : sourceKey;
        return sourceKey && targetKey ? [{ sourceKey, targetKey }] : [];
    });
}

function appendUniqueDefinitions(existing, additions, identityKey) {
    const output = Array.isArray(existing) ? [...existing] : [];
    const seen = new Set(output.map((entry) => String(entry?.[identityKey] ?? "")).filter(Boolean));
    for (const addition of Array.isArray(additions) ? additions : []) {
        if (!addition || typeof addition !== "object") continue;
        const id = String(addition?.[identityKey] ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        output.push(addition);
    }
    return output;
}

export function applyDashboardViewTelemetryContributions(views = [], services = []) {
    const contributionsByViewId = new Map();
    for (const service of Array.isArray(services) ? services : []) {
        for (const contribution of Array.isArray(service?.pluginMetadata?.viewTelemetry)
            ? service.pluginMetadata.viewTelemetry
            : []) {
            const viewId = typeof contribution?.viewId === "string" ? contribution.viewId : "";
            if (!viewId || !contribution || typeof contribution !== "object") continue;
            const contributions = contributionsByViewId.get(viewId) ?? [];
            contributions.push({ ...contribution, contributionServiceId: service.id });
            contributionsByViewId.set(viewId, contributions);
        }
    }

    return (Array.isArray(views) ? views : []).map((view) => {
        const contributions = contributionsByViewId.get(view?.id) ?? [];
        if (contributions.length === 0) return view;

        let metricSets = { ...(view?.metricSets ?? {}) };
        let nodeFilters = Array.isArray(view?.filters?.nodeFilters) ? [...view.filters.nodeFilters] : [];
        const telemetryOverlays = [];
        for (const contribution of contributions) {
            const { viewId: ignoredViewId, metricSets: contributedMetricSets, nodeFilters: contributedNodeFilters, ...overlay } = contribution;
            telemetryOverlays.push(overlay);
            const contributedMetricSetEntries = contributedMetricSets
                && typeof contributedMetricSets === "object"
                && !Array.isArray(contributedMetricSets)
                ? Object.entries(contributedMetricSets)
                : [];
            for (const [setId, definitions] of contributedMetricSetEntries) {
                if (!setId || ["__proto__", "constructor", "prototype"].includes(setId)) continue;
                metricSets = {
                    ...metricSets,
                    [setId]: appendUniqueDefinitions(metricSets[setId], definitions, "key"),
                };
            }
            nodeFilters = appendUniqueDefinitions(nodeFilters, contributedNodeFilters, "id");
        }

        return {
            ...view,
            metricSets,
            filters: { ...(view?.filters ?? {}), nodeFilters },
            telemetryOverlays: [...(Array.isArray(view?.telemetryOverlays) ? view.telemetryOverlays : []), ...telemetryOverlays],
        };
    });
}

export function applyDashboardViewTelemetry(baseTelemetry, view, telemetryByServiceId = {}) {
    if (!baseTelemetry || typeof baseTelemetry !== "object") return baseTelemetry;
    let result = baseTelemetry;

    for (const overlay of Array.isArray(view?.telemetryOverlays) ? view.telemetryOverlays : []) {
        const serviceId = typeof overlay?.contributionServiceId === "string" ? overlay.contributionServiceId : "";
        const sourcePath = typeof overlay?.sourcePath === "string" ? overlay.sourcePath : "";
        const targetPath = typeof overlay?.targetPath === "string" ? overlay.targetPath : "";
        const sourceIdKey = typeof overlay?.sourceIdKey === "string" ? overlay.sourceIdKey : "id";
        const targetIdKey = typeof overlay?.targetIdKey === "string" ? overlay.targetIdKey : sourceIdKey;
        const fields = normalizeFieldMappings(overlay?.fields);
        const targetRecords = getPathValue(result, targetPath);
        if (!serviceId || !sourcePath || !targetPath || fields.length === 0 || !Array.isArray(targetRecords)) continue;

        const sourceRecords = getPathValue(telemetryByServiceId?.[serviceId], sourcePath);
        const sourceById = new Map();
        for (const sourceRecord of Array.isArray(sourceRecords) ? sourceRecords : []) {
            const id = getPathValue(sourceRecord, sourceIdKey);
            if (id == null || id === "") continue;
            sourceById.set(String(id), sourceRecord);
        }
        const defaultValues = overlay?.defaultValues && typeof overlay.defaultValues === "object" && !Array.isArray(overlay.defaultValues)
            ? overlay.defaultValues
            : {};

        const mergedRecords = targetRecords.map((targetRecord) => {
            if (!targetRecord || typeof targetRecord !== "object") return targetRecord;
            let merged = { ...targetRecord, ...defaultValues };
            const targetId = getPathValue(targetRecord, targetIdKey);
            const sourceRecord = targetId == null ? null : sourceById.get(String(targetId));
            if (!sourceRecord) return merged;
            for (const field of fields) {
                const value = getPathValue(sourceRecord, field.sourceKey);
                if (value !== undefined) merged = setPathValue(merged, field.targetKey, value);
            }
            return merged;
        });
        result = setPathValue(result, targetPath, mergedRecords);
    }

    return result;
}
