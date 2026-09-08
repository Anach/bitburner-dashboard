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

// Descriptors set only the rows they need to tune. Unspecified rows remain content-sized, while
// minmax preserves content rather than clipping a panel that needs more vertical space.
export function buildGridTemplateRows(rawRowMinHeights, widgets = []) {
    const rowHeights = new Map();
    if (rawRowMinHeights && typeof rawRowMinHeights === "object" && !Array.isArray(rawRowMinHeights)) {
        for (const [rawRow, rawHeight] of Object.entries(rawRowMinHeights)) {
            const row = normalizeRowNumber(rawRow);
            const height = normalizeRowHeight(rawHeight);
            if (row !== null && height !== null) rowHeights.set(row, height);
        }
    }

    let maximumRow = Math.max(0, ...rowHeights.keys());
    for (const widget of Array.isArray(widgets) ? widgets : []) {
        const rowStart = normalizeRowNumber(widget?.rowStart);
        if (rowStart === null) continue;
        const rowSpan = normalizeRowNumber(widget?.rowSpan) ?? 1;
        maximumRow = Math.max(maximumRow, Math.min(MAXIMUM_GRID_ROWS, rowStart + rowSpan - 1));
    }
    if (maximumRow === 0) return "";

    return Array.from({ length: maximumRow }, (_, index) => {
        const height = rowHeights.get(index + 1);
        return height === undefined ? "auto" : `minmax(${height}px, auto)`;
    }).join(" ");
}
