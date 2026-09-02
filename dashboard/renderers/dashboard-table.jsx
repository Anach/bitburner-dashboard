import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import { ACTION_TONE_STYLES, normalizeActionTone } from "dashboard/libs/action-tones.js";
import { formatTelemetryFieldValue } from "dashboard/libs/plugin-integration.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);

export function configureDashboardTable({ getTheme } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

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

function formatCellValue(value, column) {
    if (value == null || value === "") return column.emptyValue ?? "-";
    return formatTelemetryFieldValue(value, column.format);
}

function formatSummary(summary, rows, conflictCount) {
    let value;
    if (summary.aggregate === "count") {
        value = rows.length;
    } else if (summary.aggregate === "maxPlusOne") {
        const values = rows.map((row) => Number(getValue(row, summary.key))).filter(Number.isFinite);
        value = values.length > 0 ? Math.max(...values) + 1 : "-";
    } else if (summary.aggregate === "conflictCount") {
        value = conflictCount;
    } else {
        return null;
    }
    if (summary.hideWhenZero && Number(value) === 0) return null;
    return {
        text: summary.format === "suffix" ? `${value} ${summary.label}` : `${summary.label}: ${value}`,
        tone: summary.tone,
    };
}

export function DashboardDataTable({ section, widgetStyles }) {
    const react = getReact();
    if (!react) return null;
    const rows = Array.isArray(section?.rows) ? section.rows : [];
    const columns = Array.isArray(section?.columns) ? section.columns : [];
    const summaries = (Array.isArray(section?.summaries) ? section.summaries : [])
        .map((summary) => formatSummary(getObject(summary), rows, Number(section?.conflictCount) || 0))
        .filter(Boolean);
    const baseStyles = getObject(widgetStyles);
    const headerCellStyle = {
        padding: "7px 9px",
        borderBottom: "1px solid rgba(125, 160, 212, 0.45)",
        textAlign: "left",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
    };
    const cellStyle = {
        padding: "8px 9px",
        borderBottom: "1px solid rgba(125, 160, 212, 0.18)",
        verticalAlign: "top",
    };

    if (rows.length === 0) {
        return <div style={baseStyles.muted}>{section?.emptyText ?? "No table rows have been contributed."}</div>;
    }

    return (
        <div>
            {summaries.length > 0 ? (
                <div style={{ ...baseStyles.smallMuted, marginBottom: "8px" }}>
                    {summaries.map((summary, index) => (
                        <span key={`${summary.text}-${index}`} style={summary.tone === "danger" ? { color: "#ff5f5f" } : undefined}>
                            {index > 0 ? " · " : ""}{summary.text}
                        </span>
                    ))}
                </div>
            ) : null}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: section?.minWidth ?? "640px", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                        {columns.map((column) => <col key={column.key} style={column.width ? { width: column.width } : undefined} />)}
                    </colgroup>
                    <thead>
                        <tr data-dashboard-theme-role="data-heading">
                            {columns.map((column) => (
                                <th key={column.key} style={{ ...headerCellStyle, textAlign: column.align ?? "left" }}>{column.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => {
                            const rowKey = getValue(row, section?.rowKey) ?? rowIndex;
                            return (
                                <tr
                                    key={String(rowKey)}
                                    data-dashboard-theme-role="data-row"
                                    style={row?._conflict ? { background: "rgba(255, 60, 60, 0.1)" } : undefined}
                                >
                                    {columns.map((column) => {
                                        const value = getValue(row, column.key);
                                        const secondary = getValue(row, column.secondaryKey);
                                        const conflictStyle = row?._conflict && column.key === section?.conflictKey
                                            ? { color: "#ff5f5f" }
                                            : {};
                                        // toneKey looks up a per-row tone value (e.g. row.backdoorTone) rather
                                        // than coloring the whole column one fixed color like `accent` does -
                                        // the script that owns the data decides what's "important" per row
                                        // (same toneKey convention buildPluginIntegrationTelemetryLine already
                                        // uses for state lines), the table just maps that tone to a color via
                                        // the same shared palette action buttons use (dashboard/libs/action-tones.js).
                                        const toneStyle = typeof column.toneKey === "string"
                                            ? { color: ACTION_TONE_STYLES[normalizeActionTone(getValue(row, column.toneKey))].color }
                                            : {};
                                        // The dashboard's own theme adapter (adaptStyleValue in theme-adapter.js)
                                        // treats every "data-value"-tagged element as plain data and forces its
                                        // color back to the theme's default secondary color unless the color
                                        // classifies as warning/error - by design, so components can't pick
                                        // arbitrary colors that clash with the user's chosen theme. That's the
                                        // right default for an unstyled cell, but it silently flattened this
                                        // column's own deliberately-chosen accent/toneKey color right back to
                                        // gray (confirmed: only the "warn"-toned Backdoor column kept its color,
                                        // every accent-colored column and the "success"-toned Ports column did
                                        // not). A column that explicitly opts into a color is trusted exactly as
                                        // given, so it skips the role tag entirely rather than fighting the
                                        // adapter over it.
                                        const hasCustomColor = Boolean(column.accent) || typeof column.toneKey === "string";
                                        return (
                                            <td
                                                key={column.key}
                                                data-dashboard-theme-role={hasCustomColor ? undefined : "data-value"}
                                                style={{
                                                    ...cellStyle,
                                                    textAlign: column.align ?? "left",
                                                    textTransform: column.uppercase ? "uppercase" : undefined,
                                                    overflowWrap: column.wrap ? "anywhere" : undefined,
                                                    fontWeight: column.emphasis ? 800 : undefined,
                                                    fontSize: column.emphasis ? "15px" : column.uppercase ? "11px" : undefined,
                                                    color: column.accent,
                                                    ...toneStyle,
                                                    ...conflictStyle,
                                                }}
                                            >
                                                <div>{formatCellValue(value, column)}</div>
                                                {secondary != null && secondary !== "" ? (
                                                    <div style={{ ...baseStyles.smallMuted, marginTop: "2px", overflowWrap: "anywhere" }}>{formatTelemetryFieldValue(secondary, column.format)}</div>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
