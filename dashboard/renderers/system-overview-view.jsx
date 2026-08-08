import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import {
    DASHBOARD_FRAME_CONTROL_LABELS,
    getDashboardFrameControlGroupStyle,
    getDashboardFrameControlStyle,
    runDashboardFrameControlClick,
    runDashboardFrameControlMouseDown,
} from "dashboard/libs/frame-controls.js";
import { selectDashboardViewItems, selectDashboardViewServiceGroups } from "dashboard/libs/dashboard-view-selection.js";
import { DataGraph } from "dashboard/renderers/dashboard-graphs.jsx";
import {
    HomeGaugeCard,
    HomeHealthRing,
    HomeMetricCard,
    HomePanel,
    HomeServiceLandscape,
} from "dashboard/renderers/system-overview-panels.jsx";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});
let getTonePalette = () => ({ accent: "#9ab0cc", border: "rgba(125, 160, 212, 0.2)" });
let playerStatsWidgetWidth = 320;
let PlayerStatsOverview = () => null;

export function configureSystemOverviewView({ getTheme, getStyles, getTone, playerStatsWidth, renderPlayerStats } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
    if (typeof getTone === "function") getTonePalette = getTone;
    if (Number.isFinite(playerStatsWidth)) playerStatsWidgetWidth = playerStatsWidth;
    if (typeof renderPlayerStats === "function") PlayerStatsOverview = renderPlayerStats;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

export function SystemOverview({ view, metrics, playerHudDefinitions, playerStatsEnabled, dashboardTheme, gauges, healthServices, serviceGroups, serviceHealthById, serviceRuntimeById, graphs, scrollRef, onScroll, onExit, windowControl, killAllControl, closeControl, compactControls = false, widgetStyles }) {
    const react = getReact();
    const styles = widgetStyles ?? getWidgetStyles();
    if (!react) return null;
    const compactControlStyle = compactControls
        ? { height: "20px", minHeight: "20px", padding: "3px 7px", fontSize: "10px" }
        : null;
    const widgets = Array.isArray(view?.widgets) ? view.widgets : [];
    const hasPlayerStatsWidget = playerStatsEnabled !== false && widgets.some((widget) => widget?.type === "player-stats");
    const configuredColumns = Math.floor(Number(
        playerStatsEnabled === false
            ? view?.layout?.columnsWithoutPlayerStats ?? view?.layout?.columns
            : view?.layout?.columns
    ));
    const columns = Number.isFinite(configuredColumns) ? Math.max(1, Math.min(6, configuredColumns)) : 3;
    const configuredGap = Math.floor(Number(view?.layout?.gap));
    const gap = Number.isFinite(configuredGap) ? Math.max(0, Math.min(24, configuredGap)) : 10;
    const gridTemplateColumns = hasPlayerStatsWidget && columns > 1
        ? `repeat(${columns - 1}, minmax(0, 1fr)) ${playerStatsWidgetWidth}px`
        : `repeat(${columns}, minmax(0, 1fr))`;
    const renderWidget = (widget) => {
        const configuredSpan = Math.floor(Number(widget?.columnSpan));
        const columnSpan = Number.isFinite(configuredSpan)
            ? Math.max(1, Math.min(columns, configuredSpan))
            : 1;
        const configuredColumnStart = Math.floor(Number(widget?.columnStart));
        const columnStart = Number.isFinite(configuredColumnStart)
            ? Math.max(1, Math.min(columns, configuredColumnStart))
            : null;
        const effectiveColumnSpan = columnStart == null
            ? columnSpan
            : Math.max(1, Math.min(columnSpan, columns - columnStart + 1));
        const configuredRowStart = Math.floor(Number(widget?.rowStart));
        const rowStart = Number.isFinite(configuredRowStart) ? Math.max(1, configuredRowStart) : null;
        const configuredRowSpan = Math.floor(Number(widget?.rowSpan));
        const rowSpan = Number.isFinite(configuredRowSpan) ? Math.max(1, configuredRowSpan) : 1;
        const wrapperStyle = {
            minWidth: 0,
            gridColumn: columnStart == null ? `span ${effectiveColumnSpan}` : `${columnStart} / span ${effectiveColumnSpan}`,
            gridRow: rowStart == null
                ? (rowSpan > 1 ? `span ${rowSpan}` : undefined)
                : `${rowStart} / span ${rowSpan}`,
        };
        const title = typeof widget?.title === "string" ? widget.title : "Overview";
        const subtitle = typeof widget?.subtitle === "string" ? widget.subtitle : "";
        const emptyText = typeof widget?.emptyText === "string" ? widget.emptyText : "No data available.";

        if (widget.type === "metrics") {
            const selectedMetrics = selectDashboardViewItems(metrics, widget);
            return <div key={widget.id} style={wrapperStyle}><HomePanel title={title} subtitle={subtitle} widgetStyles={styles}>
                {selectedMetrics.length > 0 ? <div style={styles.homeMetricGrid}>
                    {selectedMetrics.map((metric) => <HomeMetricCard key={metric.id} metric={metric} />)}
                </div> : <div style={styles.muted}>{emptyText}</div>}
            </HomePanel></div>;
        }

        if (widget.type === "player-stats") {
            if (playerStatsEnabled === false) return null;
            const widgetServiceIds = Array.isArray(widget.serviceIds)
                ? widget.serviceIds.filter((value) => typeof value === "string")
                : [];
            const serviceIds = widgetServiceIds.length > 0 ? new Set(widgetServiceIds) : null;
            const selectedDefinitions = (Array.isArray(playerHudDefinitions) ? playerHudDefinitions : [])
                .filter((definition) => (!serviceIds || serviceIds.has(definition.serviceId)) && (definition.groups?.length ?? 0) > 0);
            const runtimeStatuses = widgetServiceIds.map((serviceId) => serviceRuntimeById?.[serviceId]).filter(Boolean);
            const isOffline = runtimeStatuses.some((status) => status?.requiresRuntime && !status?.running);
            return <div key={widget.id} style={{ ...wrapperStyle, ...styles.playerStatusColumn }}>
                <HomePanel title={title} subtitle={subtitle} widgetStyles={styles} muted={isOffline}>
                    {isOffline
                        ? <div style={styles.muted}>Service is offline.</div>
                        : selectedDefinitions.length > 0
                            ? <PlayerStatsOverview definitions={selectedDefinitions} dashboardTheme={dashboardTheme} groupIds={widget.groupIds} orientation={widget.orientation} />
                            : <div style={styles.muted}>{emptyText}</div>}
                </HomePanel>
            </div>;
        }

        if (widget.type === "health") {
            const selectedServices = selectDashboardViewItems(healthServices, widget);
            const counts = selectedServices.reduce((result, service) => {
                if (service.level === "danger") result.danger += 1;
                else if (service.level === "warn") result.warn += 1;
                else result.healthy += 1;
                return result;
            }, { danger: 0, warn: 0, healthy: 0 });
            const alerts = selectedServices
                .filter((service) => service.level === "warn" || service.level === "danger")
                .sort((left, right) => left.level === right.level ? left.label.localeCompare(right.label) : left.level === "danger" ? -1 : 1);
            const configuredAlertLimit = Math.floor(Number(widget.maxAlerts));
            const alertLimit = Number.isFinite(configuredAlertLimit) ? Math.max(0, configuredAlertLimit) : 2;
            const visibleAlerts = alerts.slice(0, alertLimit);
            const hiddenAlertCount = Math.max(0, alerts.length - visibleAlerts.length);
            return <div key={widget.id} style={wrapperStyle}><HomePanel title={title} subtitle={subtitle} widgetStyles={styles}>
                <HomeHealthRing counts={counts} />
                <div style={styles.homeAlertList}>
                    {visibleAlerts.length > 0 ? visibleAlerts.map((alert) => {
                        const palette = getTonePalette(alert.level);
                        return <div key={alert.id} style={{ ...styles.homeAlert, borderColor: palette.border }}>
                            <span style={{ color: palette.accent, fontWeight: 800 }}>{alert.level === "danger" ? "!!" : "!"}</span>
                            <span><span style={{ color: palette.accent }}>{alert.label}</span>{alert.summary ? ` — ${alert.summary}` : ""}</span>
                        </div>;
                    }) : <div style={{ ...styles.homeAlert, borderColor: "rgba(110, 231, 168, 0.2)", color: "#8ef0b5" }}>
                        <span>✓</span><span>No warnings or danger alerts.</span>
                    </div>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <div style={styles.homeMetricSource}>Dashboard</div>
                    {hiddenAlertCount > 0 ? <div style={styles.homePanelSubtitle}>+{hiddenAlertCount} more alert{hiddenAlertCount === 1 ? "" : "s"}</div> : null}
                </div>
            </HomePanel></div>;
        }

        if (widget.type === "gauges") {
            const selectedGauges = selectDashboardViewItems(gauges, widget);
            const configuredGaugeSize = Math.floor(Number(widget.gaugeSize));
            const gaugeSize = Number.isFinite(configuredGaugeSize) ? configuredGaugeSize : 84;
            // homeGaugeGrid's static gridTemplateColumns hardcodes a 116px column minimum, which
            // doesn't track widget.gaugeSize - shrinking the configured size left the grid cell
            // (and therefore HomeGaugeCard's frame) unchanged, wasting the saved space instead of
            // shrinking with it. Deriving the minimum from the actual gauge size fixes that.
            return <div key={widget.id} style={wrapperStyle}><HomePanel title={title} subtitle={subtitle} widgetStyles={styles}>
                {selectedGauges.length > 0 ? <div style={{ ...styles.homeGaugeGrid, gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(64, gaugeSize + 16)}px, 1fr))` }}>
                    {selectedGauges.map((gauge) => <HomeGaugeCard key={gauge.id} gauge={gauge} size={gaugeSize} />)}
                </div> : <div style={styles.muted}>{emptyText}</div>}
            </HomePanel></div>;
        }

        if (widget.type === "service-health") {
            const selectedGroups = selectDashboardViewServiceGroups(serviceGroups, widget);
            return <div key={widget.id} style={wrapperStyle}><HomePanel title={title} subtitle={subtitle} widgetStyles={styles}>
                {selectedGroups.length > 0
                    ? <HomeServiceLandscape groups={selectedGroups} healthById={serviceHealthById} />
                    : <div style={styles.muted}>{emptyText}</div>}
                <div style={styles.homeMetricSource}>Dashboard</div>
            </HomePanel></div>;
        }

        if (widget.type === "graphs") {
            const selectedGraphs = selectDashboardViewItems(graphs, widget);
            const configuredGraphColumns = Math.floor(Number(widget.graphColumns));
            const graphColumns = Number.isFinite(configuredGraphColumns) ? Math.max(1, Math.min(4, configuredGraphColumns)) : 2;
            const configuredGraphHeight = Math.floor(Number(widget.graphHeight));
            const graphHeight = Number.isFinite(configuredGraphHeight) ? configuredGraphHeight : 160;
            return <div key={widget.id} style={wrapperStyle}><HomePanel title={title} subtitle={subtitle} widgetStyles={styles}>
                {selectedGraphs.length > 0 ? <div style={{ ...styles.homeGraphGrid, marginTop: 0, gridTemplateColumns: `repeat(${graphColumns}, minmax(0, 1fr))` }}>
                    {selectedGraphs.map((graph) => {
                        const runtime = serviceRuntimeById?.[graph.serviceId];
                        const offline = Boolean(runtime?.requiresRuntime && !runtime?.running);
                        return <DataGraph
                            key={graph.id}
                            section={{ ...graph, height: graphHeight }}
                            index={0}
                            presentation="terminal"
                            offline={offline}
                            sourceLabel={graph.sourceLabel}
                        />;
                    })}
                </div> : <div style={styles.muted}>{emptyText}</div>}
            </HomePanel></div>;
        }

        return null;
    };

    return <main data-dashboard-theme-role="app-frame" ref={scrollRef} aria-label="System overview" style={styles.systemOverview} onScroll={onScroll}>
        <div data-dashboard-theme-role="hero-frame" style={styles.homeHeader}>
            <div>
                <div style={styles.homeTitle}>{view?.title ?? view?.menuLabel ?? "Overview"}</div>
                {view?.subtitle ? <div style={{ ...styles.muted, marginTop: "3px" }}>{view.subtitle}</div> : null}
            </div>
            <div style={getDashboardFrameControlGroupStyle(compactControls ? { gap: "5px" } : null)}>
                {killAllControl}
                {windowControl}
                {closeControl ?? <button type="button" title="Close System Overview and return to dashboard controls" style={getDashboardFrameControlStyle("neutral", compactControlStyle)} onMouseDown={(event) => runDashboardFrameControlMouseDown(event, onExit)} onClick={(event) => runDashboardFrameControlClick(event, onExit)}>
                    {view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}
                </button>}
            </div>
        </div>
        <div style={{ ...styles.homeWidgetGrid, gridTemplateColumns, gap: `${gap}px` }}>{widgets.map(renderWidget)}</div>
    </main>;
}
