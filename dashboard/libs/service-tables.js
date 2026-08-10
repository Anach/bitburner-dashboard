function getObject(value) {
    return value && typeof value === "object" ? value : {};
}

function getValue(value, key) {
    if (typeof key !== "string" || key.length === 0) return undefined;
    return key.split(".").reduce((current, segment) => {
        if (!current || typeof current !== "object" || !(segment in current)) return undefined;
        return current[segment];
    }, value);
}

function compareValues(left, right) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return leftNumber - rightNumber;
    }
    return String(left ?? "").localeCompare(String(right ?? ""), undefined, { sensitivity: "base" });
}

function getAggregateValue(definition, rows, conflictCount) {
    if (definition?.aggregate === "count") return rows.length;
    if (definition?.aggregate === "distinctCount") {
        return new Set(rows
            .map((row) => getValue(row, definition.key))
            .filter((value) => value !== undefined && value !== null && value !== "")
            .map(String)).size;
    }
    if (definition?.aggregate === "maxPlusOne") {
        const values = rows.map((row) => Number(getValue(row, definition.key))).filter(Number.isFinite);
        return values.length > 0 ? Math.max(...values) + 1 : "-";
    }
    if (definition?.aggregate === "conflictCount") return conflictCount;
    return undefined;
}

function getAggregateTone(definition, value) {
    if (definition?.tone === "dangerWhenPositive") return Number(value) > 0 ? "danger" : "success";
    return typeof definition?.tone === "string" ? definition.tone : "neutral";
}

function buildTableSection(definition, contributions) {
    const rows = contributions.flatMap(({ rows, sourceServiceId, sourceLabel }) => (
        rows.map((row) => ({
            ...getObject(row),
            _contributionServiceId: sourceServiceId,
            _contributionSourceLabel: sourceLabel,
        }))
    ));
    const conflictKey = typeof definition.conflictKey === "string" ? definition.conflictKey : "";
    const conflictCounts = new Map();

    if (conflictKey) {
        for (const row of rows) {
            const value = getValue(row, conflictKey);
            if (value === undefined || value === null || value === "") continue;
            const normalized = String(value);
            conflictCounts.set(normalized, (conflictCounts.get(normalized) ?? 0) + 1);
        }
    }

    const normalizedRows = rows.map((row) => {
        const conflictValue = conflictKey ? getValue(row, conflictKey) : undefined;
        const isConflict = conflictValue !== undefined
            && conflictValue !== null
            && conflictValue !== ""
            && (conflictCounts.get(String(conflictValue)) ?? 0) > 1;
        return isConflict ? { ...row, _conflict: true } : row;
    });
    const sortKey = typeof definition.sortKey === "string" ? definition.sortKey : "";
    if (sortKey) {
        normalizedRows.sort((left, right) => compareValues(getValue(left, sortKey), getValue(right, sortKey)));
    }

    const conflictCount = [...conflictCounts.values()].filter((count) => count > 1).length;
    return {
        ...definition,
        type: "table",
        rows: normalizedRows,
        conflictCount,
    };
}

// Table definitions live on the target service. Any integration may contribute rows without the
// target importing or naming that integration, preserving the dashboard's plugin boundary.
export function applyDashboardServiceTableContributions(services = []) {
    const serviceList = Array.isArray(services) ? services : [];
    const knownServiceIds = new Set(serviceList.map((service) => service?.id).filter(Boolean));
    const contributionsByTarget = new Map();

    for (const sourceService of serviceList) {
        const contributions = Array.isArray(sourceService?.pluginMetadata?.serviceTables)
            ? sourceService.pluginMetadata.serviceTables
            : [];
        for (const contribution of contributions) {
            const targetServiceId = typeof contribution?.targetServiceId === "string"
                ? contribution.targetServiceId
                : "";
            const tableId = typeof contribution?.tableId === "string" ? contribution.tableId : "";
            if (!targetServiceId || !tableId || !knownServiceIds.has(targetServiceId) || !Array.isArray(contribution?.rows)) {
                continue;
            }
            const targetKey = `${targetServiceId}\u0000${tableId}`;
            const targetContributions = contributionsByTarget.get(targetKey) ?? [];
            targetContributions.push({
                rows: contribution.rows,
                sourceServiceId: sourceService.id,
                sourceLabel: sourceService.menuLabel,
            });
            contributionsByTarget.set(targetKey, targetContributions);
        }
    }

    return serviceList.map((service) => {
        const definitions = Array.isArray(service?.pluginMetadata?.tables)
            ? service.pluginMetadata.tables
            : [];
        const tableSections = definitions
            .filter((definition) => typeof definition?.id === "string" && definition.id.length > 0)
            .map((definition) => buildTableSection(
                definition,
                contributionsByTarget.get(`${service.id}\u0000${definition.id}`) ?? []
            ));
        return tableSections.length > 0 ? { ...service, tableSections } : service;
    });
}

export function getDashboardServiceTableSections(service, context = {}) {
    const panelId = context?.selectedCenterPanel;
    return (Array.isArray(service?.tableSections) ? service.tableSections : [])
        .filter((section) => typeof section?.panelId !== "string" || section.panelId === panelId);
}

export function getDashboardServiceTableStateLines(service, context = {}) {
    const panelId = context?.selectedCenterPanel;
    const lines = [];
    for (const section of Array.isArray(service?.tableSections) ? service.tableSections : []) {
        if (section?.statusPanelId !== panelId || !Array.isArray(section?.statusFields)) continue;
        const rows = Array.isArray(section.rows) ? section.rows : [];
        for (const field of section.statusFields) {
            if (typeof field?.label !== "string" || field.label.length === 0) continue;
            const value = getAggregateValue(field, rows, Number(section.conflictCount) || 0);
            if (value === undefined) continue;
            lines.push({
                label: field.label,
                value: String(value),
                tone: getAggregateTone(field, value),
            });
        }
    }
    return lines;
}
