const MINIMUM_GRID_ROW_HEIGHT_PX = 24;
const MAXIMUM_GRID_ROW_HEIGHT_PX = 2000;
const MAXIMUM_GRID_ROWS = 50;

function normalizeRowNumber(value) {
    const row = Math.floor(Number(value));
    return Number.isInteger(row) && row >= 1 && row <= MAXIMUM_GRID_ROWS ? row : null;
}

function normalizeRowHeight(value) {
    const height = Math.floor(Number(value));
    return Number.isFinite(height) && height >= MINIMUM_GRID_ROW_HEIGHT_PX
        ? Math.min(height, MAXIMUM_GRID_ROW_HEIGHT_PX)
        : null;
}

function normalizeRowHeightMap(rawValues) {
    const result = new Map();
    if (rawValues && typeof rawValues === "object" && !Array.isArray(rawValues)) {
        for (const [rawRow, rawHeight] of Object.entries(rawValues)) {
            const row = normalizeRowNumber(rawRow);
            const height = normalizeRowHeight(rawHeight);
            if (row !== null && height !== null) result.set(row, height);
        }
    }
    return result;
}

// Descriptors can reserve a hard row height to prevent a spanning widget from inflating an earlier
// row. rowMinHeights remains available for rows that should grow with their content.
export function buildGridTemplateRows(layout, widgets = []) {
    const rawLayout = layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {};
    const rowHeights = normalizeRowHeightMap(rawLayout.rowHeights);
    const rowMinHeights = normalizeRowHeightMap(rawLayout.rowMinHeights);

    let maximumRow = Math.max(0, ...rowHeights.keys(), ...rowMinHeights.keys());
    for (const widget of Array.isArray(widgets) ? widgets : []) {
        const rowStart = normalizeRowNumber(widget?.rowStart);
        if (rowStart === null) continue;
        const rowSpan = normalizeRowNumber(widget?.rowSpan) ?? 1;
        maximumRow = Math.max(maximumRow, Math.min(MAXIMUM_GRID_ROWS, rowStart + rowSpan - 1));
    }
    if (maximumRow === 0) return "";

    return Array.from({ length: maximumRow }, (_, index) => {
        const row = index + 1;
        const fixedHeight = rowHeights.get(row);
        if (fixedHeight !== undefined) return `${fixedHeight}px`;
        const minimumHeight = rowMinHeights.get(row);
        return minimumHeight === undefined ? "auto" : `minmax(${minimumHeight}px, auto)`;
    }).join(" ");
}
