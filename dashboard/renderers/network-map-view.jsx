import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import {
    DASHBOARD_FRAME_CONTROL_LABELS,
    getDashboardFrameControlGroupStyle,
    getDashboardFrameControlOverlayStyle,
    getDashboardFrameControlStyle,
    runDashboardFrameControlClick,
    runDashboardFrameControlMouseDown,
} from "dashboard/libs/frame-controls.js";
import { buildGroupedNetworkLayout, buildLayeredNetworkLayout, fitNetworkLayout } from "dashboard/libs/network-layout.js";
import {
    getDashboardViewInteractionState,
    getDashboardViewValue,
    saveDashboardViewInteractionState,
    setDashboardViewDragActiveState,
} from "dashboard/libs/dashboard-view-state.js";
import { formatNetworkMapMetric } from "dashboard/libs/network-map-utils.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});

export function configureNetworkMapView({ getTheme, getStyles } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

function getHomeTonePalette(tone = "neutral") {
    const palettes = {
        neutral: { accent: "#9ab0cc", border: "rgba(125, 160, 212, 0.2)", glow: "rgba(125, 160, 212, 0.08)" },
        info: { accent: "#8fc5ff", border: "rgba(108, 180, 255, 0.3)", glow: "rgba(108, 180, 255, 0.1)" },
        success: { accent: "#8ef0b5", border: "rgba(110, 231, 168, 0.3)", glow: "rgba(110, 231, 168, 0.1)" },
        warn: { accent: "#ffd17a", border: "rgba(255, 198, 92, 0.32)", glow: "rgba(255, 198, 92, 0.1)" },
        danger: { accent: "#ff9a9a", border: "rgba(255, 122, 122, 0.34)", glow: "rgba(255, 122, 122, 0.1)" },
    };
    return palettes[tone] ?? palettes.neutral;
}
export function NetworkMapView({ view, telemetry, serviceStatus, onCommand, onInputFocusChange, onExit, windowControl, closeControl, minimizeControl, widgetStyles }) {
    const react = getReact();
    const styles = widgetStyles ?? getWidgetStyles();
    if (!react) return null;
    // Deliberately hides the whole map (not just fades it) when the backing service isn't
    // running - showing nodes/routes/telemetry that are no longer actually being produced would
    // read as live data when it's really a frozen last-known snapshot, which feels like cheating.
    const isOffline = Boolean(serviceStatus?.requiresRuntime && !serviceStatus?.running);
    const dataConfig = view?.data ?? {};
    const fields = view?.fields ?? {};
    const layoutConfig = view?.layout ?? {};
    const actionConfig = view?.actions ?? {};
    const filterConfig = view?.filters ?? {};
    const modeSelector = view?.modeSelector ?? {};
    const rawModeMaps = getDashboardViewValue(telemetry, dataConfig.mapsKey);
    const modeMaps = rawModeMaps && typeof rawModeMaps === "object" ? rawModeMaps : null;
    const rawModeOptions = getDashboardViewValue(telemetry, dataConfig.mapOptionsKey);
    const modeOptions = Array.isArray(rawModeOptions) ? rawModeOptions : [];
    const savedInteraction = getDashboardViewInteractionState(view?.id ?? "");
    const defaultModeId = String(modeSelector.defaultId ?? modeOptions[0]?.[modeSelector.idKey] ?? "");
    const [selectedModeId, setSelectedModeId] = React.useState(() => String(savedInteraction?.selectedModeId ?? defaultModeId));
    const activeModeOption = modeOptions.find((option) => String(getDashboardViewValue(option, modeSelector.idKey) ?? "") === selectedModeId)
        ?? modeOptions.find((option) => String(getDashboardViewValue(option, modeSelector.idKey) ?? "") === defaultModeId)
        ?? null;
    const activeModeId = String(getDashboardViewValue(activeModeOption, modeSelector.idKey) ?? selectedModeId ?? defaultModeId);
    // modeMaps existing but not yet containing activeModeId means the backend is still building
    // that mode's data on-demand (see network-navigator.js) - falling back to the whole `telemetry`
    // object here would substitute a DIFFERENT mode's nodes (wrong shape for this layout strategy)
    // instead of showing "no data yet". That wrong-shaped interim render has non-zero nodes, which
    // makes the fit-on-load effect below fit against it and mark fittedRef.current = true - so when
    // the real data for this mode arrives moments later, the effect never re-fits, leaving the map
    // positioned off-screen. Falling back to null instead keeps nodes.length at 0 during the wait,
    // which the fit effect already treats as "nothing to fit yet".
    const activeTelemetry = modeMaps ? (modeMaps[activeModeId] ?? null) : telemetry;
    const layoutStrategy = String(getDashboardViewValue(activeModeOption, modeSelector.layoutKey) ?? "layered");
    const showRoutes = getDashboardViewValue(activeModeOption, modeSelector.routesKey) !== false;
    const showCloudControl = getDashboardViewValue(activeModeOption, modeSelector.cloudKey) !== false;
    const showNodeFilters = getDashboardViewValue(activeModeOption, modeSelector.filtersKey) !== false;
    const stateSetId = String(getDashboardViewValue(activeModeOption, modeSelector.stateSetKey) ?? "");
    const metricSetId = String(getDashboardViewValue(activeModeOption, modeSelector.metricSetKey) ?? "");
    const filterDefinitions = Array.isArray(filterConfig.nodeFilters) ? filterConfig.nodeFilters : [];
    const stateDefinitions = Array.isArray(view?.stateSets?.[stateSetId])
        ? view.stateSets[stateSetId]
        : Array.isArray(view?.states) ? view.states : [];
    const metricDefinitions = Array.isArray(view?.metricSets?.[metricSetId])
        ? view.metricSets[metricSetId]
        : Array.isArray(view?.metrics) ? view.metrics : [];
    const nodeActionDefinitions = Array.isArray(view?.nodeActions) ? view.nodeActions : [];
    const rawNodes = getDashboardViewValue(activeTelemetry, dataConfig.nodesKey);
    const rawEdges = getDashboardViewValue(activeTelemetry, dataConfig.edgesKey);
    const allNodes = Array.isArray(rawNodes) ? rawNodes : [];
    const edges = Array.isArray(rawEdges) ? rawEdges : [];
    const currentId = String(getDashboardViewValue(activeTelemetry, dataConfig.currentKey) ?? "");
    const canConnect = Boolean(getDashboardViewValue(activeTelemetry, dataConfig.capabilityKey));
    const updatedAt = Number(getDashboardViewValue(activeTelemetry, dataConfig.updatedKey)) || 0;
    const lastResult = getDashboardViewValue(activeTelemetry, dataConfig.lastResultKey);
    const viewportRef = React.useRef(null);
    const detailsRef = React.useRef(null);
    const panRef = React.useRef(null);
    // Tracks the activeModeId we last fit the transform for (not just a yes/no flag) so a
    // stale saved transform from a DIFFERENT mode - or from before on-demand mode loading
    // existed at all - can never be mistaken for "already fit". Restored from savedInteraction's
    // OWN fittedModeId (the actual fit-completion marker, persisted below), not re-derived from
    // selectedModeId+transform - those two can go briefly inconsistent right after selectMode()
    // switches the mode but before real data has actually been fit (transform still holds the
    // PREVIOUS mode's value in that window), and a remount landing exactly then would otherwise
    // wrongly trust that stale transform and skip fitting forever.
    const fittedRef = React.useRef(
        savedInteraction?.transform && String(savedInteraction?.fittedModeId ?? "") === activeModeId
            ? activeModeId
            : null
    );
    const savedViewportBounds = savedInteraction?.viewportBounds && typeof savedInteraction.viewportBounds === "object"
        ? savedInteraction.viewportBounds
        : {};
    const lastViewportBoundsRef = React.useRef({
        width: Math.max(0, Number(savedViewportBounds.width) || 0),
        height: Math.max(0, Number(savedViewportBounds.height) || 0),
    });
    const [transform, setTransform] = React.useState(() => savedInteraction?.transform ?? { x: 24, y: 70, scale: 1 });
    const [selectedId, setSelectedId] = React.useState(() => String(savedInteraction?.selectedId ?? ""));
    const [stepTargetId, setStepTargetId] = React.useState(() => String(savedInteraction?.stepTargetId ?? ""));
    const [showCloud, setShowCloud] = React.useState(() => typeof savedInteraction?.showCloud === "boolean"
        ? savedInteraction.showCloud
        : Boolean(filterConfig.showCloudDefault));
    const [modeMenuOpen, setModeMenuOpen] = React.useState(() => Boolean(savedInteraction?.modeMenuOpen));
    const [filtersOpen, setFiltersOpen] = React.useState(() => Boolean(savedInteraction?.filtersOpen));
    const [selectedFilterIds, setSelectedFilterIds] = React.useState(() => Array.isArray(savedInteraction?.selectedFilterIds)
        ? savedInteraction.selectedFilterIds.filter((id) => typeof id === "string")
        : []);
    const [searchText, setSearchText] = React.useState(() => String(savedInteraction?.searchText ?? ""));
    const [detailsScrollTop, setDetailsScrollTop] = React.useState(() => Math.max(0, Number(savedInteraction?.detailsScrollTop) || 0));
    const [isPanning, setIsPanning] = React.useState(false);
    const [clipboardNotice, setClipboardNotice] = React.useState("");
    const nodes = showCloudControl
        ? allNodes.filter((node) => showCloud || !Boolean(getDashboardViewValue(node, fields.cloud)))
        : allNodes;
    const cloudCount = allNodes.filter((node) => Boolean(getDashboardViewValue(node, fields.cloud))).length;
    const layout = layoutStrategy === "grouped"
        ? buildGroupedNetworkLayout(nodes, fields, layoutConfig)
        : buildLayeredNetworkLayout(nodes, fields, layoutConfig);
    const nodeById = new Map(nodes.map((node) => [String(getDashboardViewValue(node, fields.id) ?? ""), node]));
    const selectedNode = nodeById.get(selectedId) ?? null;
    const selectedRoute = Array.isArray(getDashboardViewValue(selectedNode, fields.route))
        ? getDashboardViewValue(selectedNode, fields.route).map(String)
        : [];
    const stepTargetNode = nodeById.get(stepTargetId) ?? null;
    const stepRoute = Array.isArray(getDashboardViewValue(stepTargetNode, fields.route))
        ? getDashboardViewValue(stepTargetNode, fields.route).map(String)
        : [];
    const currentStepIndex = stepRoute.indexOf(currentId);
    const nextStepId = !stepTargetNode || currentId === stepTargetId
        ? ""
        : currentStepIndex >= 0
            ? String(stepRoute[currentStepIndex + 1] ?? "")
            : String(stepRoute[0] ?? "");
    const visibleRoute = stepTargetNode ? stepRoute : selectedRoute;
    const routeNodeIds = new Set(visibleRoute);
    const routeFocusActive = showRoutes && visibleRoute.length > 0;
    const selectedFilterIdSet = new Set(selectedFilterIds);
    const activeFilterDefinitions = filterDefinitions.filter((filter) => selectedFilterIdSet.has(filter.id));
    const filterFocusActive = showNodeFilters && activeFilterDefinitions.length > 0;
    const routeEdgeKeys = new Set(visibleRoute.slice(1).map((id, index) => [visibleRoute[index], id].sort().join("\u0000")));
    const minimumScale = Math.max(0.05, Number(layoutConfig.minScale) || 0.35);
    const maximumScale = Math.max(minimumScale, Number(layoutConfig.maxScale) || 1.8);
    const overlayInsetRight = Math.max(0, Number(layoutConfig.overlayInsetRight) || 0);
    const inspectorWidth = Math.max(240, Number(layoutConfig.inspectorWidth) || 286);
    const inspectorLabelWidth = Math.max(90, Math.min(inspectorWidth - 100, Number(layoutConfig.inspectorLabelWidth) || 120));
    const previousShowCloudRef = React.useRef(showCloud);
    const previousDetailsSelectedIdRef = React.useRef(selectedId);

    React.useEffect(() => {
        const releaseDragOnBlur = () => {
            if (!panRef.current) return;
            panRef.current = null;
            setIsPanning(false);
            setDashboardViewDragActiveState(false);
        };
        globalThis.addEventListener?.("blur", releaseDragOnBlur);
        return () => {
            globalThis.removeEventListener?.("blur", releaseDragOnBlur);
            setDashboardViewDragActiveState(false);
        };
    }, []);

    const getUsableViewportWidth = (bounds, reserveInspector = Boolean(selectedNode)) => {
        return Math.max(120, bounds.width - (reserveInspector ? overlayInsetRight : 0));
    };

    React.useLayoutEffect(() => {
        const cloudVisibilityChanged = previousShowCloudRef.current !== showCloud;
        if ((!cloudVisibilityChanged && fittedRef.current === activeModeId) || !viewportRef.current || nodes.length === 0) return;
        const bounds = viewportRef.current.getBoundingClientRect();
        lastViewportBoundsRef.current = { width: bounds.width, height: bounds.height };
        setTransform(fitNetworkLayout(layout, getUsableViewportWidth(bounds), bounds.height, layoutConfig));
        fittedRef.current = activeModeId;
        previousShowCloudRef.current = showCloud;
    }, [view?.id, activeModeId, showCloud, layout.width, layout.height, nodes.length]);

    React.useLayoutEffect(() => {
        const element = viewportRef.current;
        const Observer = globalThis.ResizeObserver;
        if (!element || typeof Observer !== "function" || nodes.length === 0) return undefined;
        const observer = new Observer((entries) => {
            const entry = entries?.[0];
            const bounds = entry?.contentRect ?? element.getBoundingClientRect();
            const previous = lastViewportBoundsRef.current;
            if (
                Math.abs(bounds.width - previous.width) < 1
                && Math.abs(bounds.height - previous.height) < 1
            ) return;
            lastViewportBoundsRef.current = { width: bounds.width, height: bounds.height };
            setTransform(fitNetworkLayout(layout, getUsableViewportWidth(bounds), bounds.height, layoutConfig));
            fittedRef.current = activeModeId;
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [view?.id, activeModeId, showCloud, layout.width, layout.height, nodes.length, Boolean(selectedNode)]);

    // useLayoutEffect (not useEffect) so this save is synchronous with the click that caused it.
    // The dashboard's outer main loop can remount this whole tree via a fresh ns.printRaw() call
    // at any moment - driven by its own ns.sleep()-based tick, on a totally separate clock from
    // React's own scheduling - whenever ANY telemetry changes anywhere in the dashboard, not just
    // this view's. A plain useEffect defers this save until after paint, leaving a real window
    // where that external remount lands before the save commits, silently discarding whatever was
    // just clicked/zoomed/panned (restored state on the fresh mount would still be the stale,
    // pre-click value). useLayoutEffect runs synchronously as part of the same commit, closing it.
    React.useLayoutEffect(() => {
        saveDashboardViewInteractionState(view?.id ?? "", {
            transform,
            fittedModeId: fittedRef.current,
            selectedId,
            stepTargetId,
            showCloud,
            selectedModeId: activeModeId,
            modeMenuOpen,
            filtersOpen,
            selectedFilterIds,
            searchText,
            detailsScrollTop,
            viewportBounds: lastViewportBoundsRef.current,
        });
    }, [view?.id, activeModeId, transform.x, transform.y, transform.scale, selectedId, stepTargetId, showCloud, modeMenuOpen, filtersOpen, selectedFilterIds.join("|"), searchText, detailsScrollTop]);

    React.useLayoutEffect(() => {
        const element = detailsRef.current;
        if (!element) return;
        const selectionChanged = previousDetailsSelectedIdRef.current !== selectedId;
        previousDetailsSelectedIdRef.current = selectedId;
        const targetScrollTop = selectionChanged ? 0 : detailsScrollTop;
        if (selectionChanged && detailsScrollTop !== 0) setDetailsScrollTop(0);
        if (Math.abs(element.scrollTop - targetScrollTop) > 1) element.scrollTop = targetScrollTop;
    }, [selectedId, detailsScrollTop]);

    React.useEffect(() => () => onInputFocusChange?.(false), []);

    React.useEffect(() => {
        setClipboardNotice("");
    }, [activeModeId, selectedId]);

    const fitView = () => {
        if (!viewportRef.current) return;
        const bounds = viewportRef.current.getBoundingClientRect();
        setTransform(fitNetworkLayout(layout, getUsableViewportWidth(bounds), bounds.height, layoutConfig));
        fittedRef.current = activeModeId;
    };

    const centerNode = (nodeId, reserveInspector = Boolean(selectedNode)) => {
        const position = layout.positions.get(nodeId);
        if (!position || !viewportRef.current) return;
        const bounds = viewportRef.current.getBoundingClientRect();
        const usableWidth = getUsableViewportWidth(bounds, reserveInspector);
        setTransform((current) => ({
            ...current,
            x: (usableWidth / 2) - ((position.x + (position.width / 2)) * current.scale),
            y: (bounds.height / 2) - ((position.y + (position.height / 2)) * current.scale),
        }));
    };

    const zoomBy = (factor) => {
        if (!viewportRef.current) return;
        const bounds = viewportRef.current.getBoundingClientRect();
        const usableWidth = getUsableViewportWidth(bounds);
        setTransform((current) => {
            const nextScale = Math.max(minimumScale, Math.min(maximumScale, current.scale * factor));
            const worldX = ((usableWidth / 2) - current.x) / current.scale;
            const worldY = ((bounds.height / 2) - current.y) / current.scale;
            return {
                x: (usableWidth / 2) - (worldX * nextScale),
                y: (bounds.height / 2) - (worldY * nextScale),
                scale: nextScale,
            };
        });
    };

    const findNode = () => {
        const query = searchText.trim().toLowerCase();
        if (!query) return;
        const searchableNodes = nodes.filter((node) => getDashboardViewValue(node, fields.selectable) !== false);
        const match = searchableNodes.find((node) => String(getDashboardViewValue(node, fields.label) ?? "").toLowerCase() === query)
            ?? searchableNodes.find((node) => String(getDashboardViewValue(node, fields.label) ?? "").toLowerCase().includes(query));
        if (!match) return;
        const id = String(getDashboardViewValue(match, fields.id) ?? "");
        setSelectedId(id);
        setStepTargetId("");
        centerNode(id, true);
    };

    const sendCommand = (prefix, target = "", port) => {
        const serviceId = String(actionConfig.serviceId ?? dataConfig.serviceId ?? "");
        const command = target ? `${prefix}${encodeURIComponent(target)}` : String(prefix ?? "");
        if (!serviceId || !command) return;
        onCommand(serviceId, command, port);
    };

    const lastSentModeIdRef = React.useRef(null);
    React.useEffect(() => {
        // Backend `activeModeId` is in-memory only (reset to its default on every script
        // restart/game reload), while the frontend's initial `selectedModeId` is restored from
        // persisted interaction state. Without this, a restored non-default mode never tells the
        // backend to build it - selectMode() only fires on an actual click - so the on-demand
        // fetch on first open waits forever for data the backend never builds. Runs on mount too,
        // not just on user-driven switches, since lastSentModeIdRef starts null.
        if (!actionConfig.setModePrefix) return;
        const serviceId = String(actionConfig.serviceId ?? dataConfig.serviceId ?? "");
        if (!serviceId || !activeModeId || lastSentModeIdRef.current === activeModeId) return;
        lastSentModeIdRef.current = activeModeId;
        sendCommand(actionConfig.setModePrefix, activeModeId);
    }, [activeModeId, actionConfig.setModePrefix, actionConfig.serviceId, dataConfig.serviceId]);

    const copyNodeActionValue = (value, label) => {
        const text = String(value ?? "");
        if (!text) return;
        try {
            // No focus pre-check here (would require touching document/window, which
            // DASHBOARD_DESIGN_PRINCIPLES.md's Platform Boundaries forbids outright). If the tail
            // window hasn't taken focus yet on the first click, clipboard.writeText() rejects and
            // the .catch() below falls back to showing the terminal command as text instead.
            const clipboard = globalThis?.navigator?.clipboard;
            if (clipboard && typeof clipboard.writeText === "function") {
                void Promise.resolve(clipboard.writeText(text))
                    .then(() => setClipboardNotice(`${label} copied: ${text}`))
                    .catch(() => setClipboardNotice(`Clipboard unavailable. Terminal command: ${text}`));
                return;
            }
        } catch (error) {
            // Fall through to the visible command hint.
        }
        setClipboardNotice(`Clipboard unavailable. Terminal command: ${text}`);
    };

    const handleNodeClick = (nodeId) => {
        const node = nodeById.get(nodeId);
        if (!node || getDashboardViewValue(node, fields.selectable) === false) return;
        if (showRoutes && stepTargetNode && nodeId === nextStepId && canConnect) {
            sendCommand(actionConfig.hopPrefix, nodeId, actionConfig.port);
            return;
        }
        setSelectedId(nodeId);
        if (stepTargetNode && nodeId !== stepTargetId) setStepTargetId("");
    };

    const selectMode = (modeId) => {
        if (!modeId) return;
        setSelectedModeId(modeId);
        setSelectedId("");
        setStepTargetId("");
        setSearchText("");
        setFiltersOpen(false);
        setModeMenuOpen(false);
        fittedRef.current = null;
        // The SetMode command itself is sent by the lastSentModeIdRef effect above, which
        // reacts to activeModeId changing - covers both this click path and initial mount.
    };

    const toggleCloudServers = () => {
        const nextShowCloud = !showCloud;
        if (!nextShowCloud) {
            if (selectedNode && Boolean(getDashboardViewValue(selectedNode, fields.cloud))) setSelectedId("");
            if (stepTargetNode && Boolean(getDashboardViewValue(stepTargetNode, fields.cloud))) setStepTargetId("");
        }
        setShowCloud(nextShowCloud);
    };

    const toggleNodeFilter = (filterId) => {
        setSelectedFilterIds((current) => current.includes(filterId)
            ? current.filter((id) => id !== filterId)
            : [...current, filterId]);
    };

    const handlePointerDown = (event) => {
        if (event.button !== 0 || event.target?.closest?.("[data-network-control='true']")) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        panRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: transform.x,
            originY: transform.y,
            moved: false,
        };
        setDashboardViewDragActiveState(true);
        setIsPanning(true);
    };

    const handlePointerMove = (event) => {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - pan.startX;
        const deltaY = event.clientY - pan.startY;
        if ((deltaX * deltaX) + (deltaY * deltaY) > 16) pan.moved = true;
        setTransform((current) => ({
            ...current,
            x: pan.originX + deltaX,
            y: pan.originY + deltaY,
        }));
    };

    const endPointerPan = (event) => {
        const pan = panRef.current;
        if (pan?.pointerId !== event.pointerId) return;
        panRef.current = null;
        setDashboardViewDragActiveState(false);
        setIsPanning(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (!pan.moved) {
            setSelectedId("");
            setStepTargetId("");
        }
    };

    const handleWheel = (event) => {
        if (event.target?.closest?.("[data-network-control='true']")) return;
        if (event.cancelable) event.preventDefault();
        const bounds = viewportRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const pointerX = event.clientX - bounds.left;
        const pointerY = event.clientY - bounds.top;
        setTransform((current) => {
            const nextScale = Math.max(minimumScale, Math.min(maximumScale, current.scale * (event.deltaY < 0 ? 1.12 : 0.89)));
            const worldX = (pointerX - current.x) / current.scale;
            const worldY = (pointerY - current.y) / current.scale;
            return {
                x: pointerX - (worldX * nextScale),
                y: pointerY - (worldY * nextScale),
                scale: nextScale,
            };
        });
    };

    React.useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return undefined;
        viewport.addEventListener("wheel", handleWheel, { passive: false });
        return () => viewport.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    const resultFields = view?.resultFields ?? {};
    const lastResultStatus = String(getDashboardViewValue(lastResult, resultFields.status) ?? "");
    const lastResultMessage = String(getDashboardViewValue(lastResult, resultFields.message) ?? "");
    const lastResultTime = Number(getDashboardViewValue(lastResult, resultFields.timestamp)) || 0;
    const activeTitle = String(getDashboardViewValue(activeTelemetry, "title") ?? view?.title ?? view?.menuLabel ?? "Network");
    const activeSubtitle = String(getDashboardViewValue(activeTelemetry, "subtitle") ?? view?.subtitle ?? "");
    const activeModeLabel = String(getDashboardViewValue(activeModeOption, modeSelector.labelKey) ?? activeTitle);
    const selectionLabel = String(getDashboardViewValue(activeModeOption, modeSelector.selectionLabelKey) ?? "Selected node");
    const selectionSubject = selectionLabel.replace(/^Selected\s+/i, "").toLowerCase();
    const searchPlaceholder = String(getDashboardViewValue(activeModeOption, modeSelector.searchPlaceholderKey) ?? "Find node");

    return (
        <main
            data-dashboard-theme-role="app-frame"
            ref={viewportRef}
            aria-label={activeTitle}
            style={{ ...styles.networkView, cursor: isOffline ? "default" : isPanning ? "grabbing" : "grab" }}
            onPointerDown={isOffline ? undefined : handlePointerDown}
            onPointerMove={isOffline ? undefined : handlePointerMove}
            onPointerUp={isOffline ? undefined : endPointerPan}
            onPointerCancel={isOffline ? undefined : endPointerPan}
        >
            <div style={styles.networkHeader}>
                <div>
                    <div style={styles.homeTitle}>{activeTitle}</div>
                    <div style={{ ...styles.muted, marginTop: "2px", fontSize: "9px" }}>
                        {activeSubtitle}
                        {updatedAt > 0 ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}` : ""}
                    </div>
                </div>
            </div>

            <div style={getDashboardFrameControlOverlayStyle()} data-network-control="true">
                {minimizeControl}
                {windowControl}
                {closeControl ?? <button
                    type="button"
                    data-network-control="true"
                    title="Return to the dashboard"
                    style={getDashboardFrameControlStyle("neutral", { position: "static" })}
                    onMouseDown={(event) => runDashboardFrameControlMouseDown(event, onExit)}
                    onClick={(event) => runDashboardFrameControlClick(event, onExit)}
                >
                    {view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}
                </button>}
            </div>

            {isOffline ? (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <div style={{ color: "#9ab0cc", fontSize: "16px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Service is offline
                    </div>
                </div>
            ) : (<>
            <div
                style={{
                    ...styles.networkWorld,
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                }}
            >
                <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                    {edges.map((edge, index) => {
                        const sourceId = String(getDashboardViewValue(edge, fields.edgeSource) ?? "");
                        const targetId = String(getDashboardViewValue(edge, fields.edgeTarget) ?? "");
                        const source = layout.positions.get(sourceId);
                        const target = layout.positions.get(targetId);
                        if (!source || !target) return null;
                        const sourceCenterX = source.x + (source.width / 2);
                        const targetCenterX = target.x + (target.width / 2);
                        const leftToRight = sourceCenterX <= targetCenterX;
                        const x1 = source.x + (leftToRight ? source.width : 0);
                        const x2 = target.x + (leftToRight ? 0 : target.width);
                        const y1 = source.y + (source.height / 2);
                        const y2 = target.y + (target.height / 2);
                        const bend = Math.max(28, Math.abs(x2 - x1) * 0.48);
                        const edgeKey = [sourceId, targetId].sort().join("\u0000");
                        const onRoute = routeEdgeKeys.has(edgeKey);
                        const isNext = nextStepId && (
                            (sourceId === currentId && targetId === nextStepId)
                            || (targetId === currentId && sourceId === nextStepId)
                        );
                        return (
                            <path
                                key={`${edgeKey}:${index}`}
                                d={`M ${x1} ${y1} C ${x1 + (leftToRight ? bend : -bend)} ${y1}, ${x2 - (leftToRight ? bend : -bend)} ${y2}, ${x2} ${y2}`}
                                fill="none"
                                stroke={isNext ? "#ffd17a" : onRoute ? "#6cb4ff" : "rgba(86, 126, 105, 0.48)"}
                                strokeWidth={isNext ? 2.4 : onRoute ? 1.8 : 1}
                                vectorEffect="non-scaling-stroke"
                            />
                        );
                    })}
                </svg>

                {nodes.map((node) => {
                    const nodeId = String(getDashboardViewValue(node, fields.id) ?? "");
                    const position = layout.positions.get(nodeId);
                    if (!position) return null;
                    const selectable = getDashboardViewValue(node, fields.selectable) !== false;
                    const isCurrent = nodeId === currentId || Boolean(getDashboardViewValue(node, fields.current));
                    const isSelected = selectable && nodeId === selectedId;
                    const onRoute = routeNodeIds.has(nodeId);
                    const isNext = nodeId === nextStepId;
                    const matchesFilter = !filterFocusActive || activeFilterDefinitions.some((filter) => {
                        return Boolean(getDashboardViewValue(node, filter.key));
                    });
                    const isFaded = (routeFocusActive && !onRoute) || !matchesFilter;
                    const hasDanger = stateDefinitions.some((state) => !Boolean(getDashboardViewValue(node, state.key)) && state.falseTone === "danger");
                    const palette = getHomeTonePalette(isNext ? "warn" : isCurrent ? "info" : hasDanger ? "danger" : onRoute ? "success" : "neutral");
                    const configuredAccent = String(getDashboardViewValue(node, fields.accent) ?? "");
                    const nodeAccent = isSelected ? "#faa3dc" : isCurrent ? "#8fc5ff" : configuredAccent || palette.accent;
                    const nodeStates = stateDefinitions.slice(0, 2);
                    const nodeStatus = String(getDashboardViewValue(node, fields.status) ?? "");
                    const nodeStatusTone = String(getDashboardViewValue(node, fields.statusTone) ?? "neutral");
                    const nodeStatusPalette = getHomeTonePalette(nodeStatusTone);
                    return (
                        <button
                            type="button"
                            data-dashboard-theme-role="map-node"
                            data-network-control={selectable ? "true" : undefined}
                            key={nodeId}
                            title={`${getDashboardViewValue(node, fields.label) ?? nodeId}${isNext ? " — next route hop" : ""}`}
                            style={{
                                ...styles.networkNode,
                                left: `${position.x}px`,
                                top: `${position.y}px`,
                                width: `${position.width}px`,
                                height: `${position.height}px`,
                                zIndex: isSelected ? 4 : isFaded ? 0 : 1,
                                opacity: isFaded ? 0.75 : 1,
                                filter: isFaded ? "saturate(0.3) brightness(0.62)" : "none",
                                cursor: selectable ? "pointer" : "default",
                                transition: "opacity 150ms ease, filter 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
                                borderColor: nodeAccent,
                                borderWidth: isSelected || isCurrent ? "2px" : "1px",
                                boxShadow: isSelected
                                    ? "0 0 0 2px rgba(255, 123, 208, 0.2), 0 0 18px rgba(255, 123, 208, 0.42), inset 0 0 18px rgba(255, 123, 208, 0.08)"
                                    : isCurrent
                                        ? "0 0 0 2px rgba(108, 180, 255, 0.24), 0 0 22px rgba(108, 180, 255, 0.58), inset 0 0 18px rgba(108, 180, 255, 0.12)"
                                        : "0 4px 16px rgba(0, 0, 0, 0.3)",
                                background: isSelected
                                    ? "linear-gradient(145deg, rgba(43, 12, 37, 0.98), rgba(19, 8, 24, 0.98))"
                                    : isCurrent
                                        ? "linear-gradient(145deg, rgba(11, 32, 37, 0.98), rgba(6, 15, 23, 0.98))"
                                        : isNext
                                            ? "linear-gradient(145deg, rgba(37, 29, 9, 0.98), rgba(19, 16, 7, 0.98))"
                                            : selectable
                                                ? styles.networkNode.background
                                                : "linear-gradient(145deg, rgba(8, 18, 20, 0.96), rgba(5, 10, 13, 0.96))",
                            }}
                            onClick={() => handleNodeClick(nodeId)}
                            onDoubleClick={() => selectable && centerNode(nodeId, true)}
                        >
                            <div style={{ ...styles.networkNodeLabel, color: nodeAccent }}>
                                {getDashboardViewValue(node, fields.label) ?? nodeId}
                            </div>
                            <div style={styles.networkNodeSubline}>
                                {getDashboardViewValue(node, fields.detail) || getDashboardViewValue(node, fields.subtitle) || "\u00a0"}
                            </div>
                            <div style={styles.networkNodeStatus}>
                                {isCurrent ? <span style={{ color: "#8fc5ff" }}>● current</span> : null}
                                {isNext ? <span style={{ color: "#ffd17a" }}>→ next</span> : null}
                                {!isCurrent && !isNext ? nodeStates.map((state) => {
                                    const active = Boolean(getDashboardViewValue(node, state.key));
                                    const statePalette = getHomeTonePalette(active ? state.trueTone : state.falseTone);
                                    return <span key={state.key} style={{ color: statePalette.accent }}>{active ? "●" : "○"} {state.label}</span>;
                                }) : null}
                                {!isCurrent && !isNext && nodeStates.length === 0 && nodeStatus ? (
                                    <span style={{ color: nodeStatusPalette.accent }}>{nodeStatus}</span>
                                ) : null}
                            </div>
                        </button>
                    );
                })}
            </div>

            {modeMaps && !activeTelemetry ? (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    color: "#8fc5ff",
                    fontSize: "11px",
                    letterSpacing: "0.04em",
                }}>
                    Loading {activeModeLabel} map…
                </div>
            ) : null}

            {modeMenuOpen && modeOptions.length > 0 ? (
                <div data-network-control="true" style={styles.networkModePopup}>
                    <div style={styles.homePanelTitle}>{modeSelector.popupTitle ?? "Map view"}</div>
                    <div style={styles.networkFilterList}>
                        {modeOptions.map((option) => {
                            const optionId = String(getDashboardViewValue(option, modeSelector.idKey) ?? "");
                            const optionLabel = String(getDashboardViewValue(option, modeSelector.labelKey) ?? optionId);
                            const optionNote = String(getDashboardViewValue(option, modeSelector.noteKey) ?? "");
                            const optionCurrent = Boolean(getDashboardViewValue(option, modeSelector.currentKey));
                            const active = optionId === activeModeId;
                            return (
                                <button
                                    type="button"
                                    key={optionId}
                                    title={optionCurrent ? `${optionLabel} is the current location` : optionNote}
                                    style={{
                                        ...styles.networkModeOption,
                                        ...(active ? {
                                            color: "#8fc5ff",
                                            borderColor: "rgba(108, 180, 255, 0.55)",
                                            background: "rgba(10, 24, 38, 0.95)",
                                        } : {}),
                                    }}
                                    onClick={() => selectMode(optionId)}
                                >
                                    <span>{optionCurrent ? "● " : ""}{optionLabel}</span>
                                    <span style={{ ...styles.smallMuted, color: optionCurrent ? "#8ef0b5" : undefined }}>{optionNote}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {showNodeFilters && filtersOpen && filterDefinitions.length > 0 ? (
                <div data-network-control="true" style={styles.networkFilterPopup}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={styles.homePanelTitle}>Node filters</span>
                        {selectedFilterIds.length > 0 ? (
                            <button
                                type="button"
                                style={{ ...styles.actionButton, padding: "3px 6px", fontSize: "9px" }}
                                onClick={() => setSelectedFilterIds([])}
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                    <div style={styles.networkFilterList}>
                        {filterDefinitions.map((filter) => {
                            const checked = selectedFilterIdSet.has(filter.id);
                            return (
                                <label
                                    key={filter.id}
                                    style={{
                                        ...styles.networkFilterOption,
                                        ...(checked ? {
                                            color: filter.accent ?? "#8fc5ff",
                                            borderColor: filter.accent ?? "rgba(108, 180, 255, 0.45)",
                                            background: "rgba(12, 24, 20, 0.94)",
                                        } : {}),
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        style={{ margin: 0, accentColor: filter.accent ?? "#6cb4ff" }}
                                        onChange={() => toggleNodeFilter(filter.id)}
                                    />
                                    <span>{filter.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div data-network-control="true" style={styles.networkToolbar}>
                {modeOptions.length > 0 ? (
                    <button
                        type="button"
                        title={`Choose map view · ${activeModeLabel}`}
                        aria-label="Choose map view"
                        aria-expanded={modeMenuOpen}
                        style={{
                            ...styles.actionButton,
                            ...(modeMenuOpen || activeModeId !== defaultModeId ? {
                                color: "#8fc5ff",
                                borderColor: "rgba(108, 180, 255, 0.55)",
                                background: "rgba(10, 24, 38, 0.95)",
                            } : {}),
                        }}
                        onClick={() => {
                            setModeMenuOpen((current) => !current);
                            setFiltersOpen(false);
                        }}
                    >
                        {modeSelector.buttonLabel ?? "Map"}
                    </button>
                ) : null}
                {showNodeFilters ? (
                    <button
                        type="button"
                        title="Open node filters"
                        aria-label="Open node filters"
                        aria-expanded={filtersOpen}
                        style={{
                            ...styles.actionButton,
                            minWidth: "28px",
                            textAlign: "center",
                            fontSize: "14px",
                            lineHeight: 1,
                            ...(filtersOpen || selectedFilterIds.length > 0 ? {
                                color: "#8fc5ff",
                                borderColor: "rgba(108, 180, 255, 0.55)",
                                background: "rgba(10, 24, 38, 0.95)",
                            } : {}),
                        }}
                        onClick={() => {
                            setFiltersOpen((current) => !current);
                            setModeMenuOpen(false);
                        }}
                    >
                        +{selectedFilterIds.length > 0 ? ` ${selectedFilterIds.length}` : ""}
                    </button>
                ) : null}
                <input
                    value={searchText}
                    placeholder={searchPlaceholder}
                    title={searchPlaceholder}
                    style={{ ...styles.input, width: "128px", padding: "5px 7px", userSelect: "text", WebkitUserSelect: "text" }}
                    onChange={(event) => setSearchText(event.target.value)}
                    onFocus={() => onInputFocusChange?.(true)}
                    onBlur={() => onInputFocusChange?.(false)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") findNode();
                    }}
                />
                <button type="button" style={styles.actionButton} onClick={findNode}>Find</button>
                <button type="button" title="Zoom out" style={styles.actionButton} onClick={() => zoomBy(0.82)}>−</button>
                <button type="button" title="Fit current map" style={styles.actionButton} onClick={fitView}>Fit</button>
                <button type="button" title="Zoom in" style={styles.actionButton} onClick={() => zoomBy(1.22)}>+</button>
                {actionConfig.refreshCommand ? (
                    <button type="button" title="Refresh map telemetry" style={styles.actionButton} onClick={() => sendCommand(actionConfig.refreshCommand)}>Refresh</button>
                ) : null}
                {showCloudControl && fields.cloud ? (
                    <button
                        type="button"
                        title={`${showCloud ? "Hide" : "Show"} ${filterConfig.cloudLabel ?? "filtered servers"}`}
                        style={{
                            ...styles.actionButton,
                            ...(showCloud ? {
                            color: "#8fc5ff",
                            borderColor: "rgba(108, 180, 255, 0.55)",
                            background: "rgba(10, 24, 38, 0.95)",
                        } : {}),
                        }}
                        onClick={toggleCloudServers}
                    >
                        {showCloud ? "Hide" : "Show"} {filterConfig.cloudLabel ?? "Filtered"} ({cloudCount})
                    </button>
                ) : null}
                <span style={{ ...styles.smallMuted, padding: "0 4px" }}>{Math.round(transform.scale * 100)}%</span>
            </div>

            <aside
                ref={detailsRef}
                data-network-control="true"
                style={{ ...styles.networkDetails, width: `${inspectorWidth}px`, display: selectedNode ? "block" : "none" }}
                onPointerDown={(event) => event.stopPropagation()}
                onScroll={(event) => setDetailsScrollTop(Math.max(0, event.currentTarget.scrollTop))}
            >
                {selectedNode ? (
                    <>
                        <div style={{ ...styles.homePanelTitle, color: "#8fc5ff" }}>{selectionLabel}</div>
                        <div style={{ ...styles.homeTitle, marginTop: "5px", fontSize: "15px", textTransform: "none" }}>
                            {getDashboardViewValue(selectedNode, fields.label) ?? selectedId}
                        </div>
                        <div style={{ ...styles.muted, fontSize: "9px", marginTop: "2px" }}>
                            {[getDashboardViewValue(selectedNode, fields.subtitle), getDashboardViewValue(selectedNode, fields.detail)].filter(Boolean).join(" · ") || "No additional identity data"}
                        </div>

                        <div style={{ ...styles.networkDetailGrid, gridTemplateColumns: `${inspectorLabelWidth}px minmax(0, 1fr)` }}>
                            {stateDefinitions.map((state) => {
                                const active = Boolean(getDashboardViewValue(selectedNode, state.key));
                                const palette = getHomeTonePalette(active ? state.trueTone : state.falseTone);
                                return (
                                    <React.Fragment key={state.key}>
                                        <span title={state.label} style={{ ...styles.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.label}</span>
                                        <span style={{ color: palette.accent, minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{active ? state.trueText : state.falseText}</span>
                                    </React.Fragment>
                                );
                            })}
                            {metricDefinitions.filter((metric) => {
                                return !metric.visibleKey || Boolean(getDashboardViewValue(selectedNode, metric.visibleKey));
                            }).map((metric) => (
                                <React.Fragment key={metric.key}>
                                    <span title={metric.label} style={{ ...styles.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{metric.label}</span>
                                    <span style={{ color: "#c8e0ff", minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>
                                        {formatNetworkMapMetric(
                                            getDashboardViewValue(selectedNode, metric.key),
                                            metric.secondaryKey ? getDashboardViewValue(selectedNode, metric.secondaryKey) : undefined,
                                            metric.format,
                                            {
                                                rooted: metric.rootKey ? Boolean(getDashboardViewValue(selectedNode, metric.rootKey)) : true,
                                                eligible: metric.eligibleKey ? Boolean(getDashboardViewValue(selectedNode, metric.eligibleKey)) : true,
                                                selected: metric.selectedKey ? Boolean(getDashboardViewValue(selectedNode, metric.selectedKey)) : false,
                                                requiredSkill: metric.requiredSkillKey ? getDashboardViewValue(selectedNode, metric.requiredSkillKey) : 0,
                                                estimated: metric.estimateKey ? Boolean(getDashboardViewValue(selectedNode, metric.estimateKey)) : false,
                                            }
                                        )}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>

                        {showRoutes ? (
                            <>
                                <div style={{ ...styles.homePanelTitle, marginTop: "12px" }}>Route from home</div>
                                <div style={styles.networkRoute}>
                                    {selectedRoute.length > 0 ? selectedRoute.map((hop) => (
                                        <span key={hop} style={{
                                            ...styles.networkRouteHop,
                                            ...(hop === currentId ? { color: "#8fc5ff", borderColor: "rgba(108, 180, 255, 0.55)" } : {}),
                                        }}>{hop}</span>
                                    )) : <span style={styles.muted}>No route available.</span>}
                                </div>

                                <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
                                    <button
                                        type="button"
                                        disabled={!canConnect || !Boolean(getDashboardViewValue(selectedNode, fields.direct))}
                                        style={{
                                            ...styles.actionButton,
                                            textAlign: "center",
                                            ...(!canConnect || !Boolean(getDashboardViewValue(selectedNode, fields.direct)) ? styles.actionButtonDisabled : {}),
                                        }}
                                        onClick={() => sendCommand(actionConfig.directPrefix, selectedId, actionConfig.port)}
                                    >
                                        {actionConfig.directLabel ?? "Direct connect"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canConnect || selectedRoute.length === 0}
                                        style={{
                                            ...styles.actionButton,
                                            textAlign: "center",
                                            ...(!canConnect || selectedRoute.length === 0 ? styles.actionButtonDisabled : {}),
                                        }}
                                        onClick={() => sendCommand(actionConfig.routePrefix, selectedId, actionConfig.port)}
                                    >
                                        {actionConfig.routeLabel ?? "Auto route"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canConnect || selectedRoute.length === 0}
                                        style={{
                                            ...styles.actionButton,
                                            textAlign: "center",
                                            ...(stepTargetId === selectedId ? {
                                                color: "#ffd17a",
                                                borderColor: "rgba(255, 198, 92, 0.55)",
                                                background: "rgba(34, 22, 10, 0.95)",
                                            } : {}),
                                            ...(!canConnect || selectedRoute.length === 0 ? styles.actionButtonDisabled : {}),
                                        }}
                                        onClick={() => setStepTargetId((current) => current === selectedId ? "" : selectedId)}
                                    >
                                        {stepTargetId === selectedId ? "Cancel step route" : actionConfig.stepLabel ?? "Step route"}
                                    </button>
                                </div>

                                {stepTargetId === selectedId ? (
                                    <div style={{ ...styles.networkRouteHop, marginTop: "8px", color: nextStepId ? "#ffd17a" : "#8ef0b5" }}>
                                        {nextStepId ? `Click ${nextStepId} on the map for the next hop.` : "Route complete."}
                                    </div>
                                ) : null}
                            </>
                        ) : null}

                        {nodeActionDefinitions.some((action) => !action.visibleKey || Boolean(getDashboardViewValue(selectedNode, action.visibleKey))) ? (
                            <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
                                {nodeActionDefinitions.filter((action) => {
                                    return !action.visibleKey || Boolean(getDashboardViewValue(selectedNode, action.visibleKey));
                                }).map((action) => {
                                    const actionType = String(action.type ?? "command");
                                    const label = String(getDashboardViewValue(selectedNode, action.labelKey) ?? action.label ?? "Run action");
                                    const target = String(getDashboardViewValue(selectedNode, action.targetKey) ?? selectedId);
                                    const enabledByMetadata = !action.enabledKey || Boolean(getDashboardViewValue(selectedNode, action.enabledKey));
                                    const enabled = enabledByMetadata && (actionType !== "clipboard" || Boolean(target));
                                    const displayLabel = !enabled && action.lockedLabelSuffix
                                        ? `${label} (${action.lockedLabelSuffix})`
                                        : label;
                                    const disabledReason = String(getDashboardViewValue(selectedNode, action.disabledReasonKey) ?? "");
                                    return (
                                        <button
                                            type="button"
                                            key={action.id ?? action.prefix}
                                            title={!enabled && disabledReason ? disabledReason : actionType === "clipboard" ? target : label}
                                            disabled={!enabled}
                                            style={{
                                                ...styles.actionButton,
                                                textAlign: "center",
                                                ...(!enabled ? styles.actionButtonDisabled : {}),
                                            }}
                                            onClick={() => actionType === "clipboard"
                                                ? copyNodeActionValue(target, label)
                                                : sendCommand(action.prefix, target, action.port)}
                                        >
                                            {displayLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        {clipboardNotice ? (
                            <div style={{ ...styles.networkRouteHop, marginTop: "8px", color: "#8ef0b5", borderColor: "rgba(110, 231, 168, 0.3)" }}>
                                {clipboardNotice}
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div style={styles.muted}>{telemetry ? `Select a ${selectionSubject} to inspect it.` : "Waiting for map telemetry…"}</div>
                )}

                {showRoutes && !canConnect ? (
                    <div style={{ ...styles.networkRouteHop, marginTop: "10px", color: "#ffd17a", borderColor: "rgba(255, 198, 92, 0.35)" }}>
                        {actionConfig.unavailableMessage ?? "Automatic connections are unavailable. The map and routes remain available."}
                    </div>
                ) : null}
                {lastResultMessage ? (
                    <div style={{
                        ...styles.networkRouteHop,
                        marginTop: "8px",
                        color: lastResultStatus === "error" ? "#ff9a9a" : "#8ef0b5",
                        borderColor: lastResultStatus === "error" ? "rgba(255, 122, 122, 0.35)" : "rgba(110, 231, 168, 0.3)",
                    }}>
                        {lastResultMessage}{lastResultTime > 0 ? ` · ${new Date(lastResultTime).toLocaleTimeString()}` : ""}
                    </div>
                ) : null}
            </aside>
            </>)}
        </main>
    );
}


