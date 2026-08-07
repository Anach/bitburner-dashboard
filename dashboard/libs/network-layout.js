import { finiteNumber } from "dashboard/libs/number-utils.js";

function getValue(source, key) {
    if (!source || typeof source !== "object" || typeof key !== "string" || !key) return undefined;
    return key.split(".").reduce((value, segment) => {
        if (!value || typeof value !== "object") return undefined;
        return value[segment];
    }, source);
}

// Pure function of (nodes, fields, options), but `nodes` is typically a freshly-filtered array
// every render even when the underlying topology hasn't changed. Memoize on a signature of just
// the fields this layout actually reads, rather than nodes' array identity - the sort/placement
// work below is the expensive part, not building this string.
let cachedLayeredLayout = null;

export function buildLayeredNetworkLayout(nodes = [], fields = {}, options = {}) {
    const idKey = fields.id;
    const parentKey = fields.parent;
    const depthKey = fields.depth;
    const nodeWidth = Math.max(80, finiteNumber(options.nodeWidth, 154));
    const nodeHeight = Math.max(48, finiteNumber(options.nodeHeight, 76));
    const columnGap = Math.max(20, finiteNumber(options.columnGap, 72));
    const rowGap = Math.max(10, finiteNumber(options.rowGap, 24));
    const padding = Math.max(20, finiteNumber(options.padding, 80));

    const signature = `${nodeWidth}:${nodeHeight}:${columnGap}:${rowGap}:${padding}|${
        (Array.isArray(nodes) ? nodes : [])
            .map((node) => `${getValue(node, idKey)}=${getValue(node, parentKey)}:${getValue(node, depthKey)}`)
            .join(",")
    }`;
    if (cachedLayeredLayout && cachedLayeredLayout.signature === signature) {
        return cachedLayeredLayout.result;
    }

    const nodeById = new Map();
    for (const node of Array.isArray(nodes) ? nodes : []) {
        const id = String(getValue(node, idKey) ?? "");
        if (!id || nodeById.has(id)) continue;
        nodeById.set(id, node);
    }

    const childrenById = new Map(Array.from(nodeById.keys(), (id) => [id, []]));
    const roots = [];
    for (const [id, node] of nodeById) {
        const parentId = String(getValue(node, parentKey) ?? "");
        if (parentId && parentId !== id && nodeById.has(parentId)) childrenById.get(parentId).push(id);
        else roots.push(id);
    }
    for (const children of childrenById.values()) children.sort((left, right) => left.localeCompare(right));
    roots.sort((left, right) => left.localeCompare(right));

    const positions = new Map();
    const visiting = new Set();
    let nextLeafY = padding;
    let maximumX = padding;
    let maximumY = padding;

    const placeNode = (id) => {
        if (positions.has(id)) return positions.get(id);
        if (visiting.has(id)) return null;
        visiting.add(id);

        const node = nodeById.get(id);
        const childPositions = childrenById.get(id)
            .map(placeNode)
            .filter(Boolean);
        let y;
        if (childPositions.length === 0) {
            y = nextLeafY;
            nextLeafY += nodeHeight + rowGap;
        } else {
            const childCenterTotal = childPositions.reduce((sum, position) => sum + position.y + (nodeHeight / 2), 0);
            y = (childCenterTotal / childPositions.length) - (nodeHeight / 2);
        }

        const depth = Math.max(0, Math.floor(finiteNumber(getValue(node, depthKey), 0)));
        const x = padding + (depth * (nodeWidth + columnGap));
        const position = { id, x, y, width: nodeWidth, height: nodeHeight };
        positions.set(id, position);
        visiting.delete(id);
        maximumX = Math.max(maximumX, x + nodeWidth);
        maximumY = Math.max(maximumY, y + nodeHeight);
        return position;
    };

    for (const id of roots) placeNode(id);
    for (const id of nodeById.keys()) placeNode(id);

    const result = {
        positions,
        width: Math.max(nodeWidth + (padding * 2), maximumX + padding),
        height: Math.max(nodeHeight + (padding * 2), maximumY + padding),
        nodeWidth,
        nodeHeight,
    };
    cachedLayeredLayout = { signature, result };
    return result;
}

// Same rationale as buildLayeredNetworkLayout's cache above.
let cachedGroupedLayout = null;

export function buildGroupedNetworkLayout(nodes = [], fields = {}, options = {}) {
    const idKey = fields.id;
    const labelKey = fields.label;
    const groupKey = fields.group;
    const variantKey = fields.variant;
    const nodeWidth = Math.max(80, finiteNumber(options.nodeWidth, 154));
    const nodeHeight = Math.max(48, finiteNumber(options.nodeHeight, 76));
    const columnGap = Math.max(20, finiteNumber(options.columnGap, 72));
    const rowGap = Math.max(10, finiteNumber(options.rowGap, 24));
    const groupGap = Math.max(rowGap, finiteNumber(options.groupGap, 34));
    const padding = Math.max(20, finiteNumber(options.padding, 80));
    const maximumRows = Math.max(1, Math.floor(finiteNumber(options.maxGroupRows, 4)));
    const hubVariant = String(options.hubVariant ?? "hub");
    const groupVariant = String(options.groupVariant ?? "group");
    const groupOrderKey = Array.isArray(options.groupOrder) ? options.groupOrder.join("|") : "";

    const signature = `${nodeWidth}:${nodeHeight}:${columnGap}:${rowGap}:${groupGap}:${padding}:${maximumRows}:${hubVariant}:${groupVariant}:${groupOrderKey}|${
        (Array.isArray(nodes) ? nodes : [])
            .map((node) => `${getValue(node, idKey)}=${getValue(node, labelKey)}:${getValue(node, groupKey)}:${getValue(node, variantKey)}`)
            .join(",")
    }`;
    if (cachedGroupedLayout && cachedGroupedLayout.signature === signature) {
        return cachedGroupedLayout.result;
    }

    const nodeById = new Map();
    for (const node of Array.isArray(nodes) ? nodes : []) {
        const id = String(getValue(node, idKey) ?? "");
        if (!id || nodeById.has(id)) continue;
        nodeById.set(id, node);
    }

    const hubs = [];
    const groupHeaders = new Map();
    const itemsByGroup = new Map();
    for (const [id, node] of nodeById) {
        const variant = String(getValue(node, variantKey) ?? "");
        const group = String(getValue(node, groupKey) ?? "");
        if (variant === hubVariant) {
            hubs.push({ id, node });
        } else if (variant === groupVariant && group) {
            groupHeaders.set(group, { id, node });
        } else {
            const bucket = itemsByGroup.get(group) ?? [];
            bucket.push({ id, node });
            itemsByGroup.set(group, bucket);
        }
    }

    const configuredOrder = Array.isArray(options.groupOrder) ? options.groupOrder.map(String) : [];
    const allGroups = new Set([...groupHeaders.keys(), ...itemsByGroup.keys()]);
    const groups = [
        ...configuredOrder.filter((group) => allGroups.has(group)),
        ...[...allGroups].filter((group) => !configuredOrder.includes(group)).sort((left, right) => left.localeCompare(right)),
    ];
    for (const items of itemsByGroup.values()) {
        items.sort((left, right) => String(getValue(left.node, labelKey) ?? left.id)
            .localeCompare(String(getValue(right.node, labelKey) ?? right.id)));
    }

    if (groups.length === 0) return buildLayeredNetworkLayout(nodes, fields, options);

    const positions = new Map();
    const hubX = padding;
    const groupX = hubX + nodeWidth + columnGap;
    const itemStartX = groupX + nodeWidth + columnGap;
    let laneY = padding;
    let maximumX = padding + nodeWidth;
    let maximumY = padding + nodeHeight;

    for (const group of groups) {
        const items = itemsByGroup.get(group) ?? [];
        const rowCount = Math.max(1, Math.min(maximumRows, items.length));
        const laneHeight = Math.max(nodeHeight, rowCount * nodeHeight + Math.max(0, rowCount - 1) * rowGap);
        const header = groupHeaders.get(group);
        if (header) {
            positions.set(header.id, {
                id: header.id,
                x: groupX,
                y: laneY + ((laneHeight - nodeHeight) / 2),
                width: nodeWidth,
                height: nodeHeight,
            });
        }

        items.forEach((entry, index) => {
            const column = Math.floor(index / maximumRows);
            const row = index % maximumRows;
            const x = itemStartX + (column * (nodeWidth + columnGap));
            const y = laneY + (row * (nodeHeight + rowGap));
            positions.set(entry.id, { id: entry.id, x, y, width: nodeWidth, height: nodeHeight });
            maximumX = Math.max(maximumX, x + nodeWidth);
            maximumY = Math.max(maximumY, y + nodeHeight);
        });

        maximumX = Math.max(maximumX, groupX + nodeWidth);
        maximumY = Math.max(maximumY, laneY + laneHeight);
        laneY += laneHeight + groupGap;
    }

    const contentHeight = Math.max(nodeHeight, maximumY - padding);
    hubs.sort((left, right) => String(getValue(left.node, labelKey) ?? left.id)
        .localeCompare(String(getValue(right.node, labelKey) ?? right.id)));
    hubs.forEach((entry, index) => {
        positions.set(entry.id, {
            id: entry.id,
            x: hubX,
            y: padding + ((contentHeight - nodeHeight) / 2) + (index * (nodeHeight + rowGap)),
            width: nodeWidth,
            height: nodeHeight,
        });
    });

    for (const [id, node] of nodeById) {
        if (positions.has(id)) continue;
        const y = maximumY + rowGap;
        positions.set(id, { id, x: itemStartX, y, width: nodeWidth, height: nodeHeight });
        maximumX = Math.max(maximumX, itemStartX + nodeWidth);
        maximumY = Math.max(maximumY, y + nodeHeight);
    }

    const result = {
        positions,
        width: Math.max(nodeWidth + (padding * 2), maximumX + padding),
        height: Math.max(nodeHeight + (padding * 2), maximumY + padding),
        nodeWidth,
        nodeHeight,
    };
    cachedGroupedLayout = { signature, result };
    return result;
}

export function fitNetworkLayout(layout, viewportWidth, viewportHeight, options = {}) {
    const minimum = Math.max(0.05, finiteNumber(options.minScale, 0.35));
    const maximum = Math.max(minimum, finiteNumber(options.maxScale, 1.8));
    const inset = Math.max(0, finiteNumber(options.fitInset, 24));
    const availableWidth = Math.max(1, finiteNumber(viewportWidth, layout?.width ?? 1) - (inset * 2));
    const availableHeight = Math.max(1, finiteNumber(viewportHeight, layout?.height ?? 1) - (inset * 2));
    const scale = Math.max(minimum, Math.min(maximum, Math.min(
        availableWidth / Math.max(1, layout?.width ?? 1),
        availableHeight / Math.max(1, layout?.height ?? 1)
    )));
    return {
        x: ((viewportWidth - ((layout?.width ?? 1) * scale)) / 2),
        y: ((viewportHeight - ((layout?.height ?? 1) * scale)) / 2),
        scale,
    };
}
