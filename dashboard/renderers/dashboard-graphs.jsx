import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});
let getGraphValue = () => undefined;
let formatCompactValue = () => "n/a";
let formatGraphXValue = () => "n/a";

export function configureDashboardGraphs({ getTheme, getStyles, getValue, formatCompact, formatX } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
    if (typeof getValue === "function") getGraphValue = getValue;
    if (typeof formatCompact === "function") formatCompactValue = formatCompact;
    if (typeof formatX === "function") formatGraphXValue = formatX;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

export function DataGraph({ section, index = 0, presentation = "default" }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const terminalMode = presentation === "terminal" && getDashboardTheme()?.followGame === true;
    const rawData = Array.isArray(section?.data) ? section.data : [];
    const requestedPointLimit = Math.floor(Number(section?.maxPoints));
    const pointLimit = Number.isFinite(requestedPointLimit) ? Math.max(2, Math.min(2000, requestedPointLimit)) : 240;
    const xKey = typeof section?.xKey === "string" ? section.xKey : "";
    const series = (Array.isArray(section?.series) ? section.series : []).filter((entry) => entry && typeof entry.key === "string" && entry.key.length > 0 && typeof entry.label === "string");
    const points = rawData.slice(-pointLimit).map((record, pointIndex) => {
        const rawX = xKey ? Number(getGraphValue(record, xKey)) : pointIndex;
        return Number.isFinite(rawX) ? { record, x: rawX } : null;
    }).filter(Boolean).sort((left, right) => left.x - right.x);
    const yValues = points.flatMap(({ record }) => series.map((entry) => Number(getGraphValue(record, entry.key))).filter(Number.isFinite));
    const frameStyle = {
        ...styles.sectionFrame,
        marginTop: index > 0 ? "5px" : 0,
        ...(terminalMode ? { padding: "7px 8px 5px", background: "#000000" } : {}),
    };
    const title = section?.title || "History";

    if (points.length === 0 || series.length === 0 || yValues.length === 0) {
        return <div data-dashboard-theme-role="graph-panel" style={frameStyle}>
            <div data-dashboard-theme-role="data-heading" title={title} style={{ ...styles.strong, ...styles.graphTitle, marginBottom: "5px" }}>{terminalMode ? "> " : ""}{title}</div>
            <div style={styles.muted}>{section?.emptyText || "Collecting history data..."}</div>
        </div>;
    }

    let yMin = Math.min(...yValues);
    let yMax = Math.max(...yValues);
    if (section?.includeZero === true) {
        yMin = Math.min(0, yMin);
        yMax = Math.max(0, yMax);
    }
    if (yMin === yMax) {
        const adjustment = Math.max(1, Math.abs(yMin) * 0.08);
        yMin -= adjustment;
        yMax += adjustment;
    } else {
        const padding = (yMax - yMin) * 0.08;
        yMin -= padding;
        yMax += padding;
    }

    let xMin = points[0].x;
    let xMax = points[points.length - 1].x;
    if (xMin === xMax) {
        xMin -= 1;
        xMax += 1;
    }
    const graphWidth = 760;
    const graphHeight = Math.max(140, Math.min(320, Math.floor(Number(section?.height)) || 190));
    const plot = { left: 68, right: graphWidth - 12, top: 10, bottom: graphHeight - 25 };
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    const scaleX = (value) => plot.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
    const scaleY = (value) => plot.bottom - ((value - yMin) / (yMax - yMin)) * plotHeight;
    const gridTicks = Array.from({ length: 5 }, (_, tickIndex) => {
        const ratio = tickIndex / 4;
        return { value: yMax - ratio * (yMax - yMin), y: plot.top + ratio * plotHeight };
    });
    const yFormat = section?.yFormat ?? "number";
    const xFormat = section?.xFormat ?? "number";
    const renderedSeries = series.map((entry, seriesIndex) => {
        let path = "";
        let drawing = false;
        let latest = null;
        for (const point of points) {
            const value = Number(getGraphValue(point.record, entry.key));
            if (!Number.isFinite(value)) {
                drawing = false;
                continue;
            }
            const x = scaleX(point.x);
            const y = scaleY(value);
            path += `${drawing ? " L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
            drawing = true;
            latest = { x, y, value };
        }
        return { ...entry, color: entry.color || ["#6ee7a8", "#6cb4ff", "#c084fc", "#ffc66c"][seriesIndex % 4], path, latest };
    }).filter((entry) => entry.path && entry.latest);

    return <div data-dashboard-theme-role="graph-panel" style={frameStyle}>
        <div style={styles.graphHeader}>
            <div data-dashboard-theme-role="data-heading" title={title} style={{ ...styles.strong, ...styles.graphTitle }}>{terminalMode ? "> " : ""}{title}</div>
            <div style={{ ...styles.muted, ...styles.tiny, ...styles.graphPointCount }}>{terminalMode ? `[${points.length} pts]` : `${points.length} point${points.length === 1 ? "" : "s"}`}</div>
        </div>
        <div style={styles.graphLegend}>{renderedSeries.map((entry) => <div key={entry.key} style={styles.graphLegendItem}>
            <span style={{ ...styles.graphSwatch, borderRadius: terminalMode ? 0 : styles.graphSwatch.borderRadius, background: entry.color }} />
            <span data-dashboard-theme-role="data-value">{entry.label}{terminalMode ? " = " : ": "}{formatCompactValue(entry.latest.value, yFormat)}</span>
        </div>)}</div>
        <svg role="img" aria-label={title} viewBox={`0 0 ${graphWidth} ${graphHeight}`} preserveAspectRatio="none" style={{ ...styles.graphCanvas, height: `${graphHeight}px` }}>
            <title>{title}</title>
            {gridTicks.map((tick, tickIndex) => <g key={`grid-${tickIndex}`}>
                <line x1={plot.left} y1={tick.y} x2={plot.right} y2={tick.y} stroke={terminalMode ? "rgba(238, 245, 255, 0.11)" : "rgba(125, 160, 125, 0.16)"} strokeDasharray={terminalMode ? "2 5" : undefined} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={plot.left - 7} y={tick.y} fill={terminalMode ? "#999999" : "#759875"} fontSize="9" textAnchor="end" dominantBaseline="middle">{formatCompactValue(tick.value, yFormat)}</text>
            </g>)}
            {terminalMode ? react.createElement("path", { "aria-hidden": "true", d: `M ${plot.left} ${plot.top} V ${plot.bottom} H ${plot.right} v 4`, fill: "none", stroke: "rgba(238, 245, 255, 0.34)", strokeWidth: "1", vectorEffect: "non-scaling-stroke" }) : null}
            {yMin < 0 && yMax > 0 ? <line x1={plot.left} y1={scaleY(0)} x2={plot.right} y2={scaleY(0)} stroke="rgba(238, 245, 255, 0.38)" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" /> : null}
            {renderedSeries.map((entry) => <g key={entry.key}>
                <path d={entry.path} fill="none" stroke={entry.color} strokeWidth={Number(entry.strokeWidth) || 2} strokeLinejoin={terminalMode ? "miter" : "round"} strokeLinecap={terminalMode ? "square" : "round"} vectorEffect="non-scaling-stroke" />
                {terminalMode ? react.createElement("rect", { x: entry.latest.x - 3, y: entry.latest.y - 3, width: "6", height: "6", fill: entry.color, vectorEffect: "non-scaling-stroke" }, react.createElement("title", null, `${entry.label}: ${formatCompactValue(entry.latest.value, yFormat)}`)) : <circle cx={entry.latest.x} cy={entry.latest.y} r="3" fill={entry.color} vectorEffect="non-scaling-stroke"><title>{entry.label}: {formatCompactValue(entry.latest.value, yFormat)}</title></circle>}
            </g>)}
            <text x={plot.left} y={graphHeight - 7} fill={terminalMode ? "#999999" : "#759875"} fontSize="9" textAnchor="start">{formatGraphXValue(xMin, xFormat)}</text>
            <text x={plot.right} y={graphHeight - 7} fill={terminalMode ? "#999999" : "#759875"} fontSize="9" textAnchor="end">{formatGraphXValue(xMax, xFormat)}</text>
        </svg>
    </div>;
}
