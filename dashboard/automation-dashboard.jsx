import { buildDashboardActions } from "dashboard/libs/dashboard-actions.js";
import {
    DEFAULT_HIDDEN_SCRIPT_FILES_OPTION,
    DEFAULT_HIDDEN_SCRIPT_FOLDERS,
    DEFAULT_HIDDEN_SCRIPT_FOLDERS_OPTION,
    dashboardOptionsEqual,
    getDefaultDashboardOptions,
    getServiceStartOrder,
    HIDE_UNQUALIFIED_PLUGINS_MODES,
    isServiceAutostartEnabled,
    isServiceVisibleInMenu,
    MENU_UNLOCK_GLYPH_SCOPE_MAIN,
    MENU_UNLOCK_GLYPH_SCOPE_SUBMENUS,
    MENU_UNLOCK_GLYPH_SCOPES,
    normalizeDashboardOptions,
    normalizeHideUnqualifiedPluginsMode,
    normalizeMenuUnlockGlyphMaxCount,
    normalizeMenuUnlockGlyphOpacity,
    normalizeMenuUnlockGlyphScope,
    sortByServiceStartOrder,
} from "dashboard/libs/dashboard-options.js";
import {
    applyDashboardViewWidgetContributions as applyDashboardViewWidgetContributionsDefinition,
    buildDashboardMenuGroupRegistry as buildDashboardMenuGroupRegistryDefinition,
    buildDashboardMenuGroups,
    getDefaultSelectedServiceId as getDefaultSelectedServiceIdDefinition,
    getViewOnlyPluginEntries,
    isViewQualified,
    sortDashboardMenuItems,
    validateDashboardServices as validateDashboardServicesDefinition,
    validateDashboardViews as validateDashboardViewsDefinition,
} from "dashboard/libs/dashboard-registry.js";
import { buildScriptListActions, buildServiceAutostartAction } from "dashboard/libs/script-list-actions.js";
import { getDashboardPluginAdapterFactories } from "dashboard/libs/plugin-adapters.js";
import { buildDashboardPluginServices, buildDashboardPluginShortcuts, discoverDashboardPlugins, discoverDashboardViews, isDashboardPluginDescriptorFilename } from "dashboard/libs/plugin-loader.js";
import { ACTION_TONE_STYLES, normalizeActionTone } from "dashboard/libs/action-tones.js";
import {
    DASHBOARD_THEME_MODE_GAME,
    DASHBOARD_TEXT_SIZE_MODES,
    buildDashboardTheme,
    createDashboardThemedReact,
    getGameStylesSignature,
    getGameThemeSignature,
    normalizeDashboardTextSizeMode,
} from "dashboard/libs/theme-adapter.js";
import {
    DASHBOARD_STARTUP_MODES,
    DASHBOARD_WINDOW_MODE_MAXIMIZED,
    DASHBOARD_WINDOW_MODE_WINDOWED,
    DEFAULT_TAIL_HEIGHT,
    DEFAULT_TAIL_TITLE_HEIGHT,
    DEFAULT_TAIL_WIDTH,
    buildDashboardLayoutSnapshot,
    fitWindowedGeometryToViewport,
    getDefaultWindowedGeometry,
    getMaximizedTailGeometry,
    getMinimizedTailGeometry,
    normalizeDashboardStartupMode,
    normalizeDashboardWindowMode,
    normalizeViewport,
    resolveDashboardStartupWindowMode,
    tailGeometryDiffers,
} from "dashboard/libs/tail-layout.js";
import { buildDashboardTailTitle } from "dashboard/libs/tail-title.js";
import { formatMoney, formatRam } from "dashboard/libs/format-utils.js";
import { getDashboardRestartArgs, parseDashboardLaunchOptions, shouldAutoStartServiceSupervisor } from "dashboard/libs/startup-policy.js";
import { normalizeDashboardActionCommand } from "dashboard/libs/action-command.js";
import { executeDashboardAction } from "dashboard/libs/action-executor.js";
import { dispatchDashboardActions } from "dashboard/libs/dashboard-action-dispatch.js";
import { buildDashboardActionCommand as buildActionCommand } from "dashboard/libs/dashboard-action-command.js";
import { buildPluginDashboardOptionInputs, selectDashboardWorkspaceWidgets } from "dashboard/libs/workspace-widgets.js";
import { createDashboardSnapshotCoordinator } from "dashboard/libs/dashboard-snapshots.js";
import {
    DASHBOARD_FRAME_CONTROL_LABELS,
    getDashboardFrameControlGroupStyle,
    getDashboardFrameHeaderStyle,
    getDashboardFrameControlOverlayStyle,
    getDashboardFrameControlStyle,
    runDashboardFrameControlClick,
    runDashboardFrameControlMouseDown,
} from "dashboard/libs/frame-controls.js";
import { FileManagerView } from "dashboard/renderers/file-manager-view.jsx";
import { buildFileManagerSnapshots, loadFileManagerManifest } from "dashboard/renderers/file-manager-snapshot.js";
import { configureNetworkMapView, NetworkMapView } from "dashboard/renderers/network-map-view.jsx";
import { applyDashboardViewTelemetry, applyDashboardViewTelemetryContributions } from "dashboard/libs/view-telemetry.js";
import { applyDashboardServiceTelemetryContributions, getDashboardServiceTelemetryStateLines } from "dashboard/libs/service-telemetry.js";
import {
    applyDashboardServiceTableContributions,
    getDashboardServiceTableSections,
    getDashboardServiceTableStateLines,
} from "dashboard/libs/service-tables.js";
import { configureDashboardShell, DashboardShell } from "dashboard/renderers/dashboard-shell.jsx";
import { configureWorkspaceProviderView, WorkspaceProviderView } from "dashboard/renderers/workspace-provider-view.jsx";
import { ScriptLogView } from "dashboard/renderers/script-log-view.jsx";
import { buildScriptLogSnapshot } from "dashboard/renderers/script-log-snapshot.js";
import { BadgeLine, Card, configureDashboardPanels } from "dashboard/renderers/dashboard-panels.jsx";
import { configureDashboardTable, DashboardDataTable } from "dashboard/renderers/dashboard-table.jsx";
import { configureDashboardMetrics, RamGaugeBar, TonePill } from "dashboard/renderers/dashboard-metrics.jsx";
import {
    configureSystemOverviewPanels,
    HomePanel,
} from "dashboard/renderers/system-overview-panels.jsx";
import { configureDashboardGraphs, DataGraph as DashboardDataGraph } from "dashboard/renderers/dashboard-graphs.jsx";
import {
    configureSystemOverviewView,
    SystemOverview as SystemOverviewRenderer,
} from "dashboard/renderers/system-overview-view.jsx";
import {
    configurePlayerStatsOverview,
    PlayerStatsOverview as PlayerStatsOverviewRenderer,
} from "dashboard/renderers/player-stats-overview.jsx";
import {
    configureDashboardViewState,
    getDashboardViewInteractionState,
    getDashboardViewValue,
    saveDashboardViewInteractionState,
    setDashboardViewDragActiveState,
} from "dashboard/libs/dashboard-view-state.js";
import {
    normalizeFileManifest,
    normalizeFilePath,
} from "dashboard/libs/file-utils.js";
import { DASHBOARD_ACTION_IDS, SCRIPT_ACTION_IDS } from "dashboard/libs/action-ids.js";
import { buildScriptActions, resolveScriptActionExecution } from "dashboard/libs/script-actions.js";
import {
    applyPluginIntegrationCommand,
    applyPluginIntegrationOptions,
    getPluginIntegrationOverviewGauges,
    getPluginIntegrationGraphs,
    getPluginIntegrationOverviewLines,
    isIntegrationScriptRunning,
    loadPluginIntegrationStats,
    normalizePluginIntegrationOptions,
    shouldStartPluginIntegrationAfterOptionChange,
} from "dashboard/libs/plugin-integration.js";
import {
    buildPluginMenuRequirementBadges,
    buildPluginRequirementSection,
    buildPluginRequirementsSnapshot,
    compactPluginMenuRequirementBadges,
    getPluginMenuRequirementBadgeBudget,
    getPluginRequirementsForPanel,
} from "dashboard/libs/plugin-requirements.js";
import { buildCapabilitySnapshot } from "dashboard/libs/capabilities.js";
import {
    getScriptListDetailEmptyMessage,
    getScriptLifecycleLabel,
    loadDashboardScriptMetadata,
    resolveSelectedCenterPanel,
    resolveSelectedScriptPanel,
    splitScriptPanels,
    summarizeScriptListHealth,
} from "dashboard/libs/script-list.js";
import {
    isScriptFileHidden,
    isScriptInFolders,
    normalizeScriptFiles,
    normalizeScriptFolders,
    parseScriptFiles,
    parseScriptFolders,
} from "dashboard/libs/script-folders.js";
import { compareScriptPathsByName, getScriptDisplayName } from "dashboard/libs/script-utils.js";
export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

let React = null;
let rawReact = null;
let activeDashboardTheme = buildDashboardTheme(DASHBOARD_THEME_MODE_GAME);

const DASHBOARD_UI_STATE_KEY = "__dashboard_ui_state_v1";
const DASHBOARD_ACTION_QUEUE_KEY = "__dashboard_action_queue_v1";
const DASHBOARD_TITLE_RESTART_REQUESTED_AT_KEY = "__dashboard_title_restart_requested_at_v1";
const DASHBOARD_SCROLL_STATE_KEY = "__dashboard_scroll_state_v1";
const DASHBOARD_SERVICE_REGISTRY_KEY = "__dashboard_service_registry_v8";
const DASHBOARD_SERVICE_REGISTRY_SOURCE_KEY = "__dashboard_service_registry_source_v7";
const DASHBOARD_VIEW_REGISTRY_KEY = "__dashboard_view_registry_v4";
const DASHBOARD_MENU_GROUP_REGISTRY_KEY = "__dashboard_menu_group_registry_v3";
const DASHBOARD_MENU_GROUP_REGISTRY_SOURCE_KEY = "__dashboard_menu_group_registry_source_v3";
const DASHBOARD_VIEW_INTERACTION_STATE_KEY = "__dashboard_view_interaction_state_v1";
const DASHBOARD_VIEW_DRAG_ACTIVE_KEY = "__dashboard_view_drag_active_v1";
const DASHBOARD_OPTIONS_INPUT_FOCUS_KEY = "__dashboard_options_input_focus_v1";
const DASHBOARD_FILE_ACTION_RESULT_KEY = "__dashboard_file_action_result_v1";
const DASHBOARD_FILE_PREVIEW_RESULT_KEY = "__dashboard_file_preview_result_v1";
const SCRIPT_MANAGER_IDS_WITH_LIST_HIDING = new Set(["global.options", "global.integrations", "global.plugins"]);
const DASHBOARD_FILE_VIEW_RENDER_STATE_KEY = "__dashboard_file_view_render_state_v1";
const DASHBOARD_NETWORK_MAP_VIEW_RENDER_STATE_KEY = "__dashboard_network_map_view_render_state_v1";
const DASHBOARD_START_ORDER_RENDER_STATE_KEY = "__dashboard_start_order_render_state_v1";
const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";
const AUTOSTART_PAUSE_FILE = "data/autostart_paused.txt";
const DASHBOARD_SCRIPT = "dashboard/automation-dashboard.jsx";
const SERVICE_SUPERVISOR_SCRIPT = "dashboard/service-supervisor.js";
const DASHBOARD_VIEW_ITEM_PREFIX = "dashboard.view:";
const PLAYER_STATS_WIDGET_WIDTH = 360;
const PLUGIN_RUNTIME_EXCLUDED_FOLDERS = DEFAULT_HIDDEN_SCRIPT_FOLDERS;
const TAIL_WIDTH = DEFAULT_TAIL_WIDTH;
const TAIL_HEIGHT = DEFAULT_TAIL_HEIGHT;
const DASHBOARD_UI_TICK_MS = 1000;
const DASHBOARD_MINIMIZED_UI_TICK_MS = 250;
const dashboardSnapshotCoordinator = createDashboardSnapshotCoordinator();
// A shared reference for "this view isn't active" instead of a fresh {} literal each tick, so an
// inactive File Manager/Script Log view compares equal to itself across ticks.
const EMPTY_DASHBOARD_SNAPSHOT_MAP = Object.freeze({});
// The last set of values that actually produced a printRaw()/renderTail() call - see the
// canSkipRender check in main(). Module-level, not a ref: see the ns.printRaw-remounts-every-tick
// note above.
let lastRenderedSignature = null;
const dashboardOptionsCache = { raw: null, services: null, value: null };
const scriptCatalogEntryCache = new Map();
let latestHomeProcessFilenames = new Set();
let previousHomeProcessFilenames = new Set();
let lastOptionReplayServiceRegistry = null;

const dashboardTailLayoutState = {
    initialized: false,
    visible: false,
    minimized: false,
    mode: DASHBOARD_WINDOW_MODE_WINDOWED,
    modeBeforeMinimize: DASHBOARD_WINDOW_MODE_WINDOWED,
    requestedMode: null,
    windowedGeometry: null,
    restoreGeometry: null,
    persistPending: false,
    persistReadyAt: 0,
    lastTitle: "",
};

const HEALTH_FILTER_MODES = new Set(["all", "warn", "danger"]);
const WIDGET_STYLES = {
    shell: {
        background: "#020202",
        color: "#c8ffc8",
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: "13px",
        lineHeight: 1.25,
        padding: "12px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        overflow: "hidden"
    },
    heroRow: {
        marginBottom: "10px",
        flex: "0 0 auto"
    },
    statsRow: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 64px",
        alignItems: "stretch",
        gap: "8px",
        marginBottom: "10px",
        flex: "0 0 auto"
    },
    statsPills: {
        display: "grid",
        alignItems: "stretch",
        gap: "8px",
        minWidth: 0
    },
    statTile: {
        minWidth: 0,
        height: "100%"
    },
    ramGaugeSlot: {
        minWidth: 0,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end"
    },
    workspaceRow: {
        display: "grid",
        gridTemplateColumns: "260px 330px minmax(400px, 1fr)",
        gap: "10px",
        alignItems: "stretch",
        minHeight: 0,
        flex: "1 1 auto",
        overflow: "hidden"
    },
    column: {
        border: "1px solid #1d3d1d",
        borderRadius: "8px",
        background: "rgba(6, 10, 6, 0.98)",
        padding: "10px",
        minHeight: 0,
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box"
    },
    leftColumn: {
        display: "block"
    },
    menuGroup: {
        border: "1px solid #243824",
        borderRadius: "8px",
        marginBottom: "8px",
        overflow: "hidden"
    },
    menuHeaderButton: {
        width: "100%",
        textAlign: "left",
        background: "rgba(8, 8, 8, 0.95)",
        border: "none",
        borderBottom: "1px solid #243824",
        color: "#9ddb9d",
        fontSize: "13px",
        fontWeight: 800,
        cursor: "pointer",
        padding: "8px 10px"
    },
    menuItemButton: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        textAlign: "left",
        background: "rgba(10, 12, 10, 0.95)",
        border: "none",
        color: "#b7e6b7",
        fontSize: "12px",
        cursor: "pointer",
        padding: "7px 12px"
    },
    menuItemButtonActive: {
        background: "rgba(24, 58, 24, 0.98)",
        boxShadow: "inset 3px 0 0 #6ee7a8",
        color: "#e1ffe1"
    },
    menuItemButtonActiveWarn: {
        background: "rgba(72, 48, 20, 0.95)",
        boxShadow: "inset 3px 0 0 #ffd078",
        color: "#fff0c8"
    },
    menuItemButtonActiveDanger: {
        background: "rgba(72, 24, 24, 0.95)",
        boxShadow: "inset 3px 0 0 #ff9696",
        color: "#ffe0e0"
    },
    optionGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "8px",
        marginBottom: "8px"
    },
    optionField: {
        display: "grid",
        gap: "4px"
    },
    input: {
        border: "1px solid #355435",
        borderRadius: "6px",
        background: "#080808",
        color: "#d3ffd3",
        padding: "6px 8px",
        fontSize: "12px"
    },
    actionButton: {
        border: "1px solid #355435",
        borderRadius: "6px",
        background: "rgba(10, 18, 10, 0.95)",
        color: "#c9f7c9",
        fontSize: "12px",
        padding: "6px 8px",
        cursor: "pointer",
        textAlign: "left",
        pointerEvents: "auto",
        userSelect: "none"
    },
    actionButtonPressed: {
        transform: "translateY(1px)",
        background: "rgba(20, 34, 20, 0.98)",
        borderColor: "#4f7a4f"
    },
    actionButtonDisabled: {
        borderColor: "rgba(90, 90, 90, 0.5)",
        background: "rgba(24, 24, 24, 0.94)",
        color: "#8e8e8e",
        cursor: "not-allowed",
        opacity: 0.7
    },
    filterBar: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "6px",
        marginBottom: "8px"
    },
    filterButton: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        border: "1px solid #355435",
        borderRadius: "6px",
        background: "rgba(10, 18, 10, 0.95)",
        color: "#c9f7c9",
        fontSize: "11px",
        padding: "6px 3px",
        cursor: "pointer",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
        overflowWrap: "normal",
        wordBreak: "keep-all"
    },
    filterButtonActive: {
        background: "rgba(28, 52, 28, 0.95)",
        borderColor: "#5ca85c",
        color: "#e1ffe1",
        boxShadow: "inset 3px 0 0 #6ee7a8"
    },
    filterButtonActiveWarn: {
        background: "rgba(72, 48, 20, 0.95)",
        borderColor: "rgba(255, 208, 120, 0.7)",
        color: "#fff0c8"
    },
    filterButtonActiveDanger: {
        background: "rgba(72, 24, 24, 0.95)",
        borderColor: "rgba(255, 150, 150, 0.75)",
        color: "#ffe0e0"
    },
    healthCounterRow: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "6px",
        marginBottom: "8px"
    },
    healthCounterItem: {
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        border: "1px solid #355435",
        borderRadius: "6px",
        background: "rgba(10, 18, 10, 0.95)",
        color: "#c9f7c9",
        padding: "6px 3px",
        textAlign: "center",
        cursor: "pointer",
        userSelect: "none"
    },
    healthCounterItemActive: {
        borderColor: "#5ca85c",
        background: "rgba(28, 52, 28, 0.95)",
        color: "#e1ffe1",
        boxShadow: "inset 3px 0 0 #6ee7a8"
    },
    healthCounterItemActiveWarn: {
        background: "rgba(72, 48, 20, 0.95)",
        borderColor: "rgba(255, 208, 120, 0.7)",
        color: "#fff0c8"
    },
    healthCounterItemActiveDanger: {
        background: "rgba(72, 24, 24, 0.95)",
        borderColor: "rgba(255, 150, 150, 0.75)",
        color: "#ffe0e0"
    },
    healthCounterLabel: {
        fontSize: "9px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        opacity: 0.9
    },
    healthCounterValue: {
        fontSize: "13px"
    },
    actionGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "6px"
    },
    heading: {
        fontSize: "12px",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "8px"
    },
    scriptFolderGroup: {
        borderLeft: "1px solid rgba(92, 168, 92, 0.35)",
        paddingLeft: "8px"
    },
    scriptFolderHeading: {
        color: "#9ddb9d",
        fontSize: "11px",
        fontWeight: 800,
        marginBottom: "6px"
    },
    smallMuted: {
        color: "#8db08d",
        fontSize: "11px"
    },
    hero: {
        ...getDashboardFrameHeaderStyle(),
        display: "flex",
        justifyContent: "space-between",
        border: "1px solid #1d3d1d",
        borderRadius: "8px",
        background: "rgba(8, 12, 8, 0.95)",
        minWidth: 0
    },
    heroCopy: {
        display: "grid",
        gap: "4px",
        flex: "1 1 auto",
        minWidth: 0
    },
    heroTitle: {
        fontSize: "18px",
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: "2px"
    },
    heroSubtitle: {
        color: "#80c880",
        maxWidth: "auto",
        whiteSpace: "normal",
        overflowWrap: "anywhere"
    },
    pill: {
        borderRadius: "8px",
        padding: "8px 10px",
        border: "1px solid #243824",
        background: "rgba(8, 8, 8, 0.96)",
        boxSizing: "border-box",
        height: "100%"
    },
    pillLabel: {
        color: "#7fda7f",
        fontSize: "9px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "2px"
    },
    pillValue: {
        fontSize: "14px",
        fontWeight: 800
    },
    card: {
        borderRadius: "8px",
        background: "rgba(6, 10, 6, 0.98)",
        border: "1px solid #1d3d1d",
        overflow: "hidden"
    },
    cardBody: {
        padding: "8px 10px 10px"
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "8px",
        padding: "7px 10px",
        borderBottom: "1px solid #1d3d1d"
    },
    cardTitle: {
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase"
    },
    cardAccent: {
        width: "8px",
        height: "8px",
        borderRadius: "999px",
        flex: "0 0 auto"
    },
    list: {
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gap: "5px"
    },
    item: {
        borderRadius: "7px",
        padding: "7px 8px",
        background: "rgba(8, 8, 8, 0.95)",
        border: "1px solid #243824"
    },
    itemTitle: {
        fontWeight: 800,
        marginBottom: "2px"
    },
    itemDetail: {
        color: "#9ddb9d"
    },
    sectionFrame: {
        borderRadius: "7px",
        padding: "7px 8px",
        background: "rgba(8, 8, 8, 0.95)",
        border: "1px solid #243824"
    },
    resourceCardList: {
        display: "grid",
        gap: "6px"
    },
    resourceCard: {
        display: "grid",
        gridTemplateColumns: "minmax(120px, 0.85fr) minmax(0, 2.4fr)",
        alignItems: "center",
        gap: "10px",
        minWidth: 0,
        borderRadius: "7px",
        padding: "8px 10px",
        background: "rgba(8, 12, 18, 0.94)",
        border: "1px solid rgba(108, 180, 255, 0.2)"
    },
    resourceCardIdentity: {
        minWidth: 0,
        paddingRight: "10px",
        borderRight: "1px solid rgba(108, 180, 255, 0.18)"
    },
    resourceCardNameLabel: {
        color: "#7799b8",
        fontSize: "8px",
        letterSpacing: "0.1em",
        textTransform: "uppercase"
    },
    resourceCardName: {
        color: "#c8e0ff",
        fontSize: "12px",
        fontWeight: 800,
        overflowWrap: "anywhere"
    },
    resourceCardBody: {
        minWidth: 0
    },
    resourceMetricGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(68px, 1fr))",
        gap: "5px 10px"
    },
    resourceMetricLabel: {
        color: "#7799b8",
        fontSize: "8px",
        letterSpacing: "0.06em",
        textTransform: "uppercase"
    },
    resourceMetricValue: {
        color: "#d8e8f8",
        fontSize: "11px",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums"
    },
    utilizationHeader: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "8px",
        marginTop: "6px",
        color: "#7799b8",
        fontSize: "9px"
    },
    utilizationTrack: {
        position: "relative",
        height: "5px",
        marginTop: "3px",
        overflow: "hidden",
        borderRadius: "999px",
        background: "rgba(125, 160, 212, 0.12)"
    },
    utilizationFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 180ms ease"
    },
    graphHeader: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "10px",
        minWidth: 0,
        marginBottom: "6px"
    },
    graphTitle: {
        flex: "1 1 auto",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    graphPointCount: {
        flex: "0 0 auto",
        minWidth: "48px",
        textAlign: "right",
        whiteSpace: "nowrap"
    },
    graphLegend: {
        display: "flex",
        flexWrap: "wrap",
        gap: "5px 12px",
        marginBottom: "5px"
    },
    graphLegendItem: {
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        color: "#b8d8b8",
        fontSize: "10px",
        fontVariantNumeric: "tabular-nums"
    },
    graphSwatch: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        flex: "0 0 auto"
    },
    graphCanvas: {
        display: "block",
        width: "100%",
        overflow: "hidden"
    },
    systemOverview: {
        position: "relative",
        minHeight: 0,
        flex: "1 1 auto",
        overflowY: "auto",
        border: "1px solid rgba(108, 180, 255, 0.3)",
        borderRadius: "10px",
        padding: "10px 12px 12px",
        boxSizing: "border-box",
        cursor: "default",
        outline: "none",
        background: "radial-gradient(circle at 8% 0%, rgba(47, 108, 80, 0.22), transparent 31%), radial-gradient(circle at 94% 10%, rgba(62, 89, 150, 0.2), transparent 34%), #030605"
    },
    homeHeader: {
        ...getDashboardFrameHeaderStyle(),
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        marginBottom: "10px",
        minHeight: "44px",
        padding: "0 2px 8px",
        borderBottom: "1px solid rgba(108, 180, 255, 0.18)",
        background: "rgba(3, 6, 5, 0.96)"
    },
    homeTitle: {
        color: "#e7fff0",
        fontSize: "18px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase"
    },
    homeWidgetGrid: {
        display: "grid",
        alignItems: "stretch"
    },
    homePanel: {
        minWidth: 0,
        height: "100%",
        border: "1px solid rgba(108, 180, 255, 0.2)",
        borderRadius: "8px",
        padding: "10px",
        boxSizing: "border-box",
        background: "linear-gradient(145deg, rgba(8, 16, 13, 0.97), rgba(7, 11, 18, 0.96))",
        boxShadow: "inset 0 1px 0 rgba(210, 240, 255, 0.025)"
    },
    homePanelHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "10px",
        marginBottom: "8px"
    },
    homePanelTitle: {
        color: "#bfe4ce",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.09em",
        textTransform: "uppercase"
    },
    homePanelSubtitle: {
        color: "#68869f",
        fontSize: "9px",
        textAlign: "right"
    },
    homeMetricGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: "7px"
    },
    homeMetric: {
        position: "relative",
        minWidth: 0,
        minHeight: "66px",
        overflow: "hidden",
        borderRadius: "7px",
        padding: "9px 10px 10px",
        boxSizing: "border-box",
        background: "rgba(5, 9, 8, 0.82)",
        border: "1px solid rgba(125, 160, 212, 0.16)"
    },
    homeMetricLabel: {
        color: "#789b88",
        fontSize: "8px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: "4px"
    },
    homeMetricValue: {
        fontSize: "15px",
        fontWeight: 800,
        lineHeight: 1.15,
        overflowWrap: "anywhere",
        fontVariantNumeric: "tabular-nums"
    },
    homeMetricSource: {
        color: "#567264",
        fontSize: "8px",
        marginTop: "4px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
    },
    homeHealthLayout: {
        display: "grid",
        gridTemplateColumns: "112px minmax(0, 1fr)",
        gap: "10px",
        alignItems: "center"
    },
    homeHealthLegend: {
        display: "grid",
        gap: "4px"
    },
    homeHealthLegendRow: {
        display: "grid",
        gridTemplateColumns: "8px minmax(0, 1fr) auto",
        gap: "6px",
        alignItems: "center",
        color: "#9bb8a8",
        fontSize: "9px"
    },
    homeAlertList: {
        display: "grid",
        gap: "5px",
        marginTop: "9px"
    },
    homeAlert: {
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr)",
        gap: "7px",
        borderRadius: "6px",
        padding: "6px 7px",
        color: "#b9cdbf",
        fontSize: "9px",
        background: "rgba(5, 8, 7, 0.72)",
        border: "1px solid rgba(125, 160, 212, 0.12)"
    },
    homeGaugeGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(116px, 1fr))",
        gap: "8px"
    },
    homeGaugeCard: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
    },
    homeGaugeValue: {
        color: "#91b9a0",
        fontSize: "9px",
        marginTop: "4px",
        textAlign: "center",
        fontVariantNumeric: "tabular-nums"
    },
    homeServiceGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "7px 12px"
    },
    homeServiceRow: {
        display: "grid",
        gap: "4px",
        minWidth: 0
    },
    homeServiceLabel: {
        display: "flex",
        justifyContent: "space-between",
        gap: "8px",
        color: "#91b9a0",
        fontSize: "9px"
    },
    homeServiceBar: {
        display: "flex",
        height: "7px",
        overflow: "hidden",
        borderRadius: "999px",
        background: "rgba(125, 160, 212, 0.11)"
    },
    homePlayerGroupGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "10px 16px"
    },
    playerStatusColumn: {
        minWidth: 0
    },
    playerStatusDividerColumn: {
        minWidth: 0,
        borderLeft: "1px solid rgba(108, 180, 255, 0.28)",
        paddingLeft: "10px",
        boxSizing: "border-box"
    },
    homePlayerGroup: {
        minWidth: 0
    },
    homePlayerStatGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
        gap: "5px 10px"
    },
    homePlayerStat: {
        minWidth: 0,
        padding: "3px 0"
    },
    homePlayerStatLine: {
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr)",
        alignItems: "baseline",
        gap: "7px",
        minWidth: 0
    },
    homeGraphGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "7px",
        marginTop: "10px"
    },
    networkView: {
        position: "relative",
        minHeight: 0,
        flex: "1 1 auto",
        overflow: "hidden",
        border: "1px solid rgba(108, 180, 255, 0.3)",
        borderRadius: "10px",
        boxSizing: "border-box",
        outline: "none",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        cursor: "grab",
        backgroundColor: "#020504",
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(108, 180, 255, 0.13) 1px, transparent 0), radial-gradient(circle at 10% 0%, rgba(47, 108, 80, 0.2), transparent 35%), radial-gradient(circle at 90% 8%, rgba(62, 89, 150, 0.18), transparent 38%)",
        backgroundSize: "22px 22px, auto, auto"
    },
    networkWorld: {
        position: "absolute",
        left: 0,
        top: 0,
        transformOrigin: "0 0",
        willChange: "transform"
    },
    networkHeader: {
        position: "absolute",
        zIndex: 20,
        left: "12px",
        top: "11px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        maxWidth: "calc(100% - 330px)",
        padding: "8px 10px",
        border: "1px solid rgba(108, 180, 255, 0.24)",
        borderRadius: "7px",
        background: "rgba(3, 7, 6, 0.88)",
        backdropFilter: "blur(4px)",
        pointerEvents: "none"
    },
    networkToolbar: {
        position: "absolute",
        zIndex: 25,
        left: "12px",
        bottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "6px",
        border: "1px solid rgba(108, 180, 255, 0.24)",
        borderRadius: "7px",
        background: "rgba(3, 7, 6, 0.91)",
        backdropFilter: "blur(4px)"
    },
    networkFilterPopup: {
        position: "absolute",
        zIndex: 26,
        left: "12px",
        bottom: "58px",
        width: "190px",
        boxSizing: "border-box",
        padding: "8px",
        border: "1px solid rgba(108, 180, 255, 0.34)",
        borderRadius: "7px",
        background: "rgba(3, 7, 6, 0.96)",
        boxShadow: "0 10px 28px rgba(0, 0, 0, 0.42)",
        backdropFilter: "blur(5px)",
        userSelect: "none",
        WebkitUserSelect: "none"
    },
    networkModePopup: {
        position: "absolute",
        zIndex: 27,
        left: "12px",
        bottom: "58px",
        width: "220px",
        boxSizing: "border-box",
        padding: "8px",
        border: "1px solid rgba(108, 180, 255, 0.34)",
        borderRadius: "7px",
        background: "rgba(3, 7, 6, 0.96)",
        boxShadow: "0 10px 28px rgba(0, 0, 0, 0.42)",
        backdropFilter: "blur(5px)",
        userSelect: "none",
        WebkitUserSelect: "none"
    },
    networkModeOption: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        boxSizing: "border-box",
        padding: "6px 7px",
        border: "1px solid rgba(125, 160, 212, 0.14)",
        borderRadius: "5px",
        background: "rgba(7, 12, 10, 0.8)",
        color: "#b9d3c1",
        fontSize: "10px",
        textAlign: "left",
        cursor: "pointer"
    },
    networkFilterList: {
        display: "grid",
        gap: "4px",
        marginTop: "7px"
    },
    networkFilterOption: {
        display: "grid",
        gridTemplateColumns: "16px minmax(0, 1fr)",
        alignItems: "center",
        gap: "7px",
        width: "100%",
        boxSizing: "border-box",
        padding: "5px 6px",
        border: "1px solid rgba(125, 160, 212, 0.14)",
        borderRadius: "5px",
        background: "rgba(7, 12, 10, 0.8)",
        color: "#b9d3c1",
        fontSize: "10px",
        fontFamily: "inherit",
        textAlign: "left",
        cursor: "pointer"
    },
    networkNode: {
        position: "absolute",
        display: "grid",
        alignContent: "start",
        gap: "3px",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "8px 9px",
        border: "1px solid rgba(125, 160, 212, 0.42)",
        borderRadius: "5px",
        background: "linear-gradient(145deg, rgba(7, 12, 10, 0.97), rgba(5, 8, 13, 0.97))",
        color: "#bed4c4",
        textAlign: "left",
        cursor: "pointer",
        userSelect: "none",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)"
    },
    networkNodeLabel: {
        color: "#d8efe0",
        fontSize: "11px",
        fontWeight: 800,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    networkNodeSubline: {
        color: "#789589",
        fontSize: "8px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    networkNodeStatus: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "2px",
        fontSize: "8px",
        whiteSpace: "nowrap"
    },
    networkDetails: {
        position: "absolute",
        zIndex: 24,
        right: "12px",
        top: "52px",
        bottom: "12px",
        width: "286px",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: "10px",
        border: "1px solid rgba(108, 180, 255, 0.3)",
        borderRadius: "8px",
        background: "linear-gradient(155deg, rgba(5, 11, 9, 0.96), rgba(5, 9, 16, 0.96))",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(5px)",
        userSelect: "text",
        WebkitUserSelect: "text"
    },
    networkDetailGrid: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "5px 10px",
        alignItems: "baseline",
        marginTop: "9px",
        fontSize: "9px"
    },
    networkRoute: {
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        marginTop: "8px"
    },
    networkRouteHop: {
        border: "1px solid rgba(108, 180, 255, 0.22)",
        borderRadius: "4px",
        padding: "3px 5px",
        color: "#91b6cf",
        background: "rgba(7, 12, 16, 0.78)",
        fontSize: "8px"
    },
    muted: {
        color: "#8db08d"
    },
    strong: {
        fontWeight: 800
    },
    sectionGap: {
        height: "5px"
    },
    bullet: {
        paddingLeft: "14px",
        margin: 0,
        display: "grid",
        gap: "4px"
    },
    tiny: {
        fontSize: "10px"
    }
};

function configureDashboardRenderers() {
    configureDashboardPanels({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
    });

    configureDashboardMetrics({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
        getRamHealth: getRamHealthLevel,
        formatPercent: formatUtilizationPercent,
    });

    configureDashboardTable({
        getTheme: () => activeDashboardTheme,
    });

    configureSystemOverviewPanels({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
        formatResource: formatResourceCardValue,
    });

    configureDashboardGraphs({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
        getValue: getGraphValue,
        formatCompact: formatCompactDashboardValue,
        formatX: formatGraphXValue,
    });

    configureSystemOverviewView({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
        getTone: getHomeTonePalette,
        playerStatsWidth: PLAYER_STATS_WIDGET_WIDTH,
        renderPlayerStats: PlayerStatsOverviewRenderer,
    });

    configurePlayerStatsOverview({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
        getTone: getHomeTonePalette,
    });

    configureNetworkMapView({
        getTheme: () => activeDashboardTheme,
        getStyles: () => WIDGET_STYLES,
    });

    configureDashboardShell({
        getTheme: () => activeDashboardTheme,
    });

    configureWorkspaceProviderView({
        react: rawReact ?? globalThis.React,
    });
}

configureDashboardRenderers();

configureDashboardViewState({
    interactionKey: DASHBOARD_VIEW_INTERACTION_STATE_KEY,
    dragKey: DASHBOARD_VIEW_DRAG_ACTIVE_KEY,
});

function getReactLib() {
    const nextRawReact = globalThis.React ?? null;
    if (!nextRawReact) return null;
    if (nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, () => activeDashboardTheme);
    }
    return React;
}

function getDefaultUiState() {
    return {
        expandedGroups: {
            overview: true,
            affiliations: true,
            hacking: false,
            finances: false,
            hardware: false,
            software: false,
            automation: false,
            configuration: false,
            services: false
        },
        activeViewId: "",
        healthFilter: "all",
        selectedItem: getDefaultSelectedServiceId(),
        centerPanels: {
            "hardware.home": "infrastructure",
            "global.dashboardOptions": "status",
            "global.startOrder": "order",
            "global.options": "",
            "global.coreModules": "",
            "global.integrations": "",
            "global.plugins": "",
        },
        // Persisted (not just component state) because ns.printRaw() mounts a brand-new React
        // tree every dashboard tick - a plain useState here would forget the highlighted row on
        // the very next refresh, seconds after the user clicked it.
        startOrderSelectedServiceId: "",
    };
}

function loadUiState() {
    const base = getDefaultUiState();
    const saved = globalThis[DASHBOARD_UI_STATE_KEY];
    if (!saved || typeof saved !== "object") return base;

    // Start Order used to be a Dashboard Options subview. Preserve an actively selected old view
    // across a hot dashboard restart now that it is its own Services entry.
    const savedStartOrderSelected = saved.selectedItem === "global.dashboardOptions"
        && saved.centerPanels?.["global.dashboardOptions"] === "start-order";
    const upgradedSelectedItem = savedStartOrderSelected
        ? "global.startOrder"
        : saved.selectedItem ?? base.selectedItem;

    const upgradedCenterPanels = {
        ...base.centerPanels,
        ...(saved.centerPanels ?? {})
    };

    const savedExpandedGroups = saved.expandedGroups ?? {};
    const upgradedExpandedGroups = {
        ...base.expandedGroups,
        ...savedExpandedGroups,
    };
    if (
        typeof savedExpandedGroups.affiliations !== "boolean"
        && typeof savedExpandedGroups.progression === "boolean"
    ) {
        upgradedExpandedGroups.affiliations = savedExpandedGroups.progression;
    }
    delete upgradedExpandedGroups.progression;
    if (typeof savedExpandedGroups.globalOptions === "boolean") {
        if (typeof savedExpandedGroups.configuration !== "boolean") {
            upgradedExpandedGroups.configuration = savedExpandedGroups.globalOptions;
        }
        if (typeof savedExpandedGroups.services !== "boolean") {
            upgradedExpandedGroups.services = savedExpandedGroups.globalOptions;
        }
    }
    delete upgradedExpandedGroups.globalOptions;
    const savedActiveViewId = typeof saved.activeViewId === "string"
        ? saved.activeViewId
        : saved.homeMode ? "system-overview" : "";

    return {
        expandedGroups: upgradedExpandedGroups,
        activeViewId: savedActiveViewId === "home" ? "system-overview" : savedActiveViewId,
        healthFilter: HEALTH_FILTER_MODES.has(saved.healthFilter) ? saved.healthFilter : base.healthFilter,
        selectedItem: getServiceById(upgradedSelectedItem) ? upgradedSelectedItem : base.selectedItem,
        centerPanels: upgradedCenterPanels,
        startOrderSelectedServiceId: typeof saved.startOrderSelectedServiceId === "string"
            ? saved.startOrderSelectedServiceId
            : base.startOrderSelectedServiceId
    };
}

function saveUiState(state) {
    globalThis[DASHBOARD_UI_STATE_KEY] = state;
}

function setDashboardOptionsInputFocusState(focused) {
    globalThis[DASHBOARD_OPTIONS_INPUT_FOCUS_KEY] = Boolean(focused);
}

function enqueueDashboardAction(command) {
    if (!command || typeof command !== "object") return;
    const existingQueue = Array.isArray(globalThis[DASHBOARD_ACTION_QUEUE_KEY]) ? globalThis[DASHBOARD_ACTION_QUEUE_KEY] : [];
    existingQueue.push(command);
    globalThis[DASHBOARD_ACTION_QUEUE_KEY] = existingQueue;
}

export function requestDashboardRestartFromTitle(now = Date.now()) {
    const lastRequestedAt = Number(globalThis[DASHBOARD_TITLE_RESTART_REQUESTED_AT_KEY] ?? 0);
    if (Number.isFinite(lastRequestedAt) && now - lastRequestedAt < 1000) return false;
    globalThis[DASHBOARD_TITLE_RESTART_REQUESTED_AT_KEY] = now;
    enqueueDashboardAction({
        kind: "dashboard",
        actionId: DASHBOARD_ACTION_IDS.RESTART_DASHBOARD,
    });
    return true;
}

function setDashboardTailTitle(ns, title) {
    ns.ui.setTailTitle(buildDashboardTailTitle(rawReact, title, requestDashboardRestartFromTitle));
    dashboardTailLayoutState.lastTitle = title;
}

function flushDashboardActionQueue() {
    const queue = Array.isArray(globalThis[DASHBOARD_ACTION_QUEUE_KEY]) ? globalThis[DASHBOARD_ACTION_QUEUE_KEY] : [];
    globalThis[DASHBOARD_ACTION_QUEUE_KEY] = [];
    return queue;
}

function setDashboardFileActionResult(viewId, status, message, details = {}) {
    dashboardSnapshotCoordinator.invalidate(`file-manager:${String(viewId ?? "")}`);
    globalThis[DASHBOARD_FILE_ACTION_RESULT_KEY] = {
        viewId: String(viewId ?? ""),
        status: status === "error" ? "error" : "success",
        message: String(message ?? ""),
        timestamp: Date.now(),
        ...details,
    };
}

function getDashboardFileManagerRenderSignature(viewId, snapshot, themeSignature = "", layoutSignature = "") {
    if (!snapshot || typeof snapshot !== "object") return "";
    const filePaths = (Array.isArray(snapshot.files) ? snapshot.files : [])
        .map((entry) => normalizeFilePath(entry?.path))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
    const lastActionResult = globalThis[DASHBOARD_FILE_ACTION_RESULT_KEY];
    const actionTimestamp = lastActionResult?.viewId === viewId
        ? Number(lastActionResult.timestamp) || 0
        : 0;
    return JSON.stringify({
        viewId,
        filePaths,
        manifest: snapshot.manifest ?? null,
        actionTimestamp,
        themeSignature,
        layoutSignature,
    });
}

function isDashboardFileManagerRenderStable(viewId, signature) {
    const previous = globalThis[DASHBOARD_FILE_VIEW_RENDER_STATE_KEY];
    return Boolean(
        viewId
        && signature
        && previous
        && previous.viewId === viewId
        && previous.signature === signature
    );
}

function rememberDashboardFileManagerRender(viewId, signature) {
    globalThis[DASHBOARD_FILE_VIEW_RENDER_STATE_KEY] = viewId && signature
        ? { viewId, signature }
        : null;
}

// Start Order is an interactive editor whose visible rows depend on the daemon catalogue, not on
// live service telemetry. Keep its mounted tree while unrelated telemetry changes so the list's
// scroll position, selected row, and repeated move-button clicks are not destroyed every second.
// Deliberately exclude serviceStartOrder from this signature: moves update the mounted component
// immediately and save through the global action queue, so the disk round-trip must not trigger a
// second remount of the same edit.
function getDashboardStartOrderRenderSignature(homeScripts, themeSignature = "", layoutSignature = "") {
    const rows = buildServiceStartOrderRows(homeScripts)
        .map((row) => ({
            serviceId: row.serviceId,
            label: row.label,
            ramPerThread: row.ramPerThread,
            description: row.description,
        }))
        .sort((left, right) => left.serviceId.localeCompare(right.serviceId));
    return JSON.stringify({ rows, themeSignature, layoutSignature });
}

function isDashboardStartOrderRenderStable(signature) {
    const previous = globalThis[DASHBOARD_START_ORDER_RENDER_STATE_KEY];
    return Boolean(signature && previous?.signature === signature);
}

function rememberDashboardStartOrderRender(signature) {
    globalThis[DASHBOARD_START_ORDER_RENDER_STATE_KEY] = signature ? { signature } : null;
}

// Same purpose as the File Manager trio above, generalized for any full-window view that's
// bound to a single serviceId's telemetry (network-map today). While such a view is active, its
// ONLY visible data is that one service's telemetry - every other plugin's telemetry is entirely
// off-screen, yet the broad renderSignature check still counts it, forcing a fresh ns.printRaw()
// (a full DOM destroy-and-recreate - see the printRaw-remounts-every-tick note near the top of
// this file) whenever ANY OTHER plugin ticks, which happens roughly every cycle in practice
// (player-stats telemetry alone changes almost every tick). Each such remount has a real chance
// of landing mid-click - the exact DOM node the user is clicking is destroyed/recreated - silently
// swallowing the interaction. Scoping the stability check to just the active view's own service
// closes that: unrelated telemetry no longer forces a remount while a full-window view is open.
function getDashboardServiceScopedViewRenderSignature(viewId, telemetry, serviceStatus, themeSignature = "", layoutSignature = "") {
    if (!viewId) return "";
    return JSON.stringify({ viewId, telemetry: telemetry ?? null, serviceStatus: serviceStatus ?? null, themeSignature, layoutSignature });
}

function isDashboardNetworkMapRenderStable(viewId, signature) {
    const previous = globalThis[DASHBOARD_NETWORK_MAP_VIEW_RENDER_STATE_KEY];
    return Boolean(
        viewId
        && signature
        && previous
        && previous.viewId === viewId
        && previous.signature === signature
    );
}

function rememberDashboardNetworkMapRender(viewId, signature) {
    globalThis[DASHBOARD_NETWORK_MAP_VIEW_RENDER_STATE_KEY] = viewId && signature
        ? { viewId, signature }
        : null;
}

function getDashboardFileActionView(viewId) {
    const view = getDashboardViewRegistry().byId.get(String(viewId ?? ""));
    return view?.renderer === "file-manager" ? view : null;
}

function getDefaultOptions() {
    return getDefaultDashboardOptions(getDashboardServiceRegistry().services);
}

function normalizeDashboardOptionsForCompare(rawOptions = {}) {
    return normalizeDashboardOptions(rawOptions, getDashboardServiceRegistry().services);
}

function areDashboardOptionsEqual(leftOptions, rightOptions) {
    return dashboardOptionsEqual(leftOptions, rightOptions, getDashboardServiceRegistry().services);
}

function loadDashboardOptions(ns) {
    if (!ns || !ns.fileExists(DASHBOARD_OPTIONS_FILE)) return getDefaultOptions();
    let raw = "";
    try {
        raw = ns.read(DASHBOARD_OPTIONS_FILE);
        if (!raw) return getDefaultOptions();
        const services = getDashboardServiceRegistry().services;
        if (dashboardOptionsCache.raw === raw && dashboardOptionsCache.services === services) {
            return dashboardOptionsCache.value;
        }
        const parsed = JSON.parse(raw);
        const value = normalizeDashboardOptionsForCompare(parsed);
        dashboardOptionsCache.raw = raw;
        dashboardOptionsCache.services = services;
        dashboardOptionsCache.value = value;
        return value;
    } catch (e) {
        const defaults = getDefaultOptions();
        if (raw) {
            dashboardOptionsCache.raw = raw;
            dashboardOptionsCache.services = getDashboardServiceRegistry().services;
            dashboardOptionsCache.value = defaults;
        }
        return defaults;
    }
}
function saveDashboardOptions(ns, options) {
    if (!ns) return;
    const raw = JSON.stringify(options);
    ns.write(DASHBOARD_OPTIONS_FILE, raw, "w");
    dashboardOptionsCache.raw = raw;
    dashboardOptionsCache.services = getDashboardServiceRegistry().services;
    dashboardOptionsCache.value = options;
    ns.tprint(`[DASHBOARD] Saved options to ${DASHBOARD_OPTIONS_FILE}`);
    ns.toast("Dashboard options saved", "success", 3500);
}

function buildExecutableDashboardCommand(ns, command) {
    return buildActionCommand(ns, command, {
        restartDashboardActionId: DASHBOARD_ACTION_IDS.RESTART_DASHBOARD,
        dashboardScript: DASHBOARD_SCRIPT,
        getDashboardRestartArgs: (actionNs) => getDashboardRestartArgs(actionNs.args),
        resolveScriptActionExecution,
        getScriptLaunchArgs,
        getScriptLaunchOptions,
        getManagedProcessPaths,
        getFileActionView: getDashboardFileActionView,
        normalizeFilePath,
        loadFileManagerManifest,
        normalizeFileManifest,
    });
}

function completeDashboardAction(ns, command, result) {
    const message = String(result?.message ?? "Dashboard action returned an invalid result.");
    const tone = result?.tone ?? (result?.ok ? "success" : "error");
    if (command.kind === "file") {
        setDashboardFileActionResult(command.viewId, result?.ok ? "success" : "error", message, result);
        ns.toast(message, tone === "danger" ? "error" : tone, 4500);
        ns.print(`[FILE MANAGER] ${message}`);
    } else {
        logMajorAction(ns, message, tone);
    }
    if (result?.applyOptions && typeof result.filename === "string") {
        applyPersistedPluginOptions(ns, result.filename);
    }
}

function executeQueuedNetscriptAction(ns, command) {
    let executableCommand = command;
    try {
        executableCommand = buildExecutableDashboardCommand(ns, command);
        if (!executableCommand) return false;
        executableCommand = normalizeDashboardActionCommand(executableCommand);
        const result = executeDashboardAction(ns, executableCommand);
        completeDashboardAction(ns, executableCommand, result);
        if (result && "restartDashboard" in result && result.restartDashboard === true) {
            const restartArgs = "restartArgs" in result && Array.isArray(result.restartArgs) ? result.restartArgs : [];
            ns.spawn(DASHBOARD_SCRIPT, { threads: 1, spawnDelay: 0 }, ...restartArgs);
        }
        return true;
    } catch (error) {
        const message = error && typeof error === "object" && "message" in error
            ? String(error.message)
            : String(error);
        completeDashboardAction(ns, executableCommand, { ok: false, message, tone: "error" });
        return false;
    }
}

function applyQueuedDashboardActions(ns) {
    if (!ns) return;
    const queue = flushDashboardActionQueue();
    if (!Array.isArray(queue) || queue.length === 0) return;
    dispatchDashboardActions(ns, queue, {
        "window-mode": (command) => {
            const requestedMode = normalizeDashboardWindowMode(command.mode);
            if (requestedMode !== dashboardTailLayoutState.mode) {
                dashboardTailLayoutState.requestedMode = requestedMode;
            }
        },
        "minimize-tail": () => {
            // ns.ui.* is safe to call here (the main loop's own NS context, processed between
            // ticks) but not directly from inside a React click handler - see the comment above
            // autostartPaused's own computation for why calling ns.* synchronously from a handler
            // risks colliding with this loop's own in-flight ns.sleep().
            try {
                ns.ui.setTailMinimized(true);
            } catch (error) {
                // ns.ui unavailable in whatever context this runs in - nothing to do.
            }
        },
        "save-options": (command) => {
            const rawOptions = command.options;
            if (!rawOptions || typeof rawOptions !== "object") return;
            saveDashboardOptions(ns, normalizeDashboardOptionsForCompare(rawOptions));
        },
        "plugin-options": (command) => {
            const integration = getServiceById(command.serviceId)?.pluginMetadata;
            applyPluginIntegrationOptions(ns, integration, command.options, (tone, message) => {
                logMajorAction(ns, message, tone);
            }, { running: isIntegrationScriptRunning(integration, latestHomeProcessFilenames) });
        },
        "plugin-command": (command) => {
            const integration = getServiceById(command.serviceId)?.pluginMetadata;
            applyPluginIntegrationCommand(
                ns,
                integration,
                command.command,
                (tone, message) => logMajorAction(ns, message, tone),
                { running: isIntegrationScriptRunning(integration, latestHomeProcessFilenames), port: command.port }
            );
        },
        dashboard: (command) => {
            if (typeof command.actionId === "string") executeQueuedNetscriptAction(ns, command);
        },
        file: (command) => {
            if (command.actionId === "refresh") {
                setDashboardFileActionResult(command.viewId, "success", "Home filesystem rescanned.");
            } else {
                executeQueuedNetscriptAction(ns, command);
            }
        },
        "file-preview": (command) => {
            // ns.read() is synchronous, but it's still an ns.* call - it must run from here (the
            // safe main-loop context), never directly from the click handler that requested it,
            // which risks colliding with this loop's own in-flight ns.sleep().
            const path = String(command.path ?? "");
            let content = "";
            let error = "";
            try {
                content = String(ns.read(path) ?? "");
            } catch (err) {
                error = String(err?.message ?? err);
            }
            globalThis[DASHBOARD_FILE_PREVIEW_RESULT_KEY] = { path, content, error, timestamp: Date.now() };
        },
        script: (command) => {
            if (typeof command.actionId === "string" && typeof command.filename === "string") {
                performScriptFileAction(ns, command.actionId, command.filename);
            }
        },
        onError: (command, error) => {
            const actionName = typeof command.kind === "string" ? command.kind : "unknown";
            const message = error && typeof error === "object" && "message" in error
                ? String(error.message)
                : String(error);
            logMajorAction(ns, `Dashboard action failed (${actionName}): ${message}`, "danger");
        },
    });
}

function getScriptLaunchArgs(filename) {
    const pluginService = getDashboardServiceRegistry().services.find((service) => service.pluginFile === filename);
    if (Array.isArray(pluginService?.pluginMetadata?.launchArgs)) return pluginService.pluginMetadata.launchArgs;
    const shortcut = getDashboardServiceRegistry().shortcuts?.find((candidate) => candidate.scriptPath === filename);
    if (Array.isArray(shortcut?.launchArgs)) return shortcut.launchArgs;
    return [];
}

function getScriptLaunchOptions(filename) {
    const pluginService = getDashboardServiceRegistry().services.find((service) => service.pluginFile === filename);
    const shortcut = getDashboardServiceRegistry().shortcuts?.find((candidate) => candidate.scriptPath === filename);
    return {
        temporary: pluginService?.pluginMetadata?.temporary === true || shortcut?.temporary === true,
        closeTailOnRestart: Boolean(shortcut),
    };
}

function isDashboardPluginScript(filename) {
    if (typeof filename !== "string" || filename.length === 0) return false;
    const normalized = filename.replace(/\\/g, "/");
    if (isDashboardCoreScript(normalized)) return false;
    const registry = getDashboardServiceRegistry();
    return registry.services.some((service) => service.pluginFile === normalized)
        || registry.shortcuts?.some((shortcut) => shortcut.scriptPath === normalized);
}

function isDashboardCoreScript(filename) {
    return filename === DASHBOARD_SCRIPT || filename === SERVICE_SUPERVISOR_SCRIPT;
}

function buildServiceStartOrderRows(homeScripts, registry = getDashboardServiceRegistry()) {
    return (Array.isArray(homeScripts) ? homeScripts : [])
        .filter((script) => script?.daemon === true
            && !isDashboardCoreScript(script?.filename)
            && !String(script?.filename ?? "").startsWith("trashbin/"))
        .map((script) => {
            const matchedService = registry.services.find((service) => service.pluginFile === script.filename);
            return {
                serviceId: matchedService?.id || script.filename,
                label: matchedService?.menuLabel || script.label || script.filename,
                ramPerThread: script.ramPerThread ?? 0,
                // Bare daemon scripts (no -integration.js descriptor) have no description field
                // to fall back to - leave it blank rather than showing something misleading.
                description: matchedService?.description || "",
            };
        });
}

function isGlobalListMenuItem(itemId) {
    return itemId === "global.options" || itemId === "global.coreModules"
        || itemId === "global.integrations" || itemId === "global.plugins";
}

function isDashboardIntegrationScript(filename) {
    if (typeof filename !== "string" || filename.length === 0) return false;
    const normalized = filename.replace(/\\/g, "/");
    const registry = getDashboardServiceRegistry();
    return registry.services.some((service) => {
        return service.pluginFile === normalized
            && typeof service.pluginIntegrationFile === "string"
            && service.pluginIntegrationFile.startsWith("dashboard/integrations/");
    }) || registry.shortcuts?.some((shortcut) => {
        return shortcut.scriptPath === normalized
            && typeof shortcut.integrationFile === "string"
            && shortcut.integrationFile.startsWith("dashboard/integrations/");
    });
}

// getViewOnlyPluginEntries, buildServiceAutostartAction, buildScriptAutostartAction,
// buildServiceMenuVisibilityAction, and buildScriptListActions live in
// dashboard/libs/dashboard-registry.js and dashboard/libs/script-list-actions.js - they're
// pure functions over registry data passed in by the entry orchestrator below.

function buildSupervisorServiceStateLines(services, homeScripts, pluginRequirements, supervisorRunning, autostartPaused) {
    const managedServices = (Array.isArray(services) ? services : []).filter((service) => {
        return typeof service?.pluginFile === "string" && service.pluginMetadata?.daemon !== false;
    });
    const runningFiles = new Set((Array.isArray(homeScripts) ? homeScripts : [])
        .filter((script) => script?.running && typeof script.filename === "string")
        .map((script) => script.filename));
    const blockedServices = managedServices.filter((service) => {
        const requirements = pluginRequirements?.[service.id] ?? [];
        return requirements.some((requirement) => !requirement?.unlocked && !requirement?.optional);
    });
    const blockedIds = new Set(blockedServices.map((service) => service.id));
    const eligibleServices = managedServices.filter((service) => !blockedIds.has(service.id));
    const runningServices = eligibleServices.filter((service) => runningFiles.has(service.pluginFile));
    const stoppedServices = eligibleServices.length - runningServices.length;

    return [
        { label: "Auto restart", value: supervisorRunning ? "active" : "paused", tone: supervisorRunning ? "success" : "warn" },
        ...(autostartPaused ? [{ label: "Autostart", value: "PAUSED (Kill All Scripts) - click Start integrations to resume", tone: "warn" }] : []),
        { label: "Managed services", value: `${managedServices.length}`, tone: "info" },
        { label: "Eligible", value: `${eligibleServices.length}`, tone: "neutral" },
        { label: "Running", value: `${runningServices.length}`, tone: runningServices.length === eligibleServices.length ? "success" : "info" },
        { label: supervisorRunning ? "Awaiting restart" : "Stopped", value: `${stoppedServices}`, tone: stoppedServices > 0 ? "warn" : "success" },
        { label: "Blocked", value: `${blockedServices.length}`, tone: blockedServices.length > 0 ? "warn" : "neutral" },
        { label: "Scan interval", value: "30 seconds", tone: "neutral" },
    ];
}

function isDashboardHiddenScript(filename, hiddenFolders = DEFAULT_HIDDEN_SCRIPT_FOLDERS, hiddenFiles = []) {
    return isDashboardCoreScript(filename)
        || isScriptInFolders(filename, hiddenFolders)
        || isScriptFileHidden(filename, hiddenFiles);
}

function isScriptHiddenFromManager(script, hiddenFolders, hiddenFiles = []) {
    if (isDashboardCoreScript(script?.filename)) return true;
    if (typeof script?.daemon === "boolean") {
        return isScriptFileHidden(script?.filename, hiddenFiles);
    }
    return isDashboardHiddenScript(script?.filename, hiddenFolders, hiddenFiles);
}

function getNonPluginScripts(homeScripts, hiddenFolders, hiddenFiles = []) {
    return (homeScripts ?? []).filter((script) => {
        return !isDashboardPluginScript(script?.filename)
            && !isScriptHiddenFromManager(script, hiddenFolders, hiddenFiles);
    });
}

function buildScriptBuckets(
    homeScripts = [],
    rawHiddenFolders = DEFAULT_HIDDEN_SCRIPT_FOLDERS_OPTION,
    rawHiddenFiles = DEFAULT_HIDDEN_SCRIPT_FILES_OPTION,
    views = []
) {
    const scripts = Array.isArray(homeScripts) ? homeScripts : [];
    const hiddenFolders = parseScriptFolders(rawHiddenFolders);
    const hiddenFiles = parseScriptFiles(rawHiddenFiles);
    const visibleManagerScripts = scripts.filter((script) => !isScriptHiddenFromManager(script, hiddenFolders, hiddenFiles));
    const integrationScripts = visibleManagerScripts.filter((script) => isDashboardIntegrationScript(script?.filename));
    const pluginScripts = [
        ...visibleManagerScripts.filter((script) => isDashboardPluginScript(script?.filename) && !isDashboardIntegrationScript(script?.filename)),
        ...getViewOnlyPluginEntries(views),
    ];
    const dashboardCoreScripts = scripts.filter((script) => isDashboardCoreScript(script?.filename));
    const nonPluginScripts = getNonPluginScripts(scripts, hiddenFolders, hiddenFiles);

    return {
        integrationScripts,
        pluginScripts,
        nonPluginScripts,
        dashboardCoreScripts,
    };
}

// Purely a function of (homeScripts, registry), and both are already reference-stable within
// their own refresh cadences - memoizing by reference pair is exact, not approximate: any real
// change to either input necessarily produces a new reference, invalidating the cache correctly.
let cachedPluginScriptMetadataResult = null;

function applyPluginScriptMetadata(homeScripts, registry) {
    if (cachedPluginScriptMetadataResult
        && cachedPluginScriptMetadataResult.homeScripts === homeScripts
        && cachedPluginScriptMetadataResult.registry === registry) {
        return cachedPluginScriptMetadataResult.result;
    }

    const pluginMetadataByFile = new Map(
        (registry?.services ?? [])
            .filter((service) => typeof service?.pluginFile === "string")
            .map((service) => [service.pluginFile, service.pluginMetadata])
    );

    const result = (homeScripts ?? []).map((script) => {
        const pluginMetadata = pluginMetadataByFile.get(script?.filename);
        if (typeof pluginMetadata?.daemon !== "boolean") return script;
        return { ...script, daemon: pluginMetadata.daemon, lifecycleSource: "integration" };
    });

    cachedPluginScriptMetadataResult = { homeScripts, registry, result };
    return result;
}

function buildHomeScriptCatalog(ns, homeFiles) {
    if (!ns) return [];

    const files = Array.isArray(homeFiles) ? homeFiles : ns.ls("home");
    const scriptFiles = files
        .filter((filename) => filename.endsWith(".js") || filename.endsWith(".jsx"))
        .sort(compareScriptPathsByName);
    const activeFiles = new Set(scriptFiles);
    for (const cachedFilename of scriptCatalogEntryCache.keys()) {
        if (!activeFiles.has(cachedFilename)) scriptCatalogEntryCache.delete(cachedFilename);
    }

    return scriptFiles.map((filename) => {
            let fileMetadata = null;
            try {
                fileMetadata = ns.getFileMetadata(filename, "home");
            } catch (error) {
                fileMetadata = null;
            }
            const sourceSignature = fileMetadata
                ? `${Number(fileMetadata.mtime) || 0}:${Number(fileMetadata.size) || 0}`
                : "";
            const cached = scriptCatalogEntryCache.get(filename);
            if (sourceSignature && cached?.sourceSignature === sourceSignature) return cached.entry;

            const scriptMetadata = loadDashboardScriptMetadata(ns, filename, sourceSignature);
            const ramPerThread = ns.getScriptRam(filename, "home") || 0;

            const entry = {
                id: filename,
                label: getScriptDisplayName(filename),
                filename,
                running: false,
                daemon: scriptMetadata?.daemon,
                lifecycleSource: scriptMetadata ? "script" : "unspecified",
                ramPerThread,
                runningThreads: 0,
                runningRam: 0,
            };
            if (sourceSignature) scriptCatalogEntryCache.set(filename, { sourceSignature, entry });
            return entry;
        });
}

// Rebuilding the full script catalog (map + spread per entry) on every tick is wasted work when
// nothing running actually changed. Cache by a cheap signature of the running-thread state (not
// object identity of homeProcesses, which is a fresh ns.ps() result every call regardless of
// content) so unrelated ticks reuse the same array/object references.
let cachedHomeProcessState = null;

function applyHomeProcessState(scriptCatalog, homeProcesses) {
    const runningThreadsByFile = new Map();
    for (const process of Array.isArray(homeProcesses) ? homeProcesses : []) {
        const current = runningThreadsByFile.get(process.filename) ?? 0;
        runningThreadsByFile.set(process.filename, current + (process.threads ?? 0));
    }

    const signature = [...runningThreadsByFile.entries()]
        .map(([filename, threads]) => `${filename}=${threads}`)
        .sort()
        .join(",");

    if (cachedHomeProcessState
        && cachedHomeProcessState.scriptCatalog === scriptCatalog
        && cachedHomeProcessState.signature === signature) {
        return cachedHomeProcessState.result;
    }

    const result = (Array.isArray(scriptCatalog) ? scriptCatalog : []).map((script) => {
        const runningThreads = runningThreadsByFile.get(script.filename) ?? 0;
        return {
            ...script,
            running: runningThreads > 0,
            runningThreads,
            runningRam: script.ramPerThread * runningThreads,
        };
    });

    cachedHomeProcessState = { scriptCatalog, signature, result };
    return result;
}

// used/total/ratio rarely change between ticks (RAM usage moves in whole-GB steps, not every
// second) - reuse the same object when the numbers are identical instead of allocating fresh.
let cachedHomeRamStatus = null;

function getHomeRamStatus(ns) {
    if (!ns) {
        return { used: 0, total: 0, ratio: 0 };
    }

    const used = ns.getServerUsedRam("home");
    const total = ns.getServerMaxRam("home");
    const ratio = total > 0 ? used / total : 0;

    if (cachedHomeRamStatus && cachedHomeRamStatus.used === used && cachedHomeRamStatus.total === total) {
        return cachedHomeRamStatus;
    }

    const status = { used, total, ratio };
    cachedHomeRamStatus = status;
    return status;
}

function logMajorAction(ns, message, toastType = "info") {
    if (!ns) return;
    const normalizedToastType = toastType === "danger"
        ? "error"
        : toastType === "warn"
            ? "warning"
            : ["success", "warning", "error", "info"].includes(toastType)
                ? toastType
                : "info";
    ns.tprint(`[DASHBOARD] ${message}`);
    ns.toast(message, normalizedToastType, 4500);
}

function applyPersistedPluginOptions(ns, filename, replayedIntegrationIds = null, persistedOptions = null) {
    // Matches either the integration's own paired script, or one of its managedScripts - a merged
    // integration's option-carrying siblings (faction-manager-gangs.js, faction-manager-boost.js,
    // server-manager-cloud.js, hacking-ops-beginner.js, etc.) that are launched independently by the
    // paired script rather than exec'd directly by the dashboard. Without this, one of those
    // siblings restarting on its own (a crash, a RAM-pressure kill, anything short of the paired
    // script also restarting at the same moment) comes back up holding its in-script defaults with
    // nothing to re-prime it - confirmed real: faction-manager-gangs.js silently reverting to
    // equipmentMinFunds=0 after restarting independently of faction-manager.js.
    const integration = getDashboardServiceRegistry().services.find((service) => {
        return service.pluginFile === filename || service.pluginMetadata?.managedScripts?.includes(filename);
    })?.pluginMetadata;
    if (!integration || Object.keys(integration.options ?? {}).length === 0) return false;

    const replayId = integration.serviceId ?? integration.scriptPath ?? filename;
    if (replayedIntegrationIds?.has(replayId)) return false;
    replayedIntegrationIds?.add(replayId);

    applyPluginIntegrationOptions(ns, integration, persistedOptions ?? loadDashboardOptions(ns), (tone, message) => {
        logMajorAction(ns, message, tone);
    }, { running: true });
    return true;
}

function getManagedProcessPaths(filename) {
    const pluginService = getDashboardServiceRegistry().services.find((service) => service.pluginFile === filename);
    const metadata = pluginService?.pluginMetadata ?? {};
    return {
        home: Array.isArray(metadata.managedScripts) ? metadata.managedScripts : [],
        network: Array.isArray(metadata.managedNetworkScripts) ? metadata.managedNetworkScripts : [],
    };
}

function performScriptFileAction(ns, action, filename) {
    if (!filename) return;

    const execution = resolveScriptActionExecution(action, filename);
    if (!execution) {
        logMajorAction(ns, `Unknown script action: ${action} (${filename})`, "warning");
        return;
    }

    if (execution.executeType === "editor" || execution.executeType === "terminal-hint") {
        const commandText = execution.commandText;
        if (!commandText) {
            logMajorAction(ns, `No terminal command configured for action ${action}.`, "warning");
            return;
        }

        // Bitburner does not expose a direct API to execute terminal editor commands,
        // so provide the exact command and attempt clipboard convenience when available.
        try {
            const clipboard = globalThis?.navigator?.clipboard;
            if (clipboard && typeof clipboard.writeText === "function") {
                void clipboard.writeText(commandText);
                logMajorAction(ns, `Copied command to clipboard: ${commandText}`, "info");
                return;
            }
        } catch (e) {
            // Fall through to command hint logging.
        }

        logMajorAction(ns, `Run in terminal: ${commandText}`, "info");
        return;
    }

    if (["start", "stop", "restart"].includes(execution.executeType)) {
        executeQueuedNetscriptAction(ns, { kind: "script", actionId: action, filename });
        return;
    }
    logMajorAction(ns, `Unsupported execution type for action ${action}: ${execution.executeType}`, "warning");
}

const DASHBOARD_PINNED_MENU_GROUPS = [
    { id: "software", title: "Software", order: 900 },
    { id: "configuration", title: "Configuration", order: 1000 },
    { id: "services", title: "Services", order: 1100 },
];

const DASHBOARD_SERVICES = [
    {
        id: "hardware.home",
        menuGroup: "hardware",
        menuGroupLabel: "Hardware",
        menuLabel: "Home Server",
        menuOrder: -100,
        description: "Home RAM capacity and safeguards for dashboard-managed service startup.",
        rendererKey: "hardware.home",
        defaultPanelId: "infrastructure",
        subviews: [
            { id: "infrastructure", label: "Infrastructure" },
            { id: "options", label: "Options" },
        ],
        getPanels: () => [
            { id: "infrastructure", label: "Infrastructure" },
            { id: "options", label: "Options" },
        ],
        panelMeta: {
            infrastructure: { title: "Home Infrastructure", accent: "#6ee7a8", subtitle: "Home resource snapshot" },
            options: {
                title: "Home Options",
                accent: "#6ee7a8",
                subtitle: "Protect transient capacity and bound service autostart RAM",
                description: "The Transient RAM Reserve keeps capacity free for transient and on-demand processes. The Service Startup RAM Limit separately caps the combined RAM of service entry scripts in the Start Order list.",
            },
        },
        getHealth: ({ homeRamStatus }) => {
            const level = getRamHealthLevel(homeRamStatus);
            const summary = level === "danger"
                ? "Home RAM pressure is critical."
                : level === "warn"
                    ? "Home RAM pressure is rising."
                    : "Home RAM pressure is stable.";
            return {
                level,
                summary,
                panels: {
                    infrastructure: level,
                    options: level,
                },
                panelSummaries: {
                    infrastructure: summary,
                    options: summary,
                },
            };
        },
        getInputs: ({ selectedCenterPanel, options }) => {
            if (selectedCenterPanel !== "options") return [];
            return [
                {
                    id: "reserved-home-ram",
                    label: "Transient RAM Reserve (GB)",
                    description: "Home RAM the supervisor must leave free for dashboard actions and other on-demand processes.",
                    tooltip: "Minimum free Home RAM remaining after each dashboard-managed service launch. This does not reserve RAM from manually started scripts. Set to 0 to disable.",
                    optionKey: "reservedHomeRam",
                    type: "number",
                    value: options.reservedHomeRam,
                    min: 0,
                },
                {
                    id: "service-startup-ram-limit",
                    label: "Service Startup RAM Limit (GB)",
                    description: "Maximum combined RAM for running service entry scripts represented in the Start Order list.",
                    tooltip: "The supervisor counts already-running listed services, then starts more in order only while their combined entry-script RAM stays within this limit. Running services are not stopped, and child processes are not included. Set to 0 for unlimited.",
                    optionKey: "serviceStartupRamLimit",
                    type: "number",
                    value: options.serviceStartupRamLimit,
                    min: 0,
                },
            ];
        },
        getState: ({ selectedCenterPanel, options, homeRamStatus }) => {
            if (selectedCenterPanel !== "infrastructure") return [];
            return [
                { label: "Transient Reserve", value: `${options.reservedHomeRam} GB`, tone: "info" },
                { label: "Service RAM Limit", value: options.serviceStartupRamLimit > 0 ? `${options.serviceStartupRamLimit} GB` : "Unlimited", tone: "info" },
                { label: "Used RAM", value: formatRam(homeRamStatus.used), tone: getRamHealthLevel(homeRamStatus) },
                { label: "Total RAM", value: formatRam(homeRamStatus.total), tone: "neutral" },
                { label: "Utilization", value: formatUtilizationPercent(homeRamStatus.ratio), tone: getRamHealthLevel(homeRamStatus) },
            ];
        },
    },
    {
        id: "global.dashboardOptions",
        menuGroup: "configuration",
        menuOrder: -100,
        menuLabel: "Dashboard Options",
        description: "Controls dashboard-wide presentation and Script List visibility. Plugin discovery is unaffected.",
        alwaysVisible: true,
        defaultPanelId: "status",
        subviews: [
            { id: "status", label: "Status" },
            { id: "options", label: "Options" },
        ],
        panelMeta: {
            status: { title: "Dashboard Status", accent: "#6cb4ff", subtitle: "Current presentation and visibility configuration" },
            options: { title: "Dashboard Options", accent: "#6cb4ff", subtitle: "Configure dashboard-wide behavior" },
        },
        getInputs: ({ selectedCenterPanel, options, pluginDashboardOptionInputs }) => {
            if (selectedCenterPanel !== "options") return [];
            return [
                {
                    id: "dashboard-window-startup-mode",
                    label: "Dashboard window startup",
                    optionKey: "dashboardWindowStartupMode",
                    type: "select",
                    options: DASHBOARD_STARTUP_MODES,
                    value: options.dashboardWindowStartupMode,
                },
                {
                    id: "dashboard-text-size-mode",
                    label: "Dashboard text size",
                    optionKey: "dashboardTextSizeMode",
                    type: "select",
                    options: DASHBOARD_TEXT_SIZE_MODES,
                    value: options.dashboardTextSizeMode,
                },
                {
                    id: "hide-unqualified-plugins",
                    label: "Hide unqualified plugins/integrations",
                    optionKey: "hideUnqualifiedPluginsMode",
                    type: "select",
                    options: HIDE_UNQUALIFIED_PLUGINS_MODES,
                    value: normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode),
                },
                {
                    id: "menu-unlock-glyphs-enabled",
                    label: "Show unlock glyphs",
                    description: "Show feature and unlock markers beside service and panel menu entries.",
                    tooltip: "Disables only unlock glyphs. Health warnings and runtime-status dots remain visible.",
                    optionKey: "menuUnlockGlyphsEnabled",
                    type: "boolean-select",
                    value: options.menuUnlockGlyphsEnabled,
                    group: "Unlock Glyphs",
                },
                {
                    id: "menu-unlock-glyph-max-count",
                    label: "Maximum glyph count",
                    description: "Maximum visible glyph slots per row before excess unlocks collapse into +N.",
                    tooltip: "Each health exclamation mark and the runtime-status dot consume slots and are never hidden. Range: 3-12.",
                    optionKey: "menuUnlockGlyphMaxCount",
                    type: "number",
                    value: normalizeMenuUnlockGlyphMaxCount(options.menuUnlockGlyphMaxCount),
                    min: 3,
                    max: 12,
                    step: 1,
                    disabled: options.menuUnlockGlyphsEnabled === false,
                    group: "Unlock Glyphs",
                },
                {
                    id: "menu-unlock-glyph-opacity",
                    label: "Unlock glyph opacity",
                    description: "Controls the prominence of unlock and +N markers without dimming health or runtime status.",
                    tooltip: "Choose an opacity from 0.10 to 1.00.",
                    optionKey: "menuUnlockGlyphOpacity",
                    type: "number",
                    value: normalizeMenuUnlockGlyphOpacity(options.menuUnlockGlyphOpacity),
                    min: 0.1,
                    max: 1,
                    step: 0.05,
                    disabled: options.menuUnlockGlyphsEnabled === false,
                    group: "Unlock Glyphs",
                },
                {
                    id: "menu-unlock-glyph-scope",
                    label: "Unlock glyph placement",
                    description: "Choose which navigation level receives unlock markers.",
                    tooltip: "Health warnings and runtime-status dots are unaffected by this placement setting.",
                    optionKey: "menuUnlockGlyphScope",
                    type: "select",
                    options: MENU_UNLOCK_GLYPH_SCOPES,
                    value: normalizeMenuUnlockGlyphScope(options.menuUnlockGlyphScope),
                    disabled: options.menuUnlockGlyphsEnabled === false,
                    group: "Unlock Glyphs",
                },
                ...(Array.isArray(pluginDashboardOptionInputs) ? pluginDashboardOptionInputs : []),
                {
                    id: "hidden-script-folders",
                    label: "Hidden folders (comma-separated)",
                    optionKey: "hiddenScriptFolders",
                    type: "text",
                    value: options.hiddenScriptFolders,
                },
                {
                    id: "hidden-script-files",
                    label: "Hidden scripts (comma-separated)",
                    optionKey: "hiddenScriptFiles",
                    type: "text",
                    value: options.hiddenScriptFiles,
                },
            ];
        },
        getState: ({ selectedCenterPanel, options }) => {
            if (selectedCenterPanel !== "status") return [];
            const configuredFolders = parseScriptFolders(options.hiddenScriptFolders);
            const configuredFiles = parseScriptFiles(options.hiddenScriptFiles);
            return [
                { label: "Text size", value: normalizeDashboardTextSizeMode(options.dashboardTextSizeMode), tone: "info" },
                { label: "Window startup", value: normalizeDashboardStartupMode(options.dashboardWindowStartupMode), tone: "info" },
                { label: "Hide unqualified plugins", value: normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode), tone: "info" },
                { label: "Unlock glyphs", value: options.menuUnlockGlyphsEnabled === false ? "Hidden" : normalizeMenuUnlockGlyphScope(options.menuUnlockGlyphScope), tone: "info" },
                { label: "Glyph limit", value: `${normalizeMenuUnlockGlyphMaxCount(options.menuUnlockGlyphMaxCount)}`, tone: "neutral" },
                { label: "Glyph opacity", value: `${Math.round(normalizeMenuUnlockGlyphOpacity(options.menuUnlockGlyphOpacity) * 100)}%`, tone: "neutral" },
                { label: "Last window mode", value: normalizeDashboardWindowMode(options.dashboardLastWindowMode), tone: "neutral" },
                { label: "Hidden folders", value: configuredFolders.join(", ") || "None", tone: "info" },
                { label: "Hidden scripts", value: configuredFiles.join(", ") || "None", tone: "info" },
                { label: "Defaults", value: DEFAULT_HIDDEN_SCRIPT_FOLDERS_OPTION, tone: "neutral" },
            ];
        },
    },
    {
        id: "global.startOrder",
        menuGroup: "services",
        menuLabel: "Start Order",
        description: "Controls the order the Integration Service Supervisor uses when available RAM cannot start every eligible service.",
        alwaysVisible: true,
        defaultPanelId: "order",
        subviews: [
            { id: "order", label: "Order" },
        ],
        panelMeta: {
            order: { title: "Service Start Order", accent: "#6cb4ff", subtitle: "Order the Integration Service Supervisor uses when RAM is scarce" },
        },
    },
    {
        id: "global.coreModules",
        menuGroup: "services",
        menuLabel: "Core Modules",
        alwaysVisible: true,
        rendererKey: "global.coreModules",
        defaultPanelId: "",
        subviews: [],
        getPanels: (homeScripts = []) => homeScripts
            .filter((script) => isDashboardCoreScript(script?.filename))
            .map((script) => ({
                id: script.id,
                label: script.label,
                running: script.running,
                daemon: script.daemon,
            })),
        panelMeta: {
            default: { title: "Core Modules", accent: "#6ee7a8", subtitle: "Dashboard core scripts" },
            script: { title: "Core Module", accent: "#6ee7a8", subtitle: "Dashboard core status and controls" },
        },
        getHealth: ({ homeScripts }) => summarizeScriptListHealth((homeScripts ?? []).filter((script) => {
            return isDashboardCoreScript(script?.filename);
        })),
        getState: ({ selectedScript, homeScripts, pluginRequirements, autostartPaused }) => {
            if (!selectedScript) return [];
            const scriptLines = [
                { label: "Dashboard Core", value: selectedScript.label, tone: "info" },
                { label: "Path", value: selectedScript.filename, tone: "neutral" },
                { label: "Status", value: selectedScript.running ? "running" : "stopped", tone: selectedScript.running ? "success" : "neutral" },
                { label: "Lifecycle", value: getScriptLifecycleLabel(selectedScript), tone: selectedScript.daemon === true ? "info" : "neutral" },
                { label: "RAM (1t)", value: formatRam(selectedScript.ramPerThread ?? 0), tone: "neutral" },
                { label: "RAM (running)", value: formatRam(selectedScript.runningRam ?? 0), tone: selectedScript.running ? "info" : "neutral" },
                { label: "Threads", value: `${selectedScript.runningThreads ?? 0}`, tone: "neutral" },
            ];
            if (selectedScript.filename !== SERVICE_SUPERVISOR_SCRIPT) return scriptLines;
            return [
                ...scriptLines,
                ...buildSupervisorServiceStateLines(
                    getDashboardServiceRegistry().services,
                    homeScripts,
                    pluginRequirements,
                    selectedScript.running,
                    Boolean(autostartPaused)
                ),
            ];
        },
        getActions: ({ selectedScript, options, services, views }) => {
            return buildScriptListActions(selectedScript, options, undefined, services, views);
        },
    },
    {
        id: "global.integrations",
        menuGroup: "services",
        menuLabel: "Integration Manager",
        alwaysVisible: true,
        rendererKey: "global.integrations",
        defaultPanelId: "",
        subviews: [],
        getPanels: (homeScripts = []) => homeScripts
            .filter((script) => isDashboardIntegrationScript(script?.filename))
            .map((script) => ({
                id: script.id,
                label: script.label,
                running: script.running,
                daemon: script.daemon,
            })),
        panelMeta: {
            default: { title: "Integrations", accent: "#6cb4ff", subtitle: "Independently-runnable scripts with a dashboard descriptor" },
            script: { title: "Integration", accent: "#6cb4ff", subtitle: "Integration status and controls" },
        },
        getHealth: ({ homeScripts, options }) => summarizeScriptListHealth(buildScriptBuckets(
            homeScripts,
            options.hiddenScriptFolders,
            options.hiddenScriptFiles
        ).integrationScripts),
        getState: ({ selectedScript }) => {
            if (!selectedScript) return [];
            return [
                { label: "Integration", value: selectedScript.label, tone: "info" },
                { label: "Path", value: selectedScript.filename, tone: "neutral" },
                { label: "Status", value: selectedScript.running ? "running" : "stopped", tone: selectedScript.running ? "success" : "neutral" },
                { label: "Lifecycle", value: getScriptLifecycleLabel(selectedScript), tone: selectedScript.daemon === true ? "info" : "neutral" },
                { label: "RAM (1t)", value: formatRam(selectedScript.ramPerThread ?? 0), tone: "neutral" },
                { label: "RAM (running)", value: formatRam(selectedScript.runningRam ?? 0), tone: selectedScript.running ? "info" : "neutral" },
                { label: "Threads", value: `${selectedScript.runningThreads ?? 0}`, tone: "neutral" },
            ];
        },
        getActions: ({ selectedScript, options, services, views }) => {
            return buildScriptListActions(selectedScript, options, undefined, services, views);
        },
    },
    {
        id: "global.plugins",
        menuGroup: "services",
        menuLabel: "Plugin Manager",
        alwaysVisible: true,
        rendererKey: "global.plugins",
        defaultPanelId: "",
        subviews: [],
        getPanels: (homeScripts = [], views = []) => [
            ...homeScripts
                .filter((script) => isDashboardPluginScript(script?.filename) && !isDashboardIntegrationScript(script?.filename))
                .map((script) => ({
                    id: script.id,
                    label: script.label,
                    running: script.running,
                    daemon: script.daemon,
                })),
            ...getViewOnlyPluginEntries(views),
        ],
        panelMeta: {
            default: { title: "Plugins", accent: "#6cb4ff", subtitle: "Packaged dashboard plugin scripts" },
            script: { title: "Plugin", accent: "#6cb4ff", subtitle: "Plugin status and controls" },
        },
        getHealth: ({ homeScripts, options }) => summarizeScriptListHealth(buildScriptBuckets(
            homeScripts,
            options.hiddenScriptFolders,
            options.hiddenScriptFiles
        ).pluginScripts.filter((script) => !script?.viewOnly)),
        getState: ({ selectedScript }) => {
            if (!selectedScript) return [];
            if (selectedScript.viewOnly) {
                return [
                    { label: "Plugin", value: selectedScript.label, tone: "info" },
                    { label: "Type", value: "Framework view (no backing script)", tone: "neutral" },
                ];
            }
            return [
                { label: "Plugin", value: selectedScript.label, tone: "info" },
                { label: "Path", value: selectedScript.filename, tone: "neutral" },
                { label: "Status", value: selectedScript.running ? "running" : "stopped", tone: selectedScript.running ? "success" : "neutral" },
                { label: "Lifecycle", value: getScriptLifecycleLabel(selectedScript), tone: selectedScript.daemon === true ? "info" : "neutral" },
                { label: "RAM (1t)", value: formatRam(selectedScript.ramPerThread ?? 0), tone: "neutral" },
                { label: "RAM (running)", value: formatRam(selectedScript.runningRam ?? 0), tone: selectedScript.running ? "info" : "neutral" },
                { label: "Threads", value: `${selectedScript.runningThreads ?? 0}`, tone: "neutral" },
            ];
        },
        getActions: ({ selectedScript, options, services, views }) => {
            return buildScriptListActions(selectedScript, options, undefined, services, views);
        },
    },
    {
        id: "global.options",
        menuGroup: "services",
        menuLabel: "Script Manager",
        alwaysVisible: true,
        rendererKey: "global.options",
        defaultPanelId: "",
        subviews: [],
        getPanels: (homeScripts = []) => homeScripts.map((script) => ({
            id: script.id,
            label: script.label,
            running: script.running,
            daemon: script.daemon,
            })),
        panelMeta: {
            default: { title: "Scripts", accent: "#ff7bd0", subtitle: "Home directory scripts" },
            script: { title: "Script", accent: "#ff7bd0", subtitle: "Script status and controls" },
        },
        getHealth: ({ homeScripts, options }) => summarizeScriptListHealth(getNonPluginScripts(
            homeScripts,
            parseScriptFolders(options.hiddenScriptFolders),
            parseScriptFiles(options.hiddenScriptFiles)
        )),
        getState: ({ selectedScript }) => {
            if (!selectedScript) return [];
            return [
                { label: "Script", value: selectedScript.label, tone: "info" },
                { label: "Path", value: selectedScript.filename, tone: "neutral" },
                { label: "Status", value: selectedScript.running ? "running" : "stopped", tone: selectedScript.running ? "success" : "neutral" },
                { label: "Lifecycle", value: getScriptLifecycleLabel(selectedScript), tone: selectedScript.daemon === true ? "info" : "neutral" },
                { label: "RAM (1t)", value: formatRam(selectedScript.ramPerThread ?? 0), tone: "neutral" },
                { label: "RAM (running)", value: formatRam(selectedScript.runningRam ?? 0), tone: selectedScript.running ? "info" : "neutral" },
                { label: "Threads", value: `${selectedScript.runningThreads ?? 0}`, tone: "neutral" },
            ];
        },
        getActions: ({ selectedScript, options, services, views }) => {
            return buildScriptListActions(selectedScript, options, undefined, services, views);
        },
    },
];

const DASHBOARD_VIEW_RENDERERS = new Set(["system-overview", "network-map", "file-manager", "script-log"]);
const DASHBOARD_HOME_WIDGET_TYPES = new Set(["metrics", "player-stats", "health", "gauges", "service-health", "graphs"]);
// "clipboard" is the odd one out: every other kind dispatches something (a script action, a port
// command, an options write), whereas clipboard just hands the player a string to paste into the
// game's own terminal. It exists for workflows that are only manual until Singularity unlocks the
// automated path. normalizeDashboardActions() silently drops unknown kinds, so it must be listed.
const SERVICE_ACTION_KINDS = new Set(["dashboard", "script", "save-options", "plugin-command", "clipboard"]);
const SERVICE_HEALTH_LEVELS = new Set(["neutral", "info", "warn", "danger"]);
const SERVICE_CONTRACT_STRICT_MODE = Boolean(globalThis?.__DASHBOARD_SERVICE_STRICT_MODE__);

function normalizeDashboardActions(actions = [], options = {}) {
    const kinds = options.allowedKinds instanceof Set ? options.allowedKinds : SERVICE_ACTION_KINDS;
    const candidates = [];

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action || typeof action !== "object") continue;
        if (typeof action.id !== "string" || typeof action.label !== "string") continue;
        if (!kinds.has(action.kind)) continue;
        if (action.visible === false) continue;
        candidates.push({ action, index: i });
    }

    candidates.sort((left, right) => {
        const leftOrder = Number.isFinite(left.action.order) ? left.action.order : null;
        const rightOrder = Number.isFinite(right.action.order) ? right.action.order : null;

        if (leftOrder != null && rightOrder != null && leftOrder !== rightOrder) return leftOrder - rightOrder;
        if (leftOrder != null && rightOrder == null) return -1;
        if (leftOrder == null && rightOrder != null) return 1;
        return left.index - right.index;
    });

    return candidates.map((entry) => entry.action);
}

function getRamHealthLevel(ramStatus) {
    const ratio = ramStatus?.ratio ?? 0;
    if (ratio >= 0.95) return "danger";
    if (ratio >= 0.9) return "warn";
    return "neutral";
}

function validateDashboardServices(services) {
    return validateDashboardServicesDefinition(services, null, SERVICE_CONTRACT_STRICT_MODE);
}

function getDashboardServiceRegistry() {
    const registry = globalThis[DASHBOARD_SERVICE_REGISTRY_KEY];
    if (registry && Array.isArray(registry.services) && registry.byId instanceof Map) {
        return registry;
    }

    const fallbackRegistry = {
        ...validateDashboardServices(DASHBOARD_SERVICES),
        shortcuts: [],
        shortcutById: new Map(),
    };
    globalThis[DASHBOARD_SERVICE_REGISTRY_KEY] = fallbackRegistry;
    return fallbackRegistry;
}

function setDashboardServiceRegistry(registry) {
    if (!registry || !Array.isArray(registry.services) || !(registry.byId instanceof Map)) return;
    globalThis[DASHBOARD_SERVICE_REGISTRY_KEY] = registry;
}

function getDashboardShortcutById(shortcutId) {
    return getDashboardServiceRegistry().shortcutById?.get(shortcutId) ?? null;
}

function validateDashboardViews(views = []) {
    return validateDashboardViewsDefinition(
        views,
        null,
        DASHBOARD_VIEW_RENDERERS,
        DASHBOARD_HOME_WIDGET_TYPES
    );
}

function getDashboardViewRegistry() {
    const registry = globalThis[DASHBOARD_VIEW_REGISTRY_KEY];
    if (registry && Array.isArray(registry.views) && registry.byId instanceof Map) return registry;
    const fallback = validateDashboardViews([]);
    globalThis[DASHBOARD_VIEW_REGISTRY_KEY] = fallback;
    return fallback;
}

function applyDashboardViewWidgetContributions(views, services) {
    return applyDashboardViewWidgetContributionsDefinition(views, services);
}

function buildDashboardMenuGroupRegistry(services = [], views = [], shortcuts = []) {
    return buildDashboardMenuGroupRegistryDefinition([...services, ...shortcuts], views, DASHBOARD_PINNED_MENU_GROUPS);
}

function getDashboardMenuGroupRegistry() {
    const registry = globalThis[DASHBOARD_MENU_GROUP_REGISTRY_KEY];
    if (registry && Array.isArray(registry.groups) && registry.byId instanceof Map) return registry;
    const fallback = buildDashboardMenuGroupRegistry(
        getDashboardServiceRegistry().services,
        getDashboardViewRegistry().views,
        getDashboardServiceRegistry().shortcuts
    );
    globalThis[DASHBOARD_MENU_GROUP_REGISTRY_KEY] = fallback;
    return fallback;
}

function rebuildDashboardMenuGroupRegistry(services = [], views = [], shortcuts = []) {
    const previous = globalThis[DASHBOARD_MENU_GROUP_REGISTRY_SOURCE_KEY];
    if (previous?.services === services && previous?.views === views && previous?.shortcuts === shortcuts && previous.registry) {
        globalThis[DASHBOARD_MENU_GROUP_REGISTRY_KEY] = previous.registry;
        return previous.registry;
    }
    const registry = buildDashboardMenuGroupRegistry(services, views, shortcuts);
    globalThis[DASHBOARD_MENU_GROUP_REGISTRY_KEY] = registry;
    globalThis[DASHBOARD_MENU_GROUP_REGISTRY_SOURCE_KEY] = { services, views, shortcuts, registry };
    return registry;
}

function rebuildDashboardViewRegistry(ns, homeScripts = []) {
    const filenames = homeScripts.map((script) => script.filename).sort(compareScriptPathsByName);
    const cacheKey = filenames.join("|");
    const now = Date.now();
    const cache = globalThis.__dashboard_view_scan_cache_v2;
    const canUseCache = cache
        && typeof cache === "object"
        && cache.key === cacheKey
        && Array.isArray(cache.definitions)
        && Number.isFinite(cache.scannedAt)
        && (now - cache.scannedAt) < 5000;
    const definitions = canUseCache ? cache.definitions : discoverDashboardViews(ns, filenames);

    if (!canUseCache) {
        globalThis.__dashboard_view_scan_cache_v2 = {
            key: cacheKey,
            definitions,
            scannedAt: now,
        };
    }

    const services = getDashboardServiceRegistry().services;
    const contributedDefinitions = applyDashboardViewTelemetryContributions(
        applyDashboardViewWidgetContributions(definitions, services),
        services
    );
    const definitionSignature = JSON.stringify(contributedDefinitions);
    const previous = globalThis.__dashboard_view_registry_source_v4;
    if (previous?.signature === definitionSignature && previous.registry) return previous.registry;
    const registry = validateDashboardViews(contributedDefinitions);
    globalThis[DASHBOARD_VIEW_REGISTRY_KEY] = registry;
    globalThis.__dashboard_view_registry_source_v4 = { signature: definitionSignature, registry };
    return registry;
}

function logServiceRegistryIssues(registry) {
    if (!registry || !Array.isArray(registry.issues) || registry.issues.length === 0) return;
    const issueHash = registry.issues.join("\n");
    if (globalThis.__dashboard_service_registry_issue_hash_v2 === issueHash) return;
    globalThis.__dashboard_service_registry_issue_hash_v2 = issueHash;
    console.warn(`[dashboard service contract] strict mode: ${SERVICE_CONTRACT_STRICT_MODE ? "on" : "off"}`);
    for (const issue of registry.issues) {
        console.warn(`[dashboard service contract] ${issue}`);
    }
}

function logMenuGroupRegistryIssues(registry) {
    if (!registry || !Array.isArray(registry.issues) || registry.issues.length === 0) return;
    const issueHash = registry.issues.join("\n");
    if (globalThis.__dashboard_menu_group_registry_issue_hash_v1 === issueHash) return;
    globalThis.__dashboard_menu_group_registry_issue_hash_v1 = issueHash;
    for (const issue of registry.issues) {
        console.warn(`[dashboard menu group contract] ${issue}`);
    }
}

function buildDescriptorContentSignature(ns, filenames) {
    return filenames
        .filter(isDashboardPluginDescriptorFilename)
        .map((filename) => {
            let fileMetadata = null;
            try {
                fileMetadata = ns.getFileMetadata(filename, "home");
            } catch (error) {
                fileMetadata = null;
            }
            const stamp = fileMetadata ? `${Number(fileMetadata.mtime) || 0}:${Number(fileMetadata.size) || 0}` : "";
            return `${filename}@${stamp}`;
        })
        .join("|");
}

function rebuildDashboardServiceRegistry(ns, homeScripts = []) {
    const filenames = homeScripts.map((script) => script.filename).sort(compareScriptPathsByName);
    const pluginCacheKey = `${filenames.join("|")}::${PLUGIN_RUNTIME_EXCLUDED_FOLDERS.join("|")}::${buildDescriptorContentSignature(ns, filenames)}`;
    const now = Date.now();
    const cache = globalThis.__dashboard_plugin_scan_cache_v4;
    const canUseCache = cache
        && typeof cache === "object"
        && cache.key === pluginCacheKey
        && Array.isArray(cache.definitions)
        && Number.isFinite(cache.scannedAt)
        && (now - cache.scannedAt) < 5000;

    const pluginDefinitions = canUseCache
        ? cache.definitions
        : discoverDashboardPlugins(ns, filenames, {
            excludedRuntimeFolders: PLUGIN_RUNTIME_EXCLUDED_FOLDERS,
        });

    if (!canUseCache) {
        globalThis.__dashboard_plugin_scan_cache_v4 = {
            key: pluginCacheKey,
            definitions: pluginDefinitions,
            scannedAt: now,
        };
    }

    const definitionSignature = JSON.stringify(pluginDefinitions);
    const previous = globalThis[DASHBOARD_SERVICE_REGISTRY_SOURCE_KEY];
    if (previous?.signature === definitionSignature && previous.registry) {
        setDashboardServiceRegistry(previous.registry);
        return previous.registry;
    }

    const pluginServices = buildDashboardPluginServices(pluginDefinitions, getDashboardPluginAdapterFactories());
    const pluginShortcuts = buildDashboardPluginShortcuts(pluginDefinitions);

    const pluginIds = new Set(pluginServices.map((service) => service.id));
    const coreServices = DASHBOARD_SERVICES.filter((service) => !pluginIds.has(service.id));
    const mergedServices = [...coreServices, ...pluginServices];
    const contributedServices = applyDashboardServiceTableContributions(
        applyDashboardServiceTelemetryContributions(mergedServices)
    );
    const validatedRegistry = validateDashboardServices(contributedServices);
    const serviceIds = new Set(validatedRegistry.services.map((service) => service.id));
    const shortcuts = pluginShortcuts.filter((shortcut) => !serviceIds.has(shortcut.id));
    const shortcutIssues = pluginShortcuts
        .filter((shortcut) => serviceIds.has(shortcut.id))
        .map((shortcut) => `Shortcut id conflicts with service id: ${shortcut.id}`);
    const registry = {
        ...validatedRegistry,
        shortcuts,
        shortcutById: new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut])),
        issues: [...(validatedRegistry.issues ?? []), ...shortcutIssues],
    };
    setDashboardServiceRegistry(registry);
    globalThis[DASHBOARD_SERVICE_REGISTRY_SOURCE_KEY] = { signature: definitionSignature, registry };
    logServiceRegistryIssues(registry);
    return registry;
}

function getServiceById(serviceId) {
    return getDashboardServiceRegistry().byId.get(serviceId) ?? null;
}

function getDefaultSelectedServiceId() {
    return getDefaultSelectedServiceIdDefinition(
        getDashboardServiceRegistry().services,
        getDashboardMenuGroupRegistry().groups
    );
}

function getMenuGroups(options = {}, pluginRequirements = {}) {
    const registry = getDashboardServiceRegistry();
    return buildDashboardMenuGroups(
        [...registry.services, ...(registry.shortcuts ?? [])],
        getDashboardMenuGroupRegistry().groups,
        options,
        pluginRequirements
    );
}

function getCenterPanelsForItem(selectedItem, homeScripts = []) {
    const service = getServiceById(selectedItem);
    if (!service) {
        return [{ id: "core-stats", label: "Core stats" }];
    }

    if (typeof service.getPanels === "function") {
        const dynamicPanels = service.getPanels(homeScripts, getDashboardViewRegistry().views);
        if (Array.isArray(dynamicPanels) && dynamicPanels.length > 0) {
            return dynamicPanels;
        }
    }

    if (Array.isArray(service.subviews) && service.subviews.length > 0) {
        return service.subviews;
    }

    // Script and plugin lists should render as empty when there are no eligible scripts,
    // rather than falling back to a synthetic placeholder panel.
    if (isGlobalListMenuItem(service.id)) {
        return [];
    }

    return [{ id: "core-stats", label: "Core stats" }];
}

function getServicePanelMeta(service, panelId, fallbackMeta) {
    const panelMeta = service?.panelMeta ?? {};
    return panelMeta[panelId] ?? panelMeta.default ?? fallbackMeta;
}

function getServiceActions(service, context) {
    if (typeof service?.getActions !== "function") {
        return [];
    }

    const actions = service.getActions(context);
    if (!Array.isArray(actions)) {
        return [];
    }

    return normalizeDashboardActions(actions);
}

function getServiceState(service, context) {
    const stateLines = typeof service?.getState === "function" ? service.getState(context) : [];
    return [
        ...(Array.isArray(stateLines) ? stateLines : []),
        ...getDashboardServiceTelemetryStateLines(service, context),
        ...getDashboardServiceTableStateLines(service, context),
    ];
}

function getServiceSections(service, context) {
    const sections = typeof service?.getSections === "function" ? service.getSections(context) : [];
    return [
        ...(Array.isArray(sections) ? sections : []),
        ...getDashboardServiceTableSections(service, context),
    ];
}

function getServiceInputs(service, context) {
    if (typeof service?.getInputs !== "function") {
        return [];
    }

    const inputs = service.getInputs(context);
    if (!Array.isArray(inputs)) {
        return [];
    }

    // Adapter-normalized inputs are the runtime source of truth for values and constraints, while
    // the integration descriptor remains the source of truth for presentation-only grouping.
    // Restore `group` here as a final contract boundary so every adapter can use grouped inputs
    // without needing to know how the dashboard renderer presents them.
    const metadataGroupByOptionKey = new Map(
        (Array.isArray(service?.pluginMetadata?.inputs) ? service.pluginMetadata.inputs : [])
            .filter((input) => typeof input?.optionKey === "string" && typeof input?.group === "string" && input.group.length > 0)
            .map((input) => [input.optionKey, input.group])
    );

    return inputs
        .filter((input) => input && typeof input.id === "string" && typeof input.label === "string" && typeof input.optionKey === "string")
        .map((input) => {
            const normalizedInput = input.type === "checkbox"
                ? { ...input, type: "boolean-select" }
                : input;
            if (typeof normalizedInput.group === "string" && normalizedInput.group.length > 0) return normalizedInput;
            const metadataGroup = metadataGroupByOptionKey.get(normalizedInput.optionKey);
            return metadataGroup ? { ...normalizedInput, group: metadataGroup } : normalizedInput;
        });
}

function getServiceHealth(service, context) {
    if (typeof service?.getHealth !== "function") {
        return { level: "neutral", panels: {}, summary: "", panelSummaries: {} };
    }

    const rawHealth = service.getHealth(context);
    if (!rawHealth || typeof rawHealth !== "object") {
        return { level: "neutral", panels: {}, summary: "", panelSummaries: {} };
    }

    const level = SERVICE_HEALTH_LEVELS.has(rawHealth.level) ? rawHealth.level : "neutral";
    const panels = {};
    const panelSummaries = {};
    if (rawHealth.panels && typeof rawHealth.panels === "object") {
        for (const [panelId, panelLevel] of Object.entries(rawHealth.panels)) {
            if (typeof panelId !== "string") continue;
            panels[panelId] = SERVICE_HEALTH_LEVELS.has(panelLevel) ? panelLevel : "neutral";
        }
    }

    if (rawHealth.panelSummaries && typeof rawHealth.panelSummaries === "object") {
        for (const [panelId, panelSummary] of Object.entries(rawHealth.panelSummaries)) {
            if (typeof panelId !== "string" || typeof panelSummary !== "string") continue;
            panelSummaries[panelId] = panelSummary;
        }
    }

    return {
        level,
        panels,
        summary: typeof rawHealth.summary === "string" ? rawHealth.summary : "",
        panelSummaries,
    };
}

function formatUtilizationPercent(ratio) {
    const percentage = Math.max(0, Number(ratio) || 0) * 100;
    if (percentage === 0) return "0%";
    if (percentage < 0.01) return "<0.01%";
    if (percentage < 1) return `${percentage.toFixed(2)}%`;
    if (percentage < 10) return `${percentage.toFixed(1)}%`;
    return `${Math.round(percentage)}%`;
}

function getGraphValue(record, key) {
    if (!record || typeof record !== "object" || typeof key !== "string" || key.length === 0) {
        return undefined;
    }
    return key.split(".").reduce((value, segment) => {
        if (!value || typeof value !== "object" || !(segment in value)) return undefined;
        return value[segment];
    }, record);
}

function formatResourceCardValue(value, format = "text") {
    if (format === "ram") return formatRam(Math.max(0, Number(value) || 0));
    if (format === "number") return (Number(value) || 0).toLocaleString();
    if (format === "percent") return formatUtilizationPercent(Number(value) || 0);
    if (format === "money") return formatMoney(Number(value) || 0);
    return value === undefined || value === null || value === "" ? "n/a" : String(value);
}

function ResourceCardList({ section, index = 0, serviceId = "", scriptPath = "" }) {
    const [editingIdentity, setEditingIdentity] = React.useState("");
    const [draftName, setDraftName] = React.useState("");
    const cancelRenameRef = React.useRef(false);
    React.useEffect(() => {
        return () => {
            if (editingIdentity) setDashboardOptionsInputFocusState(false);
        };
    }, [editingIdentity]);

    const items = Array.isArray(section?.items) ? section.items : [];
    if (items.length === 0) {
        return section?.emptyText ? (
            <div style={WIDGET_STYLES.muted}>{section.emptyText}</div>
        ) : null;
    }

    const metrics = Array.isArray(section?.metrics) ? section.metrics : [];
    const nameKey = typeof section?.nameKey === "string" ? section.nameKey : "name";
    const idKey = typeof section?.idKey === "string" ? section.idKey : nameKey;
    const nameEdit = section?.nameEdit && typeof section.nameEdit === "object"
        ? section.nameEdit
        : null;
    const itemAction = section?.itemAction && typeof section.itemAction === "object"
        ? section.itemAction
        : null;
    const utilization = section?.utilization && typeof section.utilization === "object"
        ? section.utilization
        : null;

    const beginNameEdit = (identity, name) => {
        if (!nameEdit || !serviceId) return;
        cancelRenameRef.current = false;
        setEditingIdentity(identity);
        setDraftName(name);
        setDashboardOptionsInputFocusState(true);
    };

    // A generalized, one-click sibling to nameEdit's rename flow - same identity-scoped command
    // dispatch (enqueueDashboardAction), but fires immediately instead of opening a text input.
    // Lets any resource-cards section (not just the one that happens to support renaming) offer a
    // per-row button, e.g. Augment Manager's per-augment "Buy".
    const runItemAction = (identity) => {
        if (!itemAction || !serviceId) return;
        const commandPrefix = typeof itemAction.commandPrefix === "string" ? itemAction.commandPrefix : "";
        if (!commandPrefix) return;

        const encode = itemAction.encoding === "uri-component"
            ? (value) => encodeURIComponent(value)
            : (value) => value;
        enqueueDashboardAction({
            kind: "plugin-command",
            serviceId,
            command: `${commandPrefix}${encode(identity)}`,
        });
        if (itemAction.startRuntime === true && scriptPath) {
            enqueueDashboardAction({
                kind: "script",
                actionId: SCRIPT_ACTION_IDS.START,
                filename: scriptPath,
            });
        }
    };

    const finishNameEdit = (identity, currentName) => {
        const cancelled = cancelRenameRef.current;
        cancelRenameRef.current = false;
        setEditingIdentity("");
        setDashboardOptionsInputFocusState(false);
        if (cancelled || !nameEdit || !serviceId) return;

        const nextName = String(draftName ?? "").trim();
        if (!nextName || nextName === currentName) return;
        const commandPrefix = typeof nameEdit.commandPrefix === "string" ? nameEdit.commandPrefix : "";
        if (!commandPrefix) return;

        const encode = nameEdit.encoding === "uri-component"
            ? (value) => encodeURIComponent(value)
            : (value) => value;
        const separator = typeof nameEdit.separator === "string" ? nameEdit.separator : ":";
        enqueueDashboardAction({
            kind: "plugin-command",
            serviceId,
            command: `${commandPrefix}${encode(identity)}${separator}${encode(nextName)}`,
        });
        if (nameEdit.startRuntime === true && scriptPath) {
            enqueueDashboardAction({
                kind: "script",
                actionId: SCRIPT_ACTION_IDS.START,
                filename: scriptPath,
            });
        }
    };

    return (
        <div
            style={{
                ...WIDGET_STYLES.resourceCardList,
                marginTop: index > 0 ? "5px" : 0,
            }}
        >
            {section.title ? (
                <div data-dashboard-theme-role="data-heading" style={{ ...WIDGET_STYLES.strong, color: section.titleColor }}>{section.title}</div>
            ) : null}
            {section.sourceLabel ? (
                // Unlike a graph (which zeroes its data when its source goes stale, see
                // getPluginIntegrationSections), this list keeps showing its last-known items even
                // when offline - zeroing a server/resource list would misleadingly read as "you
                // own nothing" rather than "the tracker stopped reporting". This note is the only
                // offline signal for this section type, so it always shows the source, and adds an
                // explicit stale callout when offline rather than silently going quiet.
                <div style={WIDGET_STYLES.muted}>
                    {section.offline
                        ? `${section.sourceLabel} - offline${section.sourceAgeText ? ` (last data ${section.sourceAgeText})` : ""}, showing last-known data`
                        : `via ${section.sourceLabel}`}
                </div>
            ) : null}
            {items.map((item, itemIndex) => {
                const name = formatResourceCardValue(getGraphValue(item, nameKey));
                const identity = formatResourceCardValue(getGraphValue(item, idKey));
                const editingName = Boolean(nameEdit && editingIdentity === identity);
                const used = utilization ? Math.max(0, Number(getGraphValue(item, utilization.usedKey)) || 0) : 0;
                const total = utilization ? Math.max(0, Number(getGraphValue(item, utilization.totalKey)) || 0) : 0;
                const configuredRatio = utilization
                    ? Number(getGraphValue(item, utilization.ratioKey))
                    : Number.NaN;
                const ratio = Number.isFinite(configuredRatio) && configuredRatio >= 0
                    ? configuredRatio
                    : total > 0
                        ? used / total
                        : 0;
                const clampedRatio = Math.max(0, Math.min(1, ratio));
                const health = getRamHealthLevel({ ratio });
                const utilizationColor = health === "danger"
                    ? "#ff7a7a"
                    : health === "warn"
                        ? "#ffc65c"
                        : "#6ee7a8";
                const utilizationFormat = utilization?.valueFormat ?? "number";

                return (
                    <div key={`${identity}-${itemIndex}`} style={WIDGET_STYLES.resourceCard}>
                        <div style={WIDGET_STYLES.resourceCardIdentity}>
                            {section.nameLabel ? (
                                <div data-dashboard-theme-role="data-heading" style={WIDGET_STYLES.resourceCardNameLabel}>{section.nameLabel}</div>
                            ) : null}
                            {editingName ? (
                                <input
                                    autoFocus
                                    aria-label={`Rename ${name}`}
                                    title="Press Enter or click away to rename; Escape cancels"
                                    style={{
                                        ...WIDGET_STYLES.input,
                                        width: "100%",
                                        boxSizing: "border-box",
                                        color: WIDGET_STYLES.resourceCardName.color,
                                        fontSize: WIDGET_STYLES.resourceCardName.fontSize,
                                        fontWeight: WIDGET_STYLES.resourceCardName.fontWeight,
                                    }}
                                    type="text"
                                    value={draftName}
                                    onFocus={() => setDashboardOptionsInputFocusState(true)}
                                    onChange={(event) => setDraftName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") event.currentTarget.blur();
                                        if (event.key === "Escape") {
                                            cancelRenameRef.current = true;
                                            event.currentTarget.blur();
                                        }
                                    }}
                                    onBlur={() => finishNameEdit(identity, name)}
                                />
                            ) : nameEdit ? (
                                <button
                                    type="button"
                                    data-dashboard-theme-role="data-value"
                                    title={nameEdit.title ?? "Click to rename"}
                                    style={{
                                        ...WIDGET_STYLES.resourceCardName,
                                        display: "block",
                                        width: "100%",
                                        padding: 0,
                                        border: 0,
                                        borderBottom: "1px dotted rgba(108, 180, 255, 0.45)",
                                        background: "transparent",
                                        textAlign: "left",
                                        cursor: "text",
                                    }}
                                    onClick={() => beginNameEdit(identity, name)}
                                >
                                    {name}
                                </button>
                            ) : (
                                <div data-dashboard-theme-role="data-value" style={WIDGET_STYLES.resourceCardName}>{name}</div>
                            )}
                            {itemAction ? (
                                <button
                                    type="button"
                                    title={itemAction.title ?? "Run"}
                                    disabled={typeof itemAction.disabledKey === "string"
                                        && !getGraphValue(item, itemAction.disabledKey)}
                                    style={{
                                        ...WIDGET_STYLES.actionButton,
                                        ...(typeof itemAction.disabledKey === "string" && !getGraphValue(item, itemAction.disabledKey)
                                            ? WIDGET_STYLES.actionButtonDisabled
                                            : {}),
                                        marginTop: "4px",
                                    }}
                                    onClick={() => runItemAction(identity)}
                                >
                                    {itemAction.title ?? "Run"}
                                </button>
                            ) : null}
                        </div>
                        <div style={WIDGET_STYLES.resourceCardBody}>
                            {metrics.length > 0 ? (
                                <div style={WIDGET_STYLES.resourceMetricGrid}>
                                    {metrics.map((metric) => (
                                        <div key={metric.key}>
                                            <div data-dashboard-theme-role="data-heading" style={WIDGET_STYLES.resourceMetricLabel}>{metric.label}</div>
                                            <div data-dashboard-theme-role="data-value" style={WIDGET_STYLES.resourceMetricValue}>
                                                {formatResourceCardValue(getGraphValue(item, metric.key), metric.format)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            {utilization ? (
                                <>
                                    <div style={WIDGET_STYLES.utilizationHeader}>
                                        <span data-dashboard-theme-role="data-heading">{utilization.label ?? "Utilization"}</span>
                                        <span data-dashboard-theme-role="data-value" style={{ color: utilizationColor, fontVariantNumeric: "tabular-nums" }}>
                                            {formatResourceCardValue(used, utilizationFormat)}
                                            {" / "}
                                            {formatResourceCardValue(total, utilizationFormat)}
                                            {" · "}
                                            {formatUtilizationPercent(ratio)}
                                        </span>
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-label={`${name} ${utilization.label ?? "utilization"}`}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                        aria-valuenow={Math.min(100, ratio * 100)}
                                        style={WIDGET_STYLES.utilizationTrack}
                                    >
                                        <div
                                            style={{
                                                ...WIDGET_STYLES.utilizationFill,
                                                width: `${clampedRatio * 100}%`,
                                                minWidth: ratio > 0 ? "2px" : 0,
                                                background: utilizationColor,
                                            }}
                                        />
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function formatCompactDashboardValue(value, format = "number") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "n/a";

    const absolute = Math.abs(numeric);
    const units = [
        { threshold: 1e15, suffix: "q" },
        { threshold: 1e12, suffix: "t" },
        { threshold: 1e9, suffix: "b" },
        { threshold: 1e6, suffix: "m" },
        { threshold: 1e3, suffix: "k" },
    ];
    const unit = units.find((candidate) => absolute >= candidate.threshold);
    const scaled = unit ? numeric / unit.threshold : numeric;
    const scaledAbsolute = Math.abs(scaled);
    const digits = scaledAbsolute >= 100 ? 0 : scaledAbsolute >= 10 ? 1 : 2;
    const formatted = scaled.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
    const compact = `${formatted}${unit?.suffix ?? ""}`;

    if (format === "money") {
        return numeric < 0 ? `-$${compact.slice(1)}` : `$${compact}`;
    }
    if (format === "percent") return `${compact}%`;
    return compact;
}

function formatGraphXValue(value, format = "number") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "n/a";
    if (format === "time" || format === "dateTime") {
        const date = new Date(numeric);
        if (!Number.isFinite(date.getTime())) return "n/a";
        if (format === "dateTime") {
            return date.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return formatCompactDashboardValue(numeric);
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

function formatDashboardHudValue(value, format) {
    if (format === "compactMoney") return formatCompactDashboardValue(Number(value) || 0, "money");
    if (format === "compactNumber") return formatCompactDashboardValue(Number(value) || 0);
    if (format === "money") return formatMoney(Number(value) || 0);
    if (format === "number") return (Number(value) || 0).toLocaleString();
    if (format === "time") return Number(value) > 0 ? new Date(Number(value)).toLocaleTimeString() : "n/a";
    return String(value ?? "n/a");
}

function isDashboardHudEntryVisible(service, entry, options = {}) {
    const optionKey = typeof entry?.visibleOptionKey === "string" ? entry.visibleOptionKey : "";
    if (!optionKey) return true;
    const optionDefinition = service?.pluginMetadata?.options?.[optionKey];
    const fallback = optionDefinition && typeof optionDefinition === "object"
        ? optionDefinition.default
        : true;
    const currentValue = options?.[optionKey] ?? fallback;
    if (Object.prototype.hasOwnProperty.call(entry, "visibleOptionValue")) {
        return String(currentValue) === String(entry.visibleOptionValue);
    }
    return Boolean(currentValue);
}

function buildDashboardHudDefinition(services, telemetryByServiceId, options = {}) {
    const definitions = [];
    for (const service of Array.isArray(services) ? services : []) {
        const hud = service?.pluginMetadata?.hud;
        if (!hud || typeof hud !== "object" || !Array.isArray(hud.groups)) continue;
        const telemetry = telemetryByServiceId?.[service.id];
        const groups = hud.groups.filter((group) => isDashboardHudEntryVisible(service, group, options)).map((group) => ({
            id: `${service.id}:${String(group?.id ?? "group")}`,
            sourceId: String(group?.id ?? "group"),
            title: String(group?.title ?? service.menuLabel ?? "Status"),
            items: (Array.isArray(group?.items) ? group.items : []).map((item) => {
                const value = getDashboardViewValue(telemetry, item?.key);
                if (value === undefined || value === null) return null;
                if (item?.hideWhenZero && Number(value) === 0) return null;
                const hideBelowAbs = Number(item?.hideBelowAbs);
                if (Number.isFinite(hideBelowAbs) && Math.abs(Number(value)) < hideBelowAbs) return null;
                return {
                    id: `${service.id}:${String(group?.id ?? "group")}:${String(item?.key ?? item?.label ?? "item")}`,
                    label: String(item?.label ?? item?.key ?? "Value"),
                    value: formatDashboardHudValue(value, item?.format),
                    tone: String(item?.tone ?? "neutral"),
                    themeColor: String(item?.themeColor ?? ""),
                    progress: typeof item?.progressKey === "string"
                        ? Number(getDashboardViewValue(telemetry, item.progressKey))
                        : null,
                    progressText: typeof item?.progressCurrentKey === "string" && typeof item?.progressMaximumKey === "string"
                        ? `${formatDashboardHudValue(getDashboardViewValue(telemetry, item.progressCurrentKey), item.progressFormat)} / ${formatDashboardHudValue(getDashboardViewValue(telemetry, item.progressMaximumKey), item.progressFormat)}${String(item.progressSuffix ?? "")}`
                        : typeof item?.progressTextKey === "string"
                            ? String(getDashboardViewValue(telemetry, item.progressTextKey) ?? "")
                            : "",
                };
            }).filter(Boolean),
        })).filter((group) => group.items.length > 0);
        definitions.push({
            serviceId: service.id,
            title: String(hud.title ?? service.menuLabel ?? "Player"),
            generatedAt: Number(getDashboardViewValue(telemetry, hud.updatedAtKey)) || 0,
            groups,
        });
    }
    return definitions;
}

function DashboardWindowModeButton({ layoutSnapshot, controlStyle = null }) {
    const maximized = Boolean(layoutSnapshot?.maximized);
    const nextMode = maximized ? DASHBOARD_WINDOW_MODE_WINDOWED : DASHBOARD_WINDOW_MODE_MAXIMIZED;
    const changeWindowMode = () => enqueueDashboardAction({ kind: "window-mode", mode: nextMode });
    return (
        <button
            type="button"
            data-network-control="true"
            title={maximized ? "Restore the dashboard to its saved window size" : "Maximize the dashboard inside the Bitburner window"}
            style={getDashboardFrameControlStyle("neutral", controlStyle)}
            onMouseDown={(event) => runDashboardFrameControlMouseDown(event, changeWindowMode)}
            onClick={(event) => runDashboardFrameControlClick(event, changeWindowMode)}
        >
            {maximized ? DASHBOARD_FRAME_CONTROL_LABELS.restore : DASHBOARD_FRAME_CONTROL_LABELS.maximize}
        </button>
    );
}

// Only ever rendered while maximized (see call sites) - minimizing from windowed mode already has
// the tail's own native chrome close by, uncluttered; maximized mode's hero row is where a
// same-looking neighboring RESTORE/CLOSE pair made it easy to hit the wrong one reaching for this.
function DashboardMinimizeButton({ controlStyle = null }) {
    const minimizeTail = () => enqueueDashboardAction({ kind: "minimize-tail" });
    return (
        <button
            type="button"
            data-network-control="true"
            title="Minimize the dashboard"
            style={getDashboardFrameControlStyle("neutral", controlStyle)}
            onMouseDown={(event) => runDashboardFrameControlMouseDown(event, minimizeTail)}
            onClick={(event) => runDashboardFrameControlClick(event, minimizeTail)}
        >
            {DASHBOARD_FRAME_CONTROL_LABELS.minimize}
        </button>
    );
}

function getDashboardResponsiveLayout(layoutSnapshot) {
    const tier = String(layoutSnapshot?.layoutTier ?? "compact");
    if (tier === "wide") {
        return {
            workspaceColumns: "320px 420px minmax(620px, 1fr)",
            navigationColumn: "320px",
            statMinimumWidth: 180,
        };
    }
    if (tier === "standard") {
        return {
            workspaceColumns: "280px 360px minmax(520px, 1fr)",
            navigationColumn: "280px",
            statMinimumWidth: 160,
        };
    }
    return {
        workspaceColumns: "minmax(220px, 0.85fr) minmax(280px, 1fr) minmax(480px, 2.2fr)",
        navigationColumn: "minmax(220px, 0.85fr)",
        statMinimumWidth: 138,
    };
}

function DashboardWidget({ persistedOptions, gameTheme, gameStyles, homeScripts, homeRamStatus, runningScriptCount, runningProcessSnapshot, telemetryByServiceId, pluginRequirements, fileManagerSnapshots, scriptLogSnapshots, layoutSnapshot, autostartPaused }) {
    const [uiState, setUiState] = React.useState(loadUiState);
    const [options, setOptions] = React.useState(() => persistedOptions ?? getDefaultOptions());
    const gameThemeSignature = getGameThemeSignature(gameTheme);
    const gameStylesSignature = getGameStylesSignature(gameStyles);
    const dashboardLayout = layoutSnapshot ?? buildDashboardLayoutSnapshot({
        mode: DASHBOARD_WINDOW_MODE_WINDOWED,
        geometry: { x: 0, y: 0, width: TAIL_WIDTH, height: TAIL_HEIGHT },
        viewport: { width: TAIL_WIDTH, height: TAIL_HEIGHT },
    });
    const dashboardTheme = React.useMemo(
        () => buildDashboardTheme(options.dashboardThemeMode, gameTheme, {
            gameStyles,
            textSizeMode: options.dashboardTextSizeMode,
            maximized: dashboardLayout.maximized,
        }),
        [options.dashboardThemeMode, options.dashboardTextSizeMode, gameThemeSignature, gameStylesSignature, dashboardLayout.maximized]
    );
    activeDashboardTheme = dashboardTheme;
    configureDashboardRenderers();
    const responsiveLayout = getDashboardResponsiveLayout(dashboardLayout);
    const normalContentBounds = dashboardLayout.layoutTier === "wide"
        ? { width: "100%", maxWidth: "2800px", alignSelf: "center" }
        : {};
    const windowControl = <DashboardWindowModeButton layoutSnapshot={dashboardLayout} />;
    // Only offered while maximized - see DashboardMinimizeButton's own comment for why.
    const minimizeControl = dashboardLayout.maximized ? <DashboardMinimizeButton /> : null;
    const systemOverviewCompactControls = !dashboardLayout.maximized;
    const systemOverviewControlStyle = systemOverviewCompactControls
        ? { height: "20px", minHeight: "20px", padding: "3px 7px", fontSize: "10px" }
        : null;
    const systemOverviewWindowControl = <DashboardWindowModeButton layoutSnapshot={dashboardLayout} controlStyle={systemOverviewControlStyle} />;
    const systemOverviewCloseControl = <button
        type="button"
        title="Close System Overview and return to dashboard controls"
        style={getDashboardFrameControlStyle("neutral", systemOverviewControlStyle)}
        onMouseDown={(event) => runDashboardFrameControlMouseDown(event, () => setActiveView(""))}
        onClick={(event) => runDashboardFrameControlClick(event, () => setActiveView(""))}
    >
        {DASHBOARD_FRAME_CONTROL_LABELS.close}
    </button>;
    const systemOverviewMinimizeControl = dashboardLayout.maximized
        ? <DashboardMinimizeButton controlStyle={systemOverviewControlStyle} />
        : null;
    const networkMapControlStyle = systemOverviewControlStyle
        ? { ...systemOverviewControlStyle, position: "static" }
        : { position: "static" };
    const networkMapWindowControl = <DashboardWindowModeButton layoutSnapshot={dashboardLayout} controlStyle={networkMapControlStyle} />;
    const networkMapCloseControl = <button
        type="button"
        data-network-control="true"
        title="Return to the dashboard"
        style={getDashboardFrameControlStyle("neutral", networkMapControlStyle)}
        onMouseDown={(event) => runDashboardFrameControlMouseDown(event, () => setActiveView(""))}
        onClick={(event) => runDashboardFrameControlClick(event, () => setActiveView(""))}
    >
        {DASHBOARD_FRAME_CONTROL_LABELS.close}
    </button>;
    const networkMapMinimizeControl = dashboardLayout.maximized
        ? <DashboardMinimizeButton controlStyle={networkMapControlStyle} />
        : null;
    const [pressedActionButtonId, setPressedActionButtonId] = React.useState("");
    // Result of the most recent "clipboard" action. Doubles as the failure path: when the browser
    // refuses writeText() the raw command is shown here so it can still be selected by hand.
    const [copyNotice, setCopyNotice] = React.useState("");
    const [killAllPending, setKillAllPending] = React.useState(false);
    const killAllSnapshotRef = React.useRef(null);
    React.useEffect(() => {
        if (killAllPending && runningProcessSnapshot !== killAllSnapshotRef.current) {
            setKillAllPending(false);
        }
    }, [runningProcessSnapshot]);
    const optionsDirtyRef = React.useRef(false);
    const optionsInputFocusedRef = React.useRef(false);
    const optionsFocusReleaseTimerRef = React.useRef(null);
    const autoSyncTimerRef = React.useRef(null);
    const pendingSavedOptionsRef = React.useRef(null);
    const lastAutoSyncedOptionsRef = React.useRef(normalizeDashboardOptionsForCompare(persistedOptions ?? getDefaultOptions()));
    const leftColumnRef = React.useRef(null);
    const centerColumnRef = React.useRef(null);
    const rightColumnRef = React.useRef(null);
    const playerStatsColumnRef = React.useRef(null);
    const systemOverviewRef = React.useRef(null);
    const startOrderSelectedRowRef = React.useRef(null);
    const dashboardViews = getDashboardViewRegistry().views;
    const serviceMenuGroups = getMenuGroups(options, pluginRequirements);
    const hideUnqualifiedPluginsMode = normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode);
    const menuGroups = serviceMenuGroups.map((group) => ({
        ...group,
        items: sortDashboardMenuItems([
            ...dashboardViews
                .filter((view) => view.menuGroup === group.id)
                .filter((view) => isServiceVisibleInMenu(view.id, options))
                .filter((view) => isViewQualified(view, pluginRequirements, hideUnqualifiedPluginsMode))
                .map((view) => ({
                    id: `${DASHBOARD_VIEW_ITEM_PREFIX}${view.id}`,
                    label: view.menuLabel,
                    menuOrder: view.menuOrder,
                    alwaysVisible: true,
                    dashboardViewId: view.id,
                })),
            ...group.items,
        ]),
    }));
    const scriptBuckets = React.useMemo(
        () => buildScriptBuckets(homeScripts, options.hiddenScriptFolders, options.hiddenScriptFiles, dashboardViews),
        [homeScripts, options.hiddenScriptFolders, options.hiddenScriptFiles, dashboardViews]
    );
    const nonPluginScripts = scriptBuckets.nonPluginScripts;
    const integrationScripts = scriptBuckets.integrationScripts;
    const pluginScripts = scriptBuckets.pluginScripts;
    const dashboardCoreScripts = scriptBuckets.dashboardCoreScripts;

    const rememberScroll = (columnId, value) => {
        const previous = globalThis[DASHBOARD_SCROLL_STATE_KEY];
        const currentState = previous && typeof previous === "object" ? previous : {};
        globalThis[DASHBOARD_SCROLL_STATE_KEY] = {
            ...currentState,
            [columnId]: Number.isFinite(value) ? Math.max(0, value) : 0,
        };
    };

    React.useLayoutEffect(() => {
        const saved = globalThis[DASHBOARD_SCROLL_STATE_KEY];
        if (!saved || typeof saved !== "object") return;

        const apply = (ref, key) => {
            if (!ref.current) return;
            const value = saved[key];
            if (!Number.isFinite(value)) return;
            ref.current.scrollTop = value;
        };

        apply(leftColumnRef, "left");
        apply(centerColumnRef, "center");
        apply(rightColumnRef, "right");
        apply(playerStatsColumnRef, "playerStats");
        apply(systemOverviewRef, "systemOverview");
    });

    React.useEffect(() => {
        saveUiState(uiState);
    }, [uiState]);

    React.useEffect(() => {
        return () => {
            if (optionsFocusReleaseTimerRef.current) {
                clearTimeout(optionsFocusReleaseTimerRef.current);
                optionsFocusReleaseTimerRef.current = null;
            }
            optionsInputFocusedRef.current = false;
            setDashboardOptionsInputFocusState(false);
        };
    }, []);

    const setOptionsInputFocus = (focused) => {
        if (focused) {
            if (optionsFocusReleaseTimerRef.current) {
                clearTimeout(optionsFocusReleaseTimerRef.current);
                optionsFocusReleaseTimerRef.current = null;
            }
            optionsInputFocusedRef.current = true;
            setDashboardOptionsInputFocusState(true);
            return;
        }

        if (optionsFocusReleaseTimerRef.current) {
            clearTimeout(optionsFocusReleaseTimerRef.current);
            optionsFocusReleaseTimerRef.current = null;
        }

        // Delay release slightly to avoid blur/focus handoff causing redraw flicker.
        optionsFocusReleaseTimerRef.current = setTimeout(() => {
            optionsInputFocusedRef.current = false;
            setDashboardOptionsInputFocusState(false);
            optionsFocusReleaseTimerRef.current = null;
        }, 120);
    };

    React.useEffect(() => {
        const incomingOptions = persistedOptions ?? getDefaultOptions();
        setOptions((currentOptions) => {
            // Avoid clobbering active edits while any option control is focused.
            if (optionsInputFocusedRef.current) return currentOptions;
            if (optionsDirtyRef.current) {
                // A save was just enqueued (250ms debounce below) but the main-loop action queue
                // hasn't necessarily written it to disk by the time this fires - persistedOptions
                // is re-read from disk on every tick, so it can still be reporting the pre-save
                // content for a few ticks after the debounce timer clears. Only accept this read,
                // and only then clear dirty, once it actually matches what was saved; otherwise
                // keep waiting rather than clobbering the just-made change back to its old value.
                // Confirmed real: a toggle/threshold visibly reverting seconds after being set,
                // and once, a min-funds gate reading its old value long enough for gang equipment
                // to be purchased under it.
                if (!pendingSavedOptionsRef.current || !areDashboardOptionsEqual(incomingOptions, pendingSavedOptionsRef.current)) {
                    return currentOptions;
                }
                optionsDirtyRef.current = false;
                pendingSavedOptionsRef.current = null;
            }
            lastAutoSyncedOptionsRef.current = normalizeDashboardOptionsForCompare(incomingOptions);
            return areDashboardOptionsEqual(currentOptions, incomingOptions) ? currentOptions : incomingOptions;
        });
    }, [persistedOptions]);

    React.useEffect(() => {
        const normalizedCurrent = normalizeDashboardOptionsForCompare(options);
        const normalizedLast = lastAutoSyncedOptionsRef.current;
        if (areDashboardOptionsEqual(normalizedCurrent, normalizedLast)) return;

        if (autoSyncTimerRef.current) {
            clearTimeout(autoSyncTimerRef.current);
            autoSyncTimerRef.current = null;
        }

        autoSyncTimerRef.current = setTimeout(() => {
            const previousOptions = lastAutoSyncedOptionsRef.current;
            const currentOptions = normalizeDashboardOptionsForCompare(options);

            enqueueDashboardAction({
                kind: "save-options",
                options: { ...currentOptions },
            });

            const runningFilenames = new Set(homeScripts.filter((script) => script?.running).map((script) => script.filename));
            for (const service of getDashboardServiceRegistry().services) {
                const integration = service.pluginMetadata;
                if (!integration || Object.keys(integration.options ?? {}).length === 0) continue;
                const previousPluginOptions = normalizePluginIntegrationOptions(integration, previousOptions);
                const currentPluginOptions = normalizePluginIntegrationOptions(integration, currentOptions);
                const changed = Object.keys(currentPluginOptions).some((key) => previousPluginOptions[key] !== currentPluginOptions[key]);
                const running = isIntegrationScriptRunning(integration, runningFilenames);
                if (!changed) continue;

                if (running) {
                    enqueueDashboardAction({
                        kind: "plugin-options",
                        serviceId: integration.serviceId,
                        options: { ...currentOptions },
                    });
                    continue;
                }

                if (shouldStartPluginIntegrationAfterOptionChange(integration, previousOptions, currentOptions)) {
                    enqueueDashboardAction({
                        kind: "script",
                        actionId: SCRIPT_ACTION_IDS.START,
                        filename: integration.scriptPath,
                    });
                }
            }

            lastAutoSyncedOptionsRef.current = currentOptions;
            // Left dirty until the [persistedOptions] effect above confirms this exact snapshot
            // has actually round-tripped through disk - see that effect for why clearing it here
            // unconditionally used to let a stale disk read win the race and revert this save.
            pendingSavedOptionsRef.current = currentOptions;
            autoSyncTimerRef.current = null;
        }, 250);

        return () => {
            if (autoSyncTimerRef.current) {
                clearTimeout(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
        };
    }, [options, homeScripts]);

    const selectedItem = uiState.selectedItem;
    const activeView = getDashboardViewRegistry().byId.get(uiState.activeViewId) ?? null;
    const dashboardServiceRegistry = getDashboardServiceRegistry();
    const activeViewTelemetry = activeView
        ? applyDashboardViewTelemetry(
            telemetryByServiceId?.[activeView?.data?.serviceId] ?? null,
            activeView,
            telemetryByServiceId
        )
        : null;
    const playerHudDefinitions = buildDashboardHudDefinition(dashboardServiceRegistry.services, telemetryByServiceId, options);
    const playerStatsEnabled = isServiceVisibleInMenu("system.playerStatus", options);
    const pluginDashboardOptionInputs = buildPluginDashboardOptionInputs(dashboardServiceRegistry.services, options);
    const workspaceColumns = responsiveLayout.workspaceColumns;
    const setActiveView = (viewId) => {
        setUiState((current) => {
            const next = { ...current, activeViewId: String(viewId ?? "") };
            saveUiState(next);
            return next;
        });
    };
    const selectedService = getServiceById(selectedItem);
    const updateGroup = (groupId) => {
        setUiState((current) => ({
            ...current,
            expandedGroups: {
                ...current.expandedGroups,
                [groupId]: !current.expandedGroups[groupId]
            }
        }));
    };

    const selectItem = (itemId) => {
        const shortcut = getDashboardShortcutById(itemId);
        if (shortcut) {
            enqueueDashboardAction({
                kind: "script",
                actionId: SCRIPT_ACTION_IDS.RESTART,
                filename: shortcut.scriptPath,
            });
            return;
        }
        if (itemId.startsWith(DASHBOARD_VIEW_ITEM_PREFIX)) {
            setActiveView(itemId.slice(DASHBOARD_VIEW_ITEM_PREFIX.length));
            return;
        }
        const workspaceService = dashboardServiceRegistry.byId.get(itemId);
        if (workspaceService?.pluginAdapter === "workspace"
            && workspaceService.pluginFile
            && !homeScripts.some((script) => script?.filename === workspaceService.pluginFile && script?.running)) {
            enqueueDashboardAction({
                kind: "script",
                actionId: SCRIPT_ACTION_IDS.START,
                filename: workspaceService.pluginFile,
            });
        }
        setUiState((current) => {
            const next = { ...current, activeViewId: "", selectedItem: itemId };
            saveUiState(next);
            return next;
        });
    };

    const selectMenuItem = (event, itemId) => {
        runDashboardFrameControlMouseDown(event, () => selectItem(itemId));
    };

    const selectMenuItemFromKeyboard = (event, itemId) => {
        runDashboardFrameControlClick(event, () => selectItem(itemId));
    };

    const centerPanelSource = selectedItem === "global.options"
        ? nonPluginScripts
        : selectedItem === "global.integrations"
            ? integrationScripts
            : selectedItem === "global.plugins"
                ? pluginScripts
                : homeScripts;

    const serviceCenterPanels = getCenterPanelsForItem(selectedItem, centerPanelSource);
    const isPluginService = Boolean(selectedService?.pluginFile);
    const centerPanels = isPluginService && !serviceCenterPanels.some((panel) => panel.id === "options")
        ? [...serviceCenterPanels, { id: "options", label: "Options" }]
        : serviceCenterPanels;
    const savedCenterPanel = uiState.centerPanels?.[selectedItem];
    const defaultCenterPanel = centerPanels.some((panel) => panel.id === selectedService?.defaultPanelId)
        ? selectedService.defaultPanelId
        : centerPanels[0]?.id;
    const selectedCenterPanel = resolveSelectedCenterPanel({
        selectedItem,
        centerPanels,
        savedCenterPanel,
        defaultCenterPanel,
    });

    const serviceContext = {
        autostartPaused,
        telemetryByServiceId,
        pluginRequirements,
        selectedCenterPanel,
        selectedItem,
        homeScripts,
        homeRamStatus,
        options,
        pluginDashboardOptionInputs,
        services: dashboardServiceRegistry.services,
        views: dashboardViews,
    };

    const getPanelMeta = (panelId, fallbackMeta) => getServicePanelMeta(selectedService, panelId, fallbackMeta);
    const getStateLines = (overrides = {}) => getServiceState(selectedService, { ...serviceContext, ...overrides });
    const getSections = (overrides = {}) => getServiceSections(selectedService, { ...serviceContext, ...overrides });
    const getInputs = (overrides = {}) => getServiceInputs(selectedService, { ...serviceContext, ...overrides });
    const serviceActions = getServiceActions(selectedService, serviceContext);
    const pluginScript = selectedService?.pluginFile
        ? homeScripts.find((script) => script?.filename === selectedService.pluginFile)
        : null;
    const autostartAction = buildServiceAutostartAction(selectedService, options);
    const standardScriptActions = [
        ...(pluginScript ? buildScriptActions(pluginScript, { includeDisabledStates: true }) : []),
        ...(autostartAction ? [autostartAction] : []),
    ];
    const panelActions = isPluginService
        ? serviceActions.filter((action) => action.kind !== "script")
        : serviceActions;
    const serviceHealthById = Object.fromEntries(
        dashboardServiceRegistry.services.map((service) => [service.id, getServiceHealth(service, serviceContext)])
    );
    const serviceRuntimeById = Object.fromEntries(
        dashboardServiceRegistry.services.map((service) => [service.id, {
            serviceId: service.id,
            label: service.menuLabel,
            requiresRuntime: Boolean(service.pluginFile),
            running: !service.pluginFile || homeScripts.some((script) => script?.filename === service.pluginFile && script?.running),
        }])
    );
    const workspaceWidgets = selectDashboardWorkspaceWidgets(
        dashboardServiceRegistry.services,
        selectedService,
        selectedItem,
        activeView
    );
    const visibleWorkspaceWidgets = workspaceWidgets.filter((widget) => widget.type !== "player-stats" || playerStatsEnabled);
    const selectedWorkspaceService = selectedService?.pluginAdapter === "workspace" ? selectedService : null;
    const selectedWorkspaceProviderId = selectedWorkspaceService
        ? String(selectedWorkspaceService.workspaceId || selectedWorkspaceService.pluginMetadata?.workspaceId || selectedWorkspaceService.id)
        : "";
    const workspaceGridColumns = selectedWorkspaceService
        ? visibleWorkspaceWidgets.length > 0
            ? `${responsiveLayout.navigationColumn} minmax(0, 1fr) ${PLAYER_STATS_WIDGET_WIDTH}px`
            : `${responsiveLayout.navigationColumn} minmax(0, 1fr)`
        : workspaceColumns;
    const selectedServiceHealth = serviceHealthById[selectedItem] ?? { level: "neutral", panels: {}, summary: "", panelSummaries: {} };
    const healthFilter = HEALTH_FILTER_MODES.has(uiState.healthFilter) ? uiState.healthFilter : "all";
    const menuUnlockGlyphsEnabled = options.menuUnlockGlyphsEnabled !== false;
    const menuUnlockGlyphMaxCount = normalizeMenuUnlockGlyphMaxCount(options.menuUnlockGlyphMaxCount);
    const menuUnlockGlyphOpacity = normalizeMenuUnlockGlyphOpacity(options.menuUnlockGlyphOpacity);
    const menuUnlockGlyphScope = normalizeMenuUnlockGlyphScope(options.menuUnlockGlyphScope);
    const showMainMenuUnlockGlyphs = menuUnlockGlyphsEnabled
        && menuUnlockGlyphScope !== MENU_UNLOCK_GLYPH_SCOPE_SUBMENUS;
    const showSubmenuUnlockGlyphs = menuUnlockGlyphsEnabled
        && menuUnlockGlyphScope !== MENU_UNLOCK_GLYPH_SCOPE_MAIN;
    const healthCounts = dashboardServiceRegistry.services.reduce((counts, service) => {
        const level = serviceHealthById[service.id]?.level ?? "neutral";
        if (level === "danger") counts.danger += 1;
        else if (level === "warn") counts.warn += 1;
        else counts.healthy += 1;
        return counts;
    }, { danger: 0, warn: 0, healthy: 0 });
    const healthServiceBuckets = dashboardServiceRegistry.services.reduce((buckets, service) => {
        const level = serviceHealthById[service.id]?.level ?? "neutral";
        const label = service.menuLabel;
        if (level === "danger") buckets.danger.push(label);
        else if (level === "warn") buckets.warn.push(label);
        else buckets.healthy.push(label);
        return buckets;
    }, { danger: [], warn: [], healthy: [] });

    const matchesHealthFilter = (level) => {
        if (healthFilter === "danger") return level === "danger";
        if (healthFilter === "warn") return level === "warn" || level === "danger";
        return true;
    };

    const getCounterFilterMode = (counterId) => {
        if (counterId === "danger") return "danger";
        if (counterId === "warn") return "warn";
        return "all";
    };

    const getCounterTooltip = (counterId) => {
        const services = healthServiceBuckets[counterId] ?? [];
        const heading = counterId === "danger"
            ? "Danger services"
            : counterId === "warn"
                ? "Warn services"
                : "Healthy services";
        const shortcut = counterId === "danger"
            ? "Click to show only danger services"
            : counterId === "warn"
                ? "Click to show warn and danger services"
                : "Click to show all services";
        const listed = services.length > 0 ? services.join("\n") : "(none)";
        return `${heading}:\n${listed}\n\n${shortcut}`;
    };

    const setHealthFilter = (mode) => {
        setUiState((current) => ({ ...current, healthFilter: mode }));
    };

    const getFilterTooltip = (mode) => {
        if (mode === "danger") return "Show only services with danger-level alerts.";
        if (mode === "warn") return "Show services with warn or danger alerts.";
        return "Show all services regardless of health level.";
    };

    const filteredMenuGroups = menuGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.dashboardViewId || item.alwaysVisible || matchesHealthFilter(serviceHealthById[item.id]?.level ?? "neutral")),
        }))
        .filter((group) => group.items.length > 0);

    const visibleItemIds = filteredMenuGroups.flatMap((group) => group.items
        .filter((item) => !item.dashboardViewId && !item.shortcut)
        .map((item) => item.id));

    React.useEffect(() => {
        if (visibleItemIds.length === 0) return;
        if (visibleItemIds.includes(selectedItem)) return;

        setUiState((current) => ({
            ...current,
            selectedItem: visibleItemIds[0],
        }));
    }, [selectedItem, visibleItemIds.join("|")]);

    const getHealthStyle = (level) => {
        if (level === "danger") {
            return {
                borderColor: "rgba(255, 122, 122, 0.52)",
                color: "#ffd0d0",
                background: "rgba(34, 10, 10, 0.95)",
            };
        }
        if (level === "warn") {
            return {
                borderColor: "rgba(255, 198, 92, 0.45)",
                color: "#ffe1a6",
                background: "rgba(34, 22, 10, 0.95)",
            };
        }
        return {};
    };

    const getActiveHealthStyle = (level) => {
        if (level === "danger") return WIDGET_STYLES.menuItemButtonActiveDanger;
        if (level === "warn") return WIDGET_STYLES.menuItemButtonActiveWarn;
        return WIDGET_STYLES.menuItemButtonActive;
    };

    const renderHealthBadge = (level) => {
        if (level !== "warn" && level !== "danger") return null;
        return (
            <span style={{ flex: "0 0 auto", marginLeft: "6px", color: level === "danger" ? "#ff9a9a" : "#ffd88a" }}>
                {level === "danger" ? "!!" : "!"}
            </span>
        );
    };

    const renderMenuRequirementBadges = (badges) => (
        (Array.isArray(badges) ? badges : []).map((badge) => (
            <span
                key={badge.id}
                title={badge.title}
                aria-label={badge.title}
                style={{
                    minWidth: "8px",
                    color: badge.color,
                    fontSize: "10px",
                    fontWeight: 900,
                    lineHeight: 1,
                    opacity: menuUnlockGlyphOpacity,
                    textAlign: "center",
                }}
            >
                {badge.symbol}
            </span>
        ))
    );

    const getHealthSummaryTone = (level) => {
        if (level === "danger") return "#ffb0b0";
        if (level === "warn") return "#ffd88a";
        if (level === "info") return "#c8e0ff";
        return "#9ab0cc";
    };

    const getServiceItemTooltip = (itemId) => {
        const shortcut = getDashboardShortcutById(itemId);
        if (shortcut) {
            const description = shortcut.description ? `\n${shortcut.description}` : "";
            return `Launch ${shortcut.menuLabel}.${description}`;
        }
        if (itemId.startsWith(DASHBOARD_VIEW_ITEM_PREFIX)) {
            const view = getDashboardViewRegistry().byId.get(itemId.slice(DASHBOARD_VIEW_ITEM_PREFIX.length));
            return `Open ${view?.title ?? view?.menuLabel ?? "the graphical dashboard view"}.`;
        }
        const service = getServiceById(itemId);
        if (!service) return "Service details unavailable.";
        const health = serviceHealthById[itemId] ?? { level: "neutral", summary: "" };
        const summary = health.summary || "No health warnings.";
        return `${service.menuLabel}\nLevel: ${health.level}\n${summary}`;
    };

    const getPanelTooltip = (panel) => {
        if (isGlobalListMenuItem(selectedItem)) {
            if (panel.viewOnly) return `${panel.label}\nFramework view (no backing script)`;
            const status = panel.running ? "running" : "stopped";
            return `${panel.label}\nLifecycle: ${getScriptLifecycleLabel(panel)}\nStatus: ${status}`;
        }

        const panelLevel = selectedServiceHealth?.panels?.[panel.id] ?? "neutral";
        const summary = selectedServiceHealth?.panelSummaries?.[panel.id] ?? "No specific health message.";
        return `${panel.label}\nLevel: ${panelLevel}\n${summary}`;
    };

    const getActionTooltip = (action) => {
        if (typeof action?.tooltip === "string" && action.tooltip) return action.tooltip;
        if (action.kind === "script") {
            return `${action.label}\nScript: ${action.filename}`;
        }
        if (action.kind === "dashboard") {
            return `${action.label}\nDashboard action: ${action.actionId}`;
        }
        if (action.kind === "save-options") {
            return `Save current dashboard option values to ${DASHBOARD_OPTIONS_FILE}`;
        }
        if (action.kind === "plugin-command") {
            return `Send plugin command: ${action.command ?? "(missing)"}`;
        }
        if (action.kind === "clipboard") {
            return action.text
                ? `Copy to clipboard, then paste into the game terminal:\n${action.text}`
                : `${action.label}\nNothing to copy right now.`;
        }
        return action.label;
    };

    const renderActionLabel = (action) => (
        <>
            {action?.icon ? <span style={{ opacity: 0.9, marginRight: "6px" }}>{action.icon}</span> : null}
            <span>{action.label}</span>
        </>
    );

    const getActionToneStyle = (action) => {
        const tone = normalizeActionTone(action?.tone);
        const baseStyle = ACTION_TONE_STYLES[tone] ?? ACTION_TONE_STYLES.neutral;
        const customStyle = action?.buttonStyle && typeof action.buttonStyle === "object"
            ? action.buttonStyle
            : null;
        return customStyle ? { ...baseStyle, ...customStyle } : baseStyle;
    };

    const getFeatureActionSizeStyle = (action) => {
        if (action?.kind !== "plugin-command" && action?.featureSize !== true) return {};
        return {
            padding: "6px 8px",
            minHeight: "40px",
            minWidth: "180px",
            flex: "1 1 180px",
            textAlign: "center",
        };
    };

    const getScriptLifecycleStyle = (script, selected = false) => {
        const runningStyle = script?.running ? { boxShadow: "inset 3px 0 0 #6ee7a8" } : {};
        if (script?.daemon === true) {
            return {
                borderColor: selected ? "rgba(108, 180, 255, 0.8)" : "rgba(108, 180, 255, 0.45)",
                color: "#c8e0ff",
                background: selected ? "rgba(16, 38, 60, 0.98)" : "rgba(10, 24, 38, 0.95)",
                ...runningStyle,
            };
        }
        if (script?.daemon === false) {
            return {
                borderColor: selected ? "rgba(255, 198, 92, 0.8)" : "rgba(255, 198, 92, 0.45)",
                color: "#ffe1a6",
                background: selected ? "rgba(52, 36, 12, 0.98)" : "rgba(34, 24, 10, 0.95)",
                ...runningStyle,
            };
        }
        return {
            borderColor: selected ? "rgba(150, 160, 170, 0.7)" : "rgba(120, 130, 140, 0.4)",
            color: "#c4cbd2",
            background: selected ? "rgba(30, 34, 38, 0.98)" : "rgba(20, 22, 24, 0.95)",
            ...runningStyle,
        };
    };

    const selectCenterPanel = (panelId) => {
        setUiState((current) => ({
            ...current,
            centerPanels: {
                ...(current.centerPanels ?? {}),
                [selectedItem]: panelId,
            }
        }));
    };

    const runServiceAction = (action) => {
        if (!action) return;
        if (action.kind === "clipboard") {
            // Handled inline, NOT via enqueueDashboardAction: that queue exists to marshal ns.*
            // calls onto the script's own loop, and copying a string touches no ns at all.
            const text = String(action.text ?? "");
            if (!text) return;
            try {
                // No focus pre-check - that would require touching document/window, which
                // DASHBOARD_DESIGN_PRINCIPLES.md's Platform Boundaries forbids outright. If the
                // tail hasn't taken focus yet the promise rejects, and the .catch() below surfaces
                // the raw command so it can still be copied by hand. Same approach as
                // dashboard/renderers/network-map-view.jsx's node-action copy.
                const clipboard = globalThis?.navigator?.clipboard;
                if (clipboard && typeof clipboard.writeText === "function") {
                    void Promise.resolve(clipboard.writeText(text))
                        .then(() => setCopyNotice(`Copied: ${text}`))
                        .catch(() => setCopyNotice(`Clipboard unavailable. Command: ${text}`));
                    return;
                }
            } catch (error) {
                // Fall through to the visible command hint.
            }
            setCopyNotice(`Clipboard unavailable. Command: ${text}`);
            return;
        }
        if (action.kind === "save-options") {
            const optionOverrides = action.optionOverrides && typeof action.optionOverrides === "object"
                ? action.optionOverrides
                : null;
            // Mark dirty (matching updateOptionInput) so the persistedOptions sync effect
            // doesn't clobber this with a stale disk read before the debounced auto-save
            // below has actually written it out - that race is what caused a toggle to look
            // like it instantly reverted right after being clicked.
            optionsDirtyRef.current = true;
            // Update React state directly (same as updateOptionInput does for regular settings
            // fields) instead of only enqueueing a disk write - the existing auto-sync effect
            // already persists any options change, so a toggle button needs to go through the
            // same state update to be reflected immediately instead of only on next remount.
            setOptions((current) => (optionOverrides ? { ...current, ...optionOverrides } : { ...current }));
            return;
        }
        if (action.kind === "plugin-command") {
            if (typeof action.command !== "string" || action.command.length === 0) return;
            if (typeof action.optionKey === "string" && action.optionKey.length > 0) {
                // Same rationale as the save-options branch above: persist the toggle's new value
                // to the options store (not just the live port command) so a full relaunch
                // re-primes the freshly (re)started script with this choice instead of the
                // options file's stale default.
                optionsDirtyRef.current = true;
                setOptions((current) => ({ ...current, [action.optionKey]: action.optionValue }));
            }
            enqueueDashboardAction({
                kind: "plugin-command",
                serviceId: action.serviceId,
                command: action.command,
                ...(Number.isFinite(Number(action.port)) ? { port: Number(action.port) } : {}),
            });
            return;
        }
        if (action.kind === "dashboard") {
            // Kill-All is rendered in more than one place (the frame-control corner button, and
            // the global Kill Controls card below) - route every copy through the same
            // requestGlobalKill() so the double-click guard (killAllPending/killAllSnapshotRef)
            // applies consistently no matter which copy was clicked, instead of only the ones
            // that happen to call requestGlobalKill directly.
            if (action.actionId === DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS) {
                requestGlobalKill();
                return;
            }
            enqueueDashboardAction({
                kind: "dashboard",
                actionId: action.actionId,
                ...(action.payload && typeof action.payload === "object" ? action.payload : {}),
            });
            return;
        }
        if (action.kind === "script") {
            enqueueDashboardAction({
                kind: "script",
                actionId: action.actionId,
                filename: action.filename,
            });
        }
    };

    const renderServiceActions = (actions, layout = "default") => {
        if (!Array.isArray(actions) || actions.length === 0) {
            return null;
        }

        const containerStyle = layout === "feature-row"
            ? { display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "stretch" }
            : WIDGET_STYLES.actionGrid;

        // Only surface the copy result on a panel that actually has a clipboard action, so the
        // notice appears next to the button that produced it rather than on every panel.
        const showCopyNotice = copyNotice && actions.some((action) => action.kind === "clipboard");

        return (
            <div>
            <div style={containerStyle}>
                {actions.map((action) => (
                    <button
                        type="button"
                        key={action.id}
                        title={getActionTooltip(action)}
                        disabled={Boolean(action.disabled)}
                        style={{
                            ...WIDGET_STYLES.actionButton,
                            ...getFeatureActionSizeStyle(action),
                            ...getActionToneStyle(action),
                            ...(pressedActionButtonId === action.id && !action.disabled ? WIDGET_STYLES.actionButtonPressed : {}),
                            ...(action.disabled ? WIDGET_STYLES.actionButtonDisabled : {}),
                        }}
                        onClick={() => {
                            if (action.disabled) return;
                            runServiceAction(action);
                        }}
                        onMouseDown={() => {
                            if (action.disabled) return;
                            setPressedActionButtonId(action.id);
                        }}
                        onMouseUp={() => setPressedActionButtonId("")}
                        onMouseLeave={() => setPressedActionButtonId("")}
                        onBlur={() => setPressedActionButtonId("")}
                    >
                        {renderActionLabel(action)}
                    </button>
                ))}
            </div>
            {showCopyNotice ? (
                <div
                    style={{
                        ...WIDGET_STYLES.smallMuted,
                        marginTop: "8px",
                        color: "#8ef0b5",
                        overflowWrap: "anywhere",
                    }}
                >
                    {copyNotice}
                </div>
            ) : null}
            </div>
        );
    };

    const updateOptionInput = (input, rawValue) => {
        if (!input?.optionKey) return;
        optionsDirtyRef.current = true;
        setOptions((current) => {
            const next = { ...current };

            if (input.type === "boolean-select" || input.type === "checkbox") {
                const normalizedValue = String(rawValue ?? "").trim().toLowerCase();
                next[input.optionKey] = rawValue === true || normalizedValue === "on" || normalizedValue === "true";
                return next;
            }

            if (input.type === "number") {
                const minValue = Number.isFinite(input.min) ? input.min : 0;
                const maxValue = Number.isFinite(input.max) ? input.max : Number.POSITIVE_INFINITY;
                const numericValue = Math.min(maxValue, Math.max(minValue, Number(rawValue) || minValue));
                next[input.optionKey] = numericValue;
                return next;
            }

            next[input.optionKey] = String(rawValue ?? "");
            return next;
        });
    };

    // Bypasses the generic save-options action-button dispatch (runServiceAction) since this
    // isn't a boolean toggle - persists the fully-reconciled current row order directly.
    // Persisting the RECONCILED list (not editing the raw stored string in place) is what makes
    // the saved order self-healing: any id no longer live silently drops out, and any
    // never-before-seen id that had defaulted into a tail position gets baked into the explicit
    // order the moment the user touches any row.
    //
    // Does NOT go through the normal [options, homeScripts] debounced auto-save effect (its
    // 250ms idle-based setTimeout) - that debounce loses outright against ns.printRaw()
    // remounting the whole tree (discarding this component's own pending timers) roughly every
    // DASHBOARD_UI_TICK_MS whenever any other live telemetry changes, which during normal active
    // gameplay is most ticks. A single isolated toggle click usually survives that race by luck;
    // reordering needs several clicks in a row, so the debounce timer kept getting reset by each
    // new click and never got a clear 250ms window to fire before the next remount wiped the
    // still-unsaved change. Enqueueing the save immediately (globalThis-backed queue, unaffected
    // by remounts) sidesteps the race entirely.
    const persistServiceStartOrderNow = (nextIds) => {
        const normalizedNext = normalizeDashboardOptionsForCompare({ ...options, serviceStartOrder: nextIds.join(",") });
        optionsDirtyRef.current = true;
        setOptions((current) => ({ ...current, serviceStartOrder: nextIds.join(",") }));
        if (autoSyncTimerRef.current) {
            clearTimeout(autoSyncTimerRef.current);
            autoSyncTimerRef.current = null;
        }
        enqueueDashboardAction({ kind: "save-options", options: { ...normalizedNext } });
        lastAutoSyncedOptionsRef.current = normalizedNext;
        // Same handoff as the debounced auto-save: leave dirty set until the [persistedOptions]
        // effect confirms this exact snapshot has round-tripped through disk, instead of clearing
        // it immediately and risking a stale disk read reverting the reorder before the save lands.
        pendingSavedOptionsRef.current = normalizedNext;
    };

    const moveServiceInStartOrder = (serviceId, direction) => {
        const currentIds = orderedServiceStartOrderRows.map((row) => row.serviceId);
        const index = currentIds.indexOf(serviceId);
        const swapWith = index + direction;
        if (index < 0 || swapWith < 0 || swapWith >= currentIds.length) return;
        const nextIds = [...currentIds];
        [nextIds[index], nextIds[swapWith]] = [nextIds[swapWith], nextIds[index]];
        persistServiceStartOrderNow(nextIds);
        // Keep the moved row highlighted at its new position, keyed by id (not index) so it
        // stays attached to the same row even as its rank changes underneath it. Persisted via
        // uiState (not a plain useState) because ns.printRaw() remounts a fresh React tree every
        // dashboard tick - component state alone would lose the highlight on the next refresh.
        setUiState((current) => ({ ...current, startOrderSelectedServiceId: serviceId }));
    };

    const moveServiceToStartOrderEdge = (serviceId, edge) => {
        const currentIds = orderedServiceStartOrderRows.map((row) => row.serviceId);
        if (!currentIds.includes(serviceId)) return;
        const nextIds = currentIds.filter((id) => id !== serviceId);
        if (edge === "top") nextIds.unshift(serviceId);
        else nextIds.push(serviceId);
        persistServiceStartOrderNow(nextIds);
        setUiState((current) => ({ ...current, startOrderSelectedServiceId: serviceId }));
    };

    const renderServiceInputs = (inputs, layout = "default") => {
        if (!Array.isArray(inputs) || inputs.length === 0) {
            return null;
        }

        const isWrappingLayout = layout === "wrap-180";
        const containerStyle = isWrappingLayout
            ? { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }
            : WIDGET_STYLES.optionGrid;

        const fieldStyle = isWrappingLayout
            ? { display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px", minHeight: "56px", flex: "1 1 180px" }
            : WIDGET_STYLES.optionField;

        const controlStyle = {
            ...WIDGET_STYLES.input,
            minHeight: "34px",
            height: "34px",
            boxSizing: "border-box",
            ...(isWrappingLayout ? { marginTop: "auto", width: "100%" } : {}),
        };

        const renderInput = (input) => {
            const booleanSelect = input.type === "boolean-select";
            const booleanValue = input.value === true
                || String(input.value ?? "").trim().toLowerCase() === "true"
                || String(input.value ?? "").trim().toLowerCase() === "on";
            const selectOptions = booleanSelect ? ["On", "Off"] : input.options;
            const tooltip = typeof input.tooltip === "string" && input.tooltip.length > 0
                ? input.tooltip
                : `${booleanSelect ? "Toggle" : "Adjust"} ${input.label}`;
            return (
                <label key={input.id} title={tooltip} style={fieldStyle}>
                    <span data-dashboard-theme-role="data-heading">{input.label}</span>
                    {typeof input.description === "string" && input.description.length > 0 ? (
                        <span style={{ ...WIDGET_STYLES.smallMuted, lineHeight: 1.35 }}>{input.description}</span>
                    ) : null}
                    {(input.type === "select" || booleanSelect) && Array.isArray(selectOptions) ? (
                        <select
                            data-dashboard-theme-role="data-value"
                            title={tooltip}
                            style={controlStyle}
                            value={booleanSelect ? (booleanValue ? "On" : "Off") : String(input.value ?? "")}
                            disabled={Boolean(input.disabled)}
                            onFocus={() => setOptionsInputFocus(true)}
                            onBlur={() => setOptionsInputFocus(false)}
                            onChange={(e) => updateOptionInput(input, e.target.value)}
                        >
                            {selectOptions.map((optionValue) => (
                                <option key={`${input.id}:${optionValue}`} value={optionValue}>{optionValue}</option>
                            ))}
                        </select>
                    ) : input.format === "money" ? (
                        // A raw digit string like "20000000000000" is unreadable at a glance - this
                        // preview is read-only and purely a display aid, the <input> itself is
                        // completely unchanged (still the raw number, still what onChange writes),
                        // so nothing about validation/round-tripping changes for money inputs vs.
                        // any other number input.
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                                data-dashboard-theme-role="data-value"
                                title={tooltip}
                                style={{ ...controlStyle, flex: "1 1 auto", minWidth: 0 }}
                                type={input.type ?? "number"}
                                value={input.value}
                                min={input.type === "number" && Number.isFinite(input.min) ? input.min : undefined}
                                max={input.type === "number" && Number.isFinite(input.max) ? input.max : undefined}
                                step={input.type === "number" ? (input.step ?? "any") : undefined}
                                disabled={Boolean(input.disabled)}
                                onFocus={() => setOptionsInputFocus(true)}
                                onBlur={() => setOptionsInputFocus(false)}
                                onChange={(e) => updateOptionInput(input, e.target.value)}
                            />
                            <span
                                data-dashboard-theme-role="data-value"
                                style={{ ...WIDGET_STYLES.smallMuted, whiteSpace: "nowrap", flex: "0 0 auto", fontWeight: 800 }}
                            >
                                {formatCompactDashboardValue(Number(input.value) || 0, "money")}
                            </span>
                        </div>
                    ) : (
                        <input
                            data-dashboard-theme-role="data-value"
                            title={tooltip}
                            style={controlStyle}
                            type={input.type ?? "number"}
                            value={input.value}
                            min={input.type === "number" && Number.isFinite(input.min) ? input.min : undefined}
                            max={input.type === "number" && Number.isFinite(input.max) ? input.max : undefined}
                            step={input.type === "number" ? (input.step ?? "any") : undefined}
                            disabled={Boolean(input.disabled)}
                            onFocus={() => setOptionsInputFocus(true)}
                            onBlur={() => setOptionsInputFocus(false)}
                            onChange={(e) => updateOptionInput(input, e.target.value)}
                        />
                    )}
                </label>
            );
        };

        // Grouped metadata gets a real layout boundary rather than just a heading in one shared
        // flex row. This keeps each component's fields together and lets Home (two fields) and
        // Cloud/Hacknet (three fields each) establish their own evenly aligned columns.
        const groupedInputs = [];
        const groupByKey = new Map();
        for (const input of inputs) {
            const label = typeof input.group === "string" && input.group.length > 0 ? input.group : "";
            const key = label || "__ungrouped";
            let group = groupByKey.get(key);
            if (!group) {
                group = { key, label, inputs: [] };
                groupByKey.set(key, group);
                groupedInputs.push(group);
            }
            group.inputs.push(input);
        }
        const hasNamedGroups = groupedInputs.some((group) => group.label.length > 0);

        if (hasNamedGroups) {
            return (
                <div style={{ display: "grid", gap: "14px", marginBottom: "8px" }}>
                    {groupedInputs.map((group) => (
                        <section key={group.key} style={{ display: "grid", gap: "7px" }}>
                            {group.label ? (
                                <div
                                    data-dashboard-theme-role="data-heading"
                                    style={{
                                        ...WIDGET_STYLES.heading,
                                        marginBottom: 0,
                                        paddingBottom: "5px",
                                        borderBottom: "1px solid rgba(125, 160, 212, 0.32)",
                                    }}
                                >
                                    {group.label}
                                </div>
                            ) : null}
                            <div style={isWrappingLayout
                                ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", alignItems: "stretch" }
                                : WIDGET_STYLES.optionGrid}
                            >
                                {group.inputs.map(renderInput)}
                            </div>
                        </section>
                    ))}
                </div>
            );
        }

        return (
            <div style={containerStyle}>
                {inputs.map(renderInput)}
            </div>
        );
    };

    const renderStateCard = (meta, stateLines) => (
        <Card title={meta.title} accent={meta.accent} subtitle={meta.subtitle} widgetStyles={WIDGET_STYLES}>
            <div style={WIDGET_STYLES.list}>
                {stateLines.map((line) => (
                    <BadgeLine key={line.label} label={line.label} value={line.value} tone={line.tone ?? "neutral"} sourceLabel={line.sourceLabel} />
                ))}
            </div>
        </Card>
    );

    const renderServiceSections = (sections) => {
        if (!Array.isArray(sections) || sections.length === 0) {
            return null;
        }

        return (
            <>
                {sections.map((section, index) => {
                    if (section.type === "message") {
                        return (
                            <div key={`message-${index}`} style={WIDGET_STYLES.muted}>
                                {section.text}
                            </div>
                        );
                    }

                    if (section.type === "graph") {
                        const runtime = serviceRuntimeById[selectedService?.id];
                        const runtimeOffline = Boolean(runtime?.requiresRuntime && !runtime?.running);
                        // section.offline already accounts for a labeled sources[] entry's own
                        // freshness (see getPluginIntegrationSections) - merge with the owning
                        // integration's own runtime state rather than replacing it, since either
                        // one being down is a real reason to show this graph as offline.
                        const offline = runtimeOffline || Boolean(section.offline);
                        return <DashboardDataGraph
                            key={`graph-${section.title ?? index}`}
                            section={section}
                            index={index}
                            offline={offline}
                            sourceLabel={section.sourceLabel}
                        />;
                    }

                    if (section.type === "resource-cards") {
                        return (
                            <ResourceCardList
                                key={`resource-cards-${section.title ?? index}`}
                                section={section}
                                index={index}
                                serviceId={selectedService?.id ?? ""}
                                scriptPath={selectedService?.pluginFile ?? ""}
                            />
                        );
                    }

                    if (section.type === "table") {
                        return <DashboardDataTable
                            key={`table-${section.id ?? index}`}
                            section={section}
                            widgetStyles={WIDGET_STYLES}
                        />;
                    }

                    if (section.type === "items") {
                        const items = Array.isArray(section.items) ? section.items : [];
                        if (items.length === 0 && section.emptyText) {
                            return (
                                <div key={`items-empty-${index}`} style={WIDGET_STYLES.muted}>
                                    {section.emptyText}
                                </div>
                            );
                        }

                        if (items.length === 0) {
                            return null;
                        }

                        return (
                            <div
                                data-dashboard-theme-role="nested-section"
                                key={`items-${index}`}
                                style={{
                                    ...WIDGET_STYLES.sectionFrame,
                                    borderColor: section.borderColor ?? "#243824",
                                    background: section.background,
                                    marginTop: index > 0 ? "5px" : 0,
                                }}
                            >
                                {section.title ? (
                                    <div data-dashboard-theme-role="data-heading" style={{ ...WIDGET_STYLES.strong, marginBottom: "8px", color: section.titleColor }}>{section.title}</div>
                                ) : null}
                                <div style={WIDGET_STYLES.list}>
                                    {items.map((item) => (
                                        <div key={item.title}>
                                            <div data-dashboard-theme-role="data-heading" style={{ ...WIDGET_STYLES.itemTitle, color: section.itemColor }}>{item.title}</div>
                                            {item.detail ? <div data-dashboard-theme-role="data-value" style={WIDGET_STYLES.itemDetail}>{item.detail}</div> : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    if (section.type === "string-list") {
                        const items = Array.isArray(section.items) ? section.items : [];
                        if (items.length === 0) {
                            return null;
                        }

                        return (
                            <div
                                data-dashboard-theme-role="nested-section"
                                key={`string-list-${index}`}
                                style={{ ...WIDGET_STYLES.sectionFrame, marginTop: index > 0 ? "5px" : 0 }}
                            >
                                {section.title ? (
                                    <div data-dashboard-theme-role="data-heading" style={{ ...WIDGET_STYLES.strong, marginBottom: "8px" }}>{section.title}</div>
                                ) : null}
                                <ul style={WIDGET_STYLES.bullet}>
                                    {items.map((item) => (
                                        <li key={item} style={WIDGET_STYLES.muted}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        );
                    }

                    return null;
                })}
            </>
        );
    };

    const statsTiles = [
        ...dashboardServiceRegistry.services.flatMap((service) => {
            return getPluginIntegrationOverviewLines(
                service.pluginMetadata,
                telemetryByServiceId?.[service.id] ?? null,
                {
                    running: serviceRuntimeById[service.id]?.running,
                    requiresRuntime: serviceRuntimeById[service.id]?.requiresRuntime,
                    includeMissingPlaceholders: true,
                }
            ).map((line) => ({
                ...line,
                id: `${service.id}:${line.key ?? line.label}`,
                key: `${service.id}:${line.key ?? line.label}`,
                serviceId: service.id,
                menuGroup: service.menuGroup,
                sourceKind: "plugin",
                sourceLabel: service.menuLabel,
            }));
        }),
        {
            id: "system:runningScripts",
            key: "system:runningScripts",
            label: "Running Scripts",
            value: `${runningScriptCount}`,
            tone: "info",
            sourceKind: "system",
            sourceLabel: "Dashboard",
            order: 1000,
        }
    ].sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));
    const overviewGauges = dashboardServiceRegistry.services
        .flatMap((service) => getPluginIntegrationOverviewGauges(
            service.pluginMetadata,
            telemetryByServiceId?.[service.id] ?? null,
            {
                running: serviceRuntimeById[service.id]?.running,
                requiresRuntime: serviceRuntimeById[service.id]?.requiresRuntime,
            }
        ).map((gauge) => ({
            ...gauge,
            id: `${service.id}:${gauge.key}`,
            key: `${service.id}:${gauge.key}`,
            serviceId: service.id,
            menuGroup: service.menuGroup,
            sourceKind: "plugin",
            // Prefer the gauge's own per-source label (set when it's fed by a labeled sources[]
            // entry, e.g. Cloud RAM from Infrastructure Report) over the owning service's name -
            // only fall back to the service label for gauges built from this integration's own
            // locally-published telemetry.
            sourceLabel: gauge.sourceLabel || service.menuLabel,
        })))
        .sort((left, right) => left.order - right.order);
    const quickGauges = [
        ...overviewGauges,
        {
            id: "hardware.home:ram",
            key: "hardware.home:ram",
            serviceId: "hardware.home",
            menuGroup: "hardware",
            sourceKind: "system",
            sourceLabel: "Dashboard",
            label: "Home RAM",
            shortLabel: "HOME",
            used: homeRamStatus?.used ?? 0,
            total: homeRamStatus?.total ?? 0,
            ratio: homeRamStatus?.ratio ?? 0,
            valueFormat: "ram",
        },
    ];
    const homeHealthServices = dashboardServiceRegistry.services
        .map((service) => ({
            id: service.id,
            serviceId: service.id,
            menuGroup: service.menuGroup,
            label: service.menuLabel,
            level: serviceHealthById[service.id]?.level ?? "neutral",
            summary: serviceHealthById[service.id]?.summary ?? "",
        }));
    const homeServiceGroups = getDashboardMenuGroupRegistry().groups
        .map((group) => ({
            ...group,
            services: dashboardServiceRegistry.services.filter((service) => service.menuGroup === group.id),
        }))
        .filter((group) => group.services.length > 0);
    const homeGraphs = dashboardServiceRegistry.services
        .flatMap((service) => getPluginIntegrationGraphs(
            service.pluginMetadata,
            telemetryByServiceId?.[service.id] ?? null,
            {
                running: serviceRuntimeById[service.id]?.running,
                requiresRuntime: serviceRuntimeById[service.id]?.requiresRuntime,
            }
        ).map((graph, graphIndex) => ({
            ...graph,
            id: `${service.id}:${graph.id ?? `${graph.panelId ?? "graph"}-${graphIndex}`}`,
            key: `${service.id}:${graph.id ?? `${graph.panelId ?? "graph"}-${graphIndex}`}`,
            serviceId: service.id,
            menuGroup: service.menuGroup,
            sourceKind: "plugin",
            // No longer prefixed onto the title (DataGraph now shows this as its own subtext
            // line, consistent with every other widget) - frees up the title for graph-specific
            // content instead of repeating the service name that used to eat into it.
            title: graph.title || "History",
            // Prefer the graph's own per-source label (set when it's fed by a labeled sources[]
            // entry, e.g. Profit vs Cost from Infrastructure Report) over the owning service's
            // name - only fall back to the service label for graphs built from this integration's
            // own locally-published telemetry.
            sourceLabel: graph.sourceLabel || service.menuLabel,
        })));
    const hasLocalKillTargets = runningProcessSnapshot.homeFilenames.some((filename) => {
        return filename !== DASHBOARD_SCRIPT;
    });
    const hasRemoteKillTargets = runningProcessSnapshot.remoteFilenames.length > 0;
    const hasKillAllTargets = hasLocalKillTargets || hasRemoteKillTargets;
    const globalKillAction = buildDashboardActions([DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS], {
        disabledActionIds: hasKillAllTargets && !killAllPending ? [] : [DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS],
    })[0];
    const requestGlobalKill = () => {
        if (globalKillAction.disabled) return;
        killAllSnapshotRef.current = runningProcessSnapshot;
        setKillAllPending(true);
        // Enqueues directly rather than going through runServiceAction() - that function routes
        // KILL_ALL_SCRIPTS back into requestGlobalKill() itself (so every rendered copy of the
        // button shares this same guard), which would recurse infinitely if this function called
        // it back.
        enqueueDashboardAction({
            kind: "dashboard",
            actionId: DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS,
        });
    };
    // Shown at the top of the center column, above the panel selector, only while Dashboard
    // Options is the selected item (see the render site below) - Kill Local/Kill Remote moved
    // here from the retired scoped per-panel pairs (see the Kill Local/Remote consolidation
    // note). This Kill-All button is a second copy of the frame-control corner button, sharing
    // the exact same requestGlobalKill() guard via runServiceAction's KILL_ALL_SCRIPTS
    // special-case.
    const globalScriptControlActions = buildDashboardActions(
        [DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS, DASHBOARD_ACTION_IDS.KILL_ALL_HOME_SCRIPTS, DASHBOARD_ACTION_IDS.KILL_ALL_REMOTE_SCRIPTS],
        {
            disabledActionIds: [
                ...(hasKillAllTargets && !killAllPending ? [] : [DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS]),
                ...(hasLocalKillTargets ? [] : [DASHBOARD_ACTION_IDS.KILL_ALL_HOME_SCRIPTS]),
                ...(hasRemoteKillTargets ? [] : [DASHBOARD_ACTION_IDS.KILL_ALL_REMOTE_SCRIPTS]),
            ],
        }
    );

    // Mirrors buildScriptListActions' own matching pattern (dashboard/libs/script-list-actions.js):
    // an integration-backed service resolves via its pluginFile, a bare daemon script (no
    // -integration.js descriptor, so never present in dashboardServiceRegistry.services) falls
    // back to its own filename - same identifier space serviceAutostart:${id} already uses.
    // isDashboardCoreScript excludes automation-dashboard.jsx/service-supervisor.js by exact
    // filename - both declare daemon:true (they're long-running) but are never really in the set
    // this list is meant to reorder. Do NOT filter by the full PLUGIN_RUNTIME_EXCLUDED_FOLDERS set
    // (dashboard/, libs/, trashbin/) here - that's the right exclusion for service-supervisor.js's
    // OWN plugin-descriptor discovery (finding NEW -integration.js files under dashboard/, see
    // discoverDashboardPlugins's non-co-located branch), but a blanket "dashboard/" prefix match
    // also wrongly excludes every real plugin runtime script under dashboard/plugins/*/ (mail client
    // scanner, player stats, network navigator, etc.) - those ARE co-located with their own
    // descriptor and were never excluded from discovery in the first place, so excluding them
    // here just hid them from this list for no reason. "trashbin/" specifically has no such
    // false-positive case (nothing legitimate ever runs from there), so it's still excluded on its
    // own: confirmed real - a script soft-deleted via File Manager's archive/Cleanup into
    // trashbin/ kept its old DASHBOARD_SCRIPT_METADATA daemon:true declaration intact, so it kept
    // showing up here as a live start-order candidate (and staying in the persisted
    // serviceStartOrder list) long after the user believed it deleted.
    const serviceStartOrderRows = buildServiceStartOrderRows(homeScripts, dashboardServiceRegistry);
    const orderedServiceStartOrderRows = sortByServiceStartOrder(serviceStartOrderRows, options);

    // Ref callbacks run before layout effects. The general column-scroll restoration effect near
    // the top of this component therefore used to overwrite the selected row's scrollIntoView()
    // on every render. Run the follow step in a later layout effect so restoration happens first,
    // then move only the right-column scroller by the minimum amount needed to reveal the row.
    React.useLayoutEffect(() => {
        if (selectedItem !== "global.startOrder" || selectedCenterPanel !== "order") return;
        if (!uiState.startOrderSelectedServiceId) return;

        const container = rightColumnRef.current;
        const row = startOrderSelectedRowRef.current;
        if (!container || !row || typeof container.getBoundingClientRect !== "function" || typeof row.getBoundingClientRect !== "function") return;

        const containerBounds = container.getBoundingClientRect();
        const rowBounds = row.getBoundingClientRect();
        const edgePadding = 8;
        if (rowBounds.top < containerBounds.top + edgePadding) {
            container.scrollTop -= (containerBounds.top + edgePadding) - rowBounds.top;
        } else if (rowBounds.bottom > containerBounds.bottom - edgePadding) {
            container.scrollTop += rowBounds.bottom - (containerBounds.bottom - edgePadding);
        }
        rememberScroll("right", container.scrollTop);
    }, [selectedItem, selectedCenterPanel, uiState.startOrderSelectedServiceId, options.serviceStartOrder]);

    const serviceSupervisorRunning = homeScripts.some((script) => {
        return script?.filename === SERVICE_SUPERVISOR_SCRIPT && script?.running;
    });
    // Kill Local/Remote used to be scoped separately per panel (Core Modules, Integrations,
    // Plugins, Script List), but that distinction never meant anything to a user - core and
    // integrations never run remotely, so half those buttons were permanently dead, and the
    // other half just duplicated each other's semantics. Replaced with one global Kill Local/
    // Kill Remote pair under Dashboard Options (see that service's getActions above). Core
    // Modules keeps only its "Start integrations" action here.
    const coreModulesTopActions = buildDashboardActions([DASHBOARD_ACTION_IDS.START_INTEGRATIONS], {
        disabledActionIds: serviceSupervisorRunning ? [DASHBOARD_ACTION_IDS.START_INTEGRATIONS] : [],
    });

    const renderScriptButtons = (panels, renderOptions = {}) => {
        const selectable = renderOptions.selectable !== false;
        return (
            <div style={WIDGET_STYLES.actionGrid}>
                {panels.map((panel) => {
                    const isSelected = selectedCenterPanel === panel.id;
                    const pinnedExpandKey = `${selectedItem}:pinned-script-controls:${panel.id}`;
                    const isPinnedExpanded = uiState.expandedGroups?.[pinnedExpandKey] ?? false;
                    const isExpanded = selectable ? isSelected : isPinnedExpanded;
                    const toggleScriptPanel = () => {
                        if (!selectable) {
                            setUiState((current) => ({
                                ...current,
                                expandedGroups: {
                                    ...current.expandedGroups,
                                    [pinnedExpandKey]: !(current.expandedGroups?.[pinnedExpandKey] ?? false),
                                },
                            }));
                            return;
                        }
                        selectCenterPanel(isSelected ? "" : panel.id);
                    };
                    const standardInlineActions = buildScriptListActions(
                        {
                            id: panel.id,
                            filename: panel.id,
                            running: panel.running,
                            daemon: panel.daemon,
                            label: panel.label,
                            viewOnly: panel.viewOnly,
                            viewId: panel.viewId,
                        },
                        options,
                        { includeDisabledStates: true },
                        dashboardServiceRegistry.services,
                        dashboardViews
                    );
                    const supportsListHiding = SCRIPT_MANAGER_IDS_WITH_LIST_HIDING.has(selectedItem)
                        && !panel.viewOnly;
                    const inlineActions = supportsListHiding
                        ? [
                            ...standardInlineActions,
                            {
                                id: `hide-script:${panel.id}`,
                                label: "Hide from list",
                                kind: "save-options",
                                tone: "warn",
                                disabled: false,
                                tooltip: `Hide ${panel.id} from this manager. The script remains installed and can still be launched elsewhere.`,
                                optionOverrides: {
                                    hiddenScriptFiles: normalizeScriptFiles([
                                        ...parseScriptFiles(options.hiddenScriptFiles),
                                        panel.id,
                                    ]),
                                },
                            },
                        ]
                        : standardInlineActions;

                    return (
                        <div
                            data-dashboard-theme-role="selector-frame"
                            key={panel.id}
                            style={{
                                border: "1px solid rgba(53, 84, 53, 0.55)",
                                borderRadius: "7px",
                                padding: "6px",
                                background: isExpanded ? "rgba(18, 28, 18, 0.95)" : "rgba(6, 10, 6, 0.92)",
                            }}
                        >
                            <button
                                type="button"
                                data-dashboard-theme-role="menu-item"
                                title={getPanelTooltip(panel)}
                                style={{
                                    ...WIDGET_STYLES.actionButton,
                                    width: "100%",
                                    ...getScriptLifecycleStyle(panel, isExpanded),
                                }}
                                onMouseDown={(event) => runDashboardFrameControlMouseDown(event, toggleScriptPanel)}
                                onClick={(event) => runDashboardFrameControlClick(event, toggleScriptPanel)}
                            >
                                {panel.label} [{getScriptLifecycleLabel(panel)}]{!selectable ? (isExpanded ? " -" : " +") : ""}
                            </button>

                            {isExpanded ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                                    {inlineActions.map((action) => (
                                        <button
                                            type="button"
                                            key={action.id}
                                            title={getActionTooltip(action)}
                                            disabled={Boolean(action.disabled)}
                                            style={{
                                                ...WIDGET_STYLES.actionButton,
                                                ...getActionToneStyle(action),
                                                flex: "1 0 100px",
                                                textAlign: "center",
                                                ...(pressedActionButtonId === action.id && !action.disabled ? WIDGET_STYLES.actionButtonPressed : {}),
                                                ...(action.disabled ? WIDGET_STYLES.actionButtonDisabled : {}),
                                            }}
                                            onClick={() => {
                                                if (action.disabled) return;
                                                runServiceAction(action);
                                            }}
                                            onMouseDown={() => {
                                                if (action.disabled) return;
                                                setPressedActionButtonId(action.id);
                                            }}
                                            onMouseUp={() => setPressedActionButtonId("")}
                                            onMouseLeave={() => setPressedActionButtonId("")}
                                            onBlur={() => setPressedActionButtonId("")}
                                        >
                                            {renderActionLabel(action)}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSubWidgets = () => {

        const getScriptFolder = (panel) => {
            const normalized = String(panel?.id ?? "").replace(/\\/g, "/");
            const separatorIndex = normalized.lastIndexOf("/");
            return separatorIndex >= 0 ? normalized.slice(0, separatorIndex) : "";
        };

        const formatScriptFolder = (folder) => {
            if (!folder) return "Root";
            return folder.split("/").map((segment) => {
                return segment
                    .split(/[-_\s]+/)
                    .filter(Boolean)
                    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
                    .join(" ");
            }).join(" / ");
        };

        const renderGroupedScriptButtons = (panels) => {
            const groups = new Map();
            for (const panel of panels) {
                const folder = getScriptFolder(panel);
                if (!groups.has(folder)) groups.set(folder, []);
                groups.get(folder).push(panel);
            }

            const sortedGroups = Array.from(groups.entries()).sort(([left], [right]) => {
                if (!left) return -1;
                if (!right) return 1;
                return left.localeCompare(right);
            });

            return (
                <div style={{ display: "grid", gap: "10px" }}>
                    {sortedGroups.map(([folder, folderPanels]) => {
                        const sortedPanels = [...folderPanels].sort((left, right) => {
                            const labelComparison = String(left.label).localeCompare(String(right.label));
                            return labelComparison || String(left.id).localeCompare(String(right.id));
                        });
                        return (
                            <div key={folder || "root"} style={WIDGET_STYLES.scriptFolderGroup}>
                                <div style={WIDGET_STYLES.scriptFolderHeading}>
                                    {formatScriptFolder(folder)} ({sortedPanels.length})
                                </div>
                                {renderScriptButtons(sortedPanels)}
                            </div>
                        );
                    })}
                </div>
            );
        };

        if (selectedItem === "global.options") {
            const { runningPanels, stoppedPanels } = splitScriptPanels(centerPanels);

            return (
                <Card title="Scripts" accent="#6cb4ff" subtitle="Script Controls" widgetStyles={WIDGET_STYLES}>
                    <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                    {runningPanels.length > 0 ? renderGroupedScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running scripts.</div>}
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                    {stoppedPanels.length > 0 ? renderGroupedScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped scripts.</div>}
                </Card>
            );
        }

        if (selectedItem === "global.coreModules") {
            const { runningPanels, stoppedPanels } = splitScriptPanels(centerPanels);

            return (
                <>
                    <Card title="Core Module Controls" accent="#6ee7a8" subtitle="Managed script actions" widgetStyles={WIDGET_STYLES}>
                        {renderServiceActions(coreModulesTopActions)}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Core Modules" accent="#6ee7a8" subtitle="Dashboard core scripts" widgetStyles={WIDGET_STYLES}>
                        <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                        {runningPanels.length > 0 ? renderScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running dashboard core scripts.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                        {stoppedPanels.length > 0 ? renderScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped dashboard core scripts.</div>}
                    </Card>
                </>
            );
        }

        if (selectedItem === "global.integrations") {
            const { runningPanels, stoppedPanels } = splitScriptPanels(centerPanels);

            return (
                <Card title="Integrations" accent="#6cb4ff" subtitle="Integration Controls" widgetStyles={WIDGET_STYLES}>
                    <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                    {runningPanels.length > 0 ? renderScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running integrations.</div>}
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                    {stoppedPanels.length > 0 ? renderScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped integrations.</div>}
                </Card>
            );
        }

        if (selectedItem === "global.plugins") {
            const { runningPanels, stoppedPanels } = splitScriptPanels(centerPanels);

            return (
                <Card title="Plugins" accent="#6cb4ff" subtitle="Plugin Controls" widgetStyles={WIDGET_STYLES}>
                    <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                    {runningPanels.length > 0 ? renderScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running plugins.</div>}
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                    {stoppedPanels.length > 0 ? renderScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped plugins.</div>}
                </Card>
            );
        }

        return (
            <Card title="Sub-Widgets" accent="#6cb4ff" subtitle="Choose a sub-category" widgetStyles={WIDGET_STYLES}>
                <div style={WIDGET_STYLES.actionGrid}>
                    {centerPanels.map((panel) => {
                        const panelLevel = selectedServiceHealth?.panels?.[panel.id] ?? "neutral";
                        const panelMeta = getPanelMeta(panel.id, {});
                        const panelRequirementBadges = isGlobalListMenuItem(selectedItem) || !showSubmenuUnlockGlyphs
                            ? []
                            : compactPluginMenuRequirementBadges(
                                buildPluginMenuRequirementBadges([
                                    ...(Array.isArray(panelMeta?.menuUnlocks) ? panelMeta.menuUnlocks : []),
                                    ...(Array.isArray(panelMeta?.requirements) ? panelMeta.requirements : []),
                                ]),
                                getPluginMenuRequirementBadgeBudget(menuUnlockGlyphMaxCount, panelLevel, false),
                            );
                        const isSelected = selectedCenterPanel === panel.id;
                        const hasInlineScriptActions = panel.id === "options" && standardScriptActions.length > 0;
                        const inlineActionsExpandKey = `${selectedItem}:${panel.id}:inline-script-actions`;
                        const isInlineActionsExpanded = uiState.expandedGroups?.[inlineActionsExpandKey] ?? true;
                        const shouldShowInlineScriptActions = hasInlineScriptActions && isSelected && isInlineActionsExpanded;
                        return (
                            <div
                                data-dashboard-theme-role="selector-frame"
                                key={panel.id}
                                style={{
                                    border: "1px solid rgba(53, 84, 53, 0.55)",
                                    borderRadius: "7px",
                                    padding: "6px",
                                    background: isSelected ? "rgba(18, 28, 18, 0.95)" : "rgba(6, 10, 6, 0.92)",
                                }}
                            >
                                <button
                                    type="button"
                                    data-dashboard-theme-role="menu-item"
                                    title={getPanelTooltip(panel)}
                                    style={{
                                        ...WIDGET_STYLES.actionButton,
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        ...(isGlobalListMenuItem(selectedItem) ? {
                                            borderColor: panel.running ? "rgba(110, 231, 168, 0.45)" : "rgba(255, 122, 122, 0.45)",
                                            color: panel.running ? "#baf6d2" : "#ffb0b0",
                                            background: panel.running ? "rgba(10, 26, 10, 0.95)" : "rgba(26, 10, 10, 0.95)",
                                        } : {}),
                                        ...(isGlobalListMenuItem(selectedItem) ? {} : getHealthStyle(panelLevel)),
                                        ...(isSelected ? getActiveHealthStyle(panelLevel) : {})
                                    }}
                                    onClick={() => {
                                        if (hasInlineScriptActions && isSelected) {
                                            setUiState((current) => ({
                                                ...current,
                                                expandedGroups: {
                                                    ...current.expandedGroups,
                                                    [inlineActionsExpandKey]: !(current.expandedGroups?.[inlineActionsExpandKey] ?? true),
                                                },
                                            }));
                                            return;
                                        }

                                        selectCenterPanel(panel.id);
                                        if (hasInlineScriptActions) {
                                            setUiState((current) => ({
                                                ...current,
                                                expandedGroups: {
                                                    ...current.expandedGroups,
                                                    [inlineActionsExpandKey]: true,
                                                },
                                            }));
                                        }
                                    }}
                                >
                                    <span style={{
                                        flex: "1 1 auto",
                                        minWidth: 0,
                                        display: "inline-flex",
                                        alignItems: "center",
                                    }}>
                                        <span style={{
                                            minWidth: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {panel.label}{hasInlineScriptActions && isSelected ? (isInlineActionsExpanded ? " -" : " +") : ""}
                                        </span>
                                        {isGlobalListMenuItem(selectedItem) ? null : renderHealthBadge(panelLevel)}
                                    </span>
                                    {panelRequirementBadges.length > 0 ? (
                                        <span style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            flex: "0 0 auto",
                                            gap: "5px",
                                            marginLeft: "auto",
                                        }}>
                                            {renderMenuRequirementBadges(panelRequirementBadges)}
                                        </span>
                                    ) : null}
                                </button>

                                {shouldShowInlineScriptActions ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                                        {standardScriptActions.map((action) => (
                                            <button
                                                type="button"
                                                key={action.id}
                                                title={getActionTooltip(action)}
                                                disabled={Boolean(action.disabled)}
                                                style={{
                                                    ...WIDGET_STYLES.actionButton,
                                                    ...getActionToneStyle(action),
                                                    flex: "1 0 100px",
                                                    textAlign: "center",
                                                    ...(pressedActionButtonId === action.id && !action.disabled ? WIDGET_STYLES.actionButtonPressed : {}),
                                                    ...(action.disabled ? WIDGET_STYLES.actionButtonDisabled : {}),
                                                }}
                                                onClick={() => {
                                                    if (action.disabled) return;
                                                    runServiceAction(action);
                                                }}
                                                onMouseDown={() => {
                                                    if (action.disabled) return;
                                                    setPressedActionButtonId(action.id);
                                                }}
                                                onMouseUp={() => setPressedActionButtonId("")}
                                                onMouseLeave={() => setPressedActionButtonId("")}
                                                onBlur={() => setPressedActionButtonId("")}
                                            >
                                                {renderActionLabel(action)}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    const renderContractPanel = ({
        meta,
        stateLines,
        sections,
        inputs,
        actions,
        emptyMessage = "",
        healthLevel = "neutral",
        healthSummary = "",
        description = "",
        actionsSectionKey = "",
        actionsSectionLabel = "Actions",
        collapsibleActions = false,
        actionsFirst = false,
        actionLayout = "default",
        inputLayout = "default",
    }) => {
        const hasState = Array.isArray(stateLines) && stateLines.length > 0;
        const hasSections = Array.isArray(sections) && sections.length > 0;
        const hasInputs = Array.isArray(inputs) && inputs.length > 0;
        const hasActions = Array.isArray(actions) && actions.length > 0;
        const hasContent = hasState || hasSections || hasInputs || hasActions;
        const healthTone = getHealthSummaryTone(healthLevel);
        const showHealthSummary = typeof healthSummary === "string" && healthSummary.length > 0;
        const showDescription = typeof description === "string" && description.length > 0;

        return (
            <Card title={meta.title} accent={meta.accent} subtitle={meta.subtitle} widgetStyles={WIDGET_STYLES}>
                {showHealthSummary ? (
                    <div data-dashboard-theme-role="data-row" style={{ ...WIDGET_STYLES.item, borderColor: "rgba(125, 160, 212, 0.18)", color: healthTone }}>
                        <div data-dashboard-theme-role="data-heading" style={WIDGET_STYLES.itemTitle}>Health</div>
                        <div data-dashboard-theme-role="data-value" style={{ ...WIDGET_STYLES.itemDetail, color: healthTone }}>{healthSummary}</div>
                    </div>
                ) : null}
                {showHealthSummary && showDescription ? <div style={WIDGET_STYLES.sectionGap} /> : null}
                {showDescription ? (
                    <div data-dashboard-theme-role="data-row" style={{ ...WIDGET_STYLES.item, borderColor: "rgba(125, 160, 212, 0.18)" }}>
                        <div data-dashboard-theme-role="data-heading" style={WIDGET_STYLES.itemTitle}>Description</div>
                        <div data-dashboard-theme-role="data-value" style={WIDGET_STYLES.itemDetail}>{description}</div>
                    </div>
                ) : null}
                {(showHealthSummary || showDescription) && hasContent ? <div style={WIDGET_STYLES.sectionGap} /> : null}
                {!hasContent && emptyMessage ? <div style={WIDGET_STYLES.muted}>{emptyMessage}</div> : null}
                {hasActions && actionsFirst ? (collapsibleActions ? (
                    <div style={WIDGET_STYLES.actionGrid}>
                        <button
                            type="button"
                            style={WIDGET_STYLES.actionButton}
                            onClick={() => {
                                setUiState((current) => ({
                                    ...current,
                                    expandedGroups: {
                                        ...current.expandedGroups,
                                        [actionsSectionKey]: !current.expandedGroups?.[actionsSectionKey],
                                    },
                                }));
                            }}
                        >
                            {uiState.expandedGroups?.[actionsSectionKey] ? "- " : "+ "}{actionsSectionLabel}
                        </button>
                        {uiState.expandedGroups?.[actionsSectionKey] ? renderServiceActions(actions, actionLayout) : null}
                    </div>
                ) : renderServiceActions(actions, actionLayout)) : null}
                {hasActions && actionsFirst && (hasState || hasSections || hasInputs) ? <div style={WIDGET_STYLES.sectionGap} /> : null}
                {hasState ? (
                    <div style={WIDGET_STYLES.list}>
                        {stateLines.map((line) => (
                            <BadgeLine key={line.label} label={line.label} value={line.value} tone={line.tone ?? "neutral"} sourceLabel={line.sourceLabel} />
                        ))}
                    </div>
                ) : null}
                {hasState && (hasSections || hasInputs || hasActions) ? <div style={WIDGET_STYLES.sectionGap} /> : null}
                {hasSections ? renderServiceSections(sections) : null}
                {hasSections && (hasInputs || hasActions) ? <div style={WIDGET_STYLES.sectionGap} /> : null}
                {hasInputs ? renderServiceInputs(inputs, inputLayout) : null}
                {hasInputs && hasActions && !actionsFirst ? <div style={WIDGET_STYLES.sectionGap} /> : null}
                {!actionsFirst && hasActions ? (collapsibleActions ? (
                    <div style={WIDGET_STYLES.actionGrid}>
                        <button
                            type="button"
                            style={WIDGET_STYLES.actionButton}
                            onClick={() => {
                                setUiState((current) => ({
                                    ...current,
                                    expandedGroups: {
                                        ...current.expandedGroups,
                                        [actionsSectionKey]: !current.expandedGroups?.[actionsSectionKey],
                                    },
                                }));
                            }}
                        >
                            {uiState.expandedGroups?.[actionsSectionKey] ? "- " : "+ "}{actionsSectionLabel}
                        </button>
                        {uiState.expandedGroups?.[actionsSectionKey] ? renderServiceActions(actions, actionLayout) : null}
                    </div>
                ) : renderServiceActions(actions, actionLayout)) : null}
            </Card>
        );
    };

    const renderStandardServicePanel = () => {
        const panelId = selectedCenterPanel ?? selectedService?.defaultPanelId ?? "core-stats";

        // Bespoke, same reasoning as Kill Controls in the center column: a reorderable list
        // doesn't fit the generic getState/getInputs/getActions machinery this function drives
        // for every other panel, so it's rendered directly here instead of through
        // renderContractPanel. Lives in the right column (not the center column, where it was
        // first placed) because the list itself is too wide for that column - the center column
        // only gets a menu entry (the "Order" subview button) for it.
        if (selectedItem === "global.startOrder" && panelId === "order") {
            return (
                <Card title="Service Start Order" accent="#6cb4ff" subtitle="Order the Integration Service Supervisor uses when RAM is scarce" widgetStyles={WIDGET_STYLES}>
                    {getServiceStartOrder(options).length === 0 ? (
                        <div style={WIDGET_STYLES.smallMuted}>Not customized yet — using default (alphabetical) start order.</div>
                    ) : null}
                    <ul style={{ ...WIDGET_STYLES.list, minWidth: 0 }}>
                        {orderedServiceStartOrderRows.map((row, index) => (
                            <li
                                key={row.serviceId}
                                ref={row.serviceId === uiState.startOrderSelectedServiceId
                                    ? startOrderSelectedRowRef
                                    : null}
                                style={{
                                    ...WIDGET_STYLES.item,
                                    cursor: "pointer",
                                    minWidth: 0,
                                    ...(row.serviceId === uiState.startOrderSelectedServiceId ? {
                                        borderColor: "rgba(108, 180, 255, 0.55)",
                                        background: "rgba(10, 24, 38, 0.95)",
                                    } : {}),
                                }}
                                onClick={() => setUiState((current) => ({
                                    ...current,
                                    startOrderSelectedServiceId: current.startOrderSelectedServiceId === row.serviceId ? "" : row.serviceId,
                                }))}
                            >
                                <div style={{ ...WIDGET_STYLES.itemTitle, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", minWidth: 0 }}>
                                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                                    <span style={{ ...WIDGET_STYLES.itemDetail, fontWeight: 400, whiteSpace: "nowrap", flex: "0 0 auto" }}>{formatRam(row.ramPerThread)}</span>
                                </div>
                                <div style={{ ...WIDGET_STYLES.itemDetail, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#8e8e8e" }} title={row.description}>{row.description}</span>
                                    <span style={{ display: "flex", gap: "4px", flex: "0 0 auto" }}>
                                        <button
                                            type="button"
                                            title="Move to top"
                                            style={{ ...WIDGET_STYLES.actionButton, ...(index === 0 ? WIDGET_STYLES.actionButtonDisabled : {}) }}
                                            disabled={index === 0}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                moveServiceToStartOrderEdge(row.serviceId, "top");
                                            }}
                                        >
                                            ⤒
                                        </button>
                                        <button
                                            type="button"
                                            title="Move to bottom"
                                            style={{ ...WIDGET_STYLES.actionButton, ...(index === orderedServiceStartOrderRows.length - 1 ? WIDGET_STYLES.actionButtonDisabled : {}) }}
                                            disabled={index === orderedServiceStartOrderRows.length - 1}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                moveServiceToStartOrderEdge(row.serviceId, "bottom");
                                            }}
                                        >
                                            ⤓
                                        </button>
                                        <button
                                            type="button"
                                            title="Move up"
                                            style={{ ...WIDGET_STYLES.actionButton, ...(index === 0 ? WIDGET_STYLES.actionButtonDisabled : {}) }}
                                            disabled={index === 0}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                moveServiceInStartOrder(row.serviceId, -1);
                                            }}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            title="Move down"
                                            style={{ ...WIDGET_STYLES.actionButton, ...(index === orderedServiceStartOrderRows.length - 1 ? WIDGET_STYLES.actionButtonDisabled : {}) }}
                                            disabled={index === orderedServiceStartOrderRows.length - 1}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                moveServiceInStartOrder(row.serviceId, 1);
                                            }}
                                        >
                                            ▼
                                        </button>
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            );
        }

        const fallbackMeta = {
            title: selectedService?.menuLabel ?? "Overview",
            accent: "#6ee7a8",
            subtitle: "Service panel",
        };
        const isPluginOptionsPanel = isPluginService && panelId === "options";
        const serviceSections = isPluginOptionsPanel ? [] : getSections();
        const isGraphPanel = serviceSections.some((section) => section?.type === "graph");
        const isStandalonePanel = isGraphPanel || serviceSections.some((section) => section?.standalone === true);
        const stateLines = isPluginOptionsPanel || isStandalonePanel ? [] : getStateLines();
        const requirementSection = !isStandalonePanel && selectedService?.pluginIntegrationFile
            ? buildPluginRequirementSection(getPluginRequirementsForPanel(
                pluginRequirements,
                selectedService.id,
                panelId
            ))
            : null;
        const sections = isPluginOptionsPanel
            ? []
            : [requirementSection, ...serviceSections].filter(Boolean);
        const inputs = getInputs();
        // Single place that decides action placement, now that the adapters no longer hard-gate
        // getActions to the Options panel:
        //   - an action WITH a panelId appears only on that panel (e.g. the copy-route button on
        //     BDRouter, or Augment Manager's bulk buy on its Buy tab);
        //   - an action WITHOUT one keeps the historical behavior of appearing only on a plugin's
        //     auto-injected Options panel, so lifting the adapter gate doesn't splatter mode
        //     toggles across every panel. Non-plugin services are untouched - their actions have
        //     no panelId and have always rendered on whatever panel they were built for.
        const actions = panelActions.filter((action) => {
            if (typeof action.panelId === "string") return action.panelId === panelId;
            return !isPluginService || isPluginOptionsPanel;
        });

        const panelHealthLevel = isPluginOptionsPanel || isStandalonePanel
            ? "neutral"
            : selectedServiceHealth?.panels?.[panelId] ?? selectedServiceHealth?.level ?? "neutral";
        const panelHealthSummary = isPluginOptionsPanel || isStandalonePanel
            ? ""
            : selectedServiceHealth?.panelSummaries?.[panelId] ?? selectedServiceHealth?.summary ?? "";
        const inputLayout = isPluginOptionsPanel ? "wrap-180" : "default";
        const resolvedPanelMeta = getPanelMeta(panelId, fallbackMeta);
        const panelMeta = isPluginOptionsPanel
            ? {
                ...resolvedPanelMeta,
                title: `${selectedService?.menuLabel ?? "Script"} Options`,
                subtitle: "Script controls",
            }
            : resolvedPanelMeta;

        return renderContractPanel({
            meta: panelMeta,
            stateLines,
            sections,
            inputs,
            actions,
            healthLevel: panelHealthLevel,
            healthSummary: panelHealthSummary,
            description: isPluginOptionsPanel || isStandalonePanel
                ? ""
                : panelMeta?.description ?? selectedService?.description ?? "",
            actionsSectionKey: `${selectedItem}:${panelId}:actions`,
            actionsSectionLabel: "Script Controls",
            collapsibleActions: false,
            actionsFirst: isPluginOptionsPanel,
            actionLayout: isPluginOptionsPanel ? "feature-row" : "default",
            inputLayout,
        });
    };

    const GLOBAL_LIST_META = {
        "global.coreModules": {
            sourceScripts: dashboardCoreScripts,
            listTitle: "Core Modules",
            listSubtitle: "Dashboard core scripts",
            accent: "#6ee7a8",
            scriptTitle: "Core Module",
            scriptSubtitle: "Dashboard core status and controls",
            emptyWithScripts: "Select a core module to view its status.",
            emptyNoScripts: "No dashboard core scripts were found.",
        },
        "global.integrations": {
            sourceScripts: integrationScripts,
            listTitle: "Integrations",
            listSubtitle: "Independently-runnable scripts with a dashboard descriptor",
            accent: "#6cb4ff",
            scriptTitle: "Integration",
            scriptSubtitle: "Integration status and controls",
            emptyWithScripts: "Select an integration to view its status.",
            emptyNoScripts: "No integrations were found.",
        },
        "global.plugins": {
            sourceScripts: pluginScripts,
            listTitle: "Plugins",
            listSubtitle: "Packaged dashboard plugin scripts",
            accent: "#6cb4ff",
            scriptTitle: "Plugin",
            scriptSubtitle: "Plugin status and controls",
            emptyWithScripts: "Select a plugin to view its status.",
            emptyNoScripts: "No plugins were found.",
        },
    };

    const renderGlobalOptions = () => {
        const listMetaConfig = GLOBAL_LIST_META[selectedItem];
        const sourceScripts = listMetaConfig ? listMetaConfig.sourceScripts : nonPluginScripts;
        const selectedScript = resolveSelectedScriptPanel(selectedCenterPanel, sourceScripts);
        const selectedSupervisor = selectedScript?.filename === SERVICE_SUPERVISOR_SCRIPT;
        const selectedScriptLines = getStateLines({ selectedScript });
        const listMeta = getPanelMeta("default", {
            title: listMetaConfig?.listTitle ?? "Scripts",
            accent: listMetaConfig?.accent ?? "#ff7bd0",
            subtitle: listMetaConfig?.listSubtitle ?? "Home directory scripts"
        });
        const scriptMeta = getPanelMeta("script", {
            title: listMetaConfig?.scriptTitle ?? "Script",
            accent: listMetaConfig?.accent ?? "#ff7bd0",
            subtitle: listMetaConfig?.scriptSubtitle ?? "Script status and controls"
        });
        if (!selectedScript) {
            const panelId = "default";
            const panelHealthLevel = selectedServiceHealth?.panels?.[panelId] ?? selectedServiceHealth?.level ?? "neutral";
            const panelHealthSummary = selectedServiceHealth?.panelSummaries?.[panelId] ?? selectedServiceHealth?.summary ?? "";
            return renderContractPanel({
                meta: listMeta,
                stateLines: [],
                sections: [],
                inputs: [],
                actions: [],
                emptyMessage: listMetaConfig
                    ? (sourceScripts.length > 0 ? listMetaConfig.emptyWithScripts : listMetaConfig.emptyNoScripts)
                    : getScriptListDetailEmptyMessage(sourceScripts),
                healthLevel: panelHealthLevel,
                healthSummary: panelHealthSummary,
            });
        }

        const panelId = selectedScript.id;
        const panelHealthLevel = selectedServiceHealth?.panels?.[panelId] ?? selectedServiceHealth?.level ?? "neutral";
        const panelHealthSummary = selectedServiceHealth?.panelSummaries?.[panelId] ?? selectedServiceHealth?.summary ?? "";
        return renderContractPanel({
            meta: {
                title: selectedScript.label || scriptMeta.title,
                accent: scriptMeta.accent,
                subtitle: selectedSupervisor ? "Managed service status and controls" : scriptMeta.subtitle,
            },
            stateLines: selectedScriptLines,
            sections: [],
            inputs: [],
            actions: [],
            healthLevel: panelHealthLevel,
            healthSummary: panelHealthSummary,
            collapsibleActions: false,
        });
    };

    const renderDataPanel = () => {
        if (isGlobalListMenuItem(selectedItem)) {
            return renderGlobalOptions();
        }

        if (selectedService) {
            return renderStandardServicePanel();
        }

        return (
            <Card title="Dashboard" accent="#6ee7a8" subtitle="Service overview" widgetStyles={WIDGET_STYLES}>
                <div style={WIDGET_STYLES.muted}>
                    Select a service to inspect its status and telemetry.
                </div>
            </Card>
        );
    };

    const renderWorkspaceWidget = (widget) => {
        if (widget.type !== "player-stats") return null;
        const serviceIds = Array.isArray(widget.serviceIds) && widget.serviceIds.length > 0
            ? widget.serviceIds.filter((serviceId) => typeof serviceId === "string")
            : [widget.contributionServiceId].filter(Boolean);
        const serviceIdSet = new Set(serviceIds);
        const definitions = playerHudDefinitions
            .filter((definition) => serviceIdSet.has(definition.serviceId) && (definition.groups?.length ?? 0) > 0);
        const runtimeStatuses = serviceIds.map((serviceId) => serviceRuntimeById[serviceId]).filter(Boolean);
        const isOffline = runtimeStatuses.some((status) => status?.requiresRuntime && !status?.running);
        const title = typeof widget.title === "string" ? widget.title : "Player Status";
        const subtitle = typeof widget.subtitle === "string" ? widget.subtitle : "Live player telemetry";
        const emptyText = typeof widget.emptyText === "string" ? widget.emptyText : "Waiting for player telemetry.";

        return (
            <div key={`${widget.contributionServiceId}:${widget.id}`} style={WIDGET_STYLES.playerStatusColumn}>
                <HomePanel title={title} subtitle={subtitle} muted={isOffline}>
                    {isOffline
                        ? <div style={WIDGET_STYLES.muted}>Service is offline.</div>
                        : definitions.length > 0
                            ? <PlayerStatsOverviewRenderer definitions={definitions} dashboardTheme={dashboardTheme} groupIds={widget.groupIds} orientation={widget.orientation ?? "vertical"} />
                            : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                </HomePanel>
            </div>
        );
    };

    return (
        <DashboardShell dashboardTheme={dashboardTheme} dashboardLayout={dashboardLayout} widgetStyles={WIDGET_STYLES}>
            {activeView?.renderer === "system-overview" ? (
                <SystemOverviewRenderer
                    view={activeView}
                    metrics={statsTiles}
                    playerHudDefinitions={playerHudDefinitions}
                    playerStatsEnabled={playerStatsEnabled}
                    dashboardTheme={dashboardTheme}
                    gauges={quickGauges}
                    healthServices={homeHealthServices}
                    serviceGroups={homeServiceGroups}
                    serviceHealthById={serviceHealthById}
                    serviceRuntimeById={serviceRuntimeById}
                    graphs={homeGraphs}
                    scrollRef={systemOverviewRef}
                    onScroll={(event) => rememberScroll("systemOverview", event.currentTarget.scrollTop)}
                    onExit={() => setActiveView("")}
                    compactControls={systemOverviewCompactControls}
                    widgetStyles={WIDGET_STYLES}
                    windowControl={systemOverviewWindowControl}
                    closeControl={systemOverviewCloseControl}
                    minimizeControl={systemOverviewMinimizeControl}
                    killAllControl={(
                        <button
                            type="button"
                            title={globalKillAction.disabled
                                ? "No scripts other than the dashboard are currently running."
                                : "Kill every running script on home and all reachable servers; preserve this dashboard."}
                            disabled={globalKillAction.disabled}
                            style={{
                                ...getDashboardFrameControlStyle("danger", systemOverviewControlStyle),
                                ...(pressedActionButtonId === globalKillAction.id && !globalKillAction.disabled ? WIDGET_STYLES.actionButtonPressed : {}),
                                ...(globalKillAction.disabled ? WIDGET_STYLES.actionButtonDisabled : {}),
                            }}
                            onMouseDown={(event) => {
                                if (globalKillAction.disabled) return;
                                runDashboardFrameControlMouseDown(event, () => {
                                    setPressedActionButtonId(globalKillAction.id);
                                    requestGlobalKill();
                                });
                            }}
                            onClick={(event) => runDashboardFrameControlClick(event, requestGlobalKill)}
                            onMouseUp={() => setPressedActionButtonId("")}
                            onMouseLeave={() => setPressedActionButtonId("")}
                            onBlur={() => setPressedActionButtonId("")}
                        >
                            {renderActionLabel(globalKillAction)}
                        </button>
                    )}
                />
            ) : activeView?.renderer === "network-map" ? (
                <NetworkMapView
                    view={activeView}
                    telemetry={activeViewTelemetry}
                    serviceStatus={serviceRuntimeById[activeView?.data?.serviceId] ?? null}
                    onCommand={(serviceId, command, port) => runServiceAction({
                        kind: "plugin-command",
                        serviceId,
                        command,
                        ...(Number.isFinite(Number(port)) ? { port: Number(port) } : {}),
                    })}
                    onInputFocusChange={setOptionsInputFocus}
                    onExit={() => setActiveView("")}
                    windowControl={networkMapWindowControl}
                    closeControl={networkMapCloseControl}
                    minimizeControl={networkMapMinimizeControl}
                    widgetStyles={WIDGET_STYLES}
                />
            ) : activeView?.renderer === "file-manager" ? (
                <FileManagerView
                    view={activeView}
                    snapshot={fileManagerSnapshots?.[activeView.id] ?? null}
                    dashboardTheme={dashboardTheme}
                    hiddenFolders={parseScriptFolders(options.hiddenScriptFolders)}
                    initialState={getDashboardViewInteractionState(activeView.id)}
                    lastActionResult={globalThis[DASHBOARD_FILE_ACTION_RESULT_KEY] ?? null}
                    onStateChange={(state) => saveDashboardViewInteractionState(activeView.id, state)}
                    onFileAction={(action) => enqueueDashboardAction({
                        kind: "file",
                        viewId: activeView.id,
                        ...action,
                    })}
                    onRequestPreview={(path) => enqueueDashboardAction({
                        kind: "file-preview",
                        viewId: activeView.id,
                        path,
                    })}
                    lastPreviewResult={globalThis[DASHBOARD_FILE_PREVIEW_RESULT_KEY] ?? null}
                    onInputFocusChange={setOptionsInputFocus}
                    onExit={() => setActiveView("")}
                    headerActions={<>{minimizeControl}{windowControl}</>}
                />
            ) : activeView?.renderer === "script-log" ? (
                <ScriptLogView
                    view={activeView}
                    snapshot={scriptLogSnapshots?.[activeView.id] ?? null}
                    dashboardTheme={dashboardTheme}
                    initialState={getDashboardViewInteractionState(activeView.id)}
                    onStateChange={(state) => saveDashboardViewInteractionState(activeView.id, state)}
                    onInputFocusChange={setOptionsInputFocus}
                    onExit={() => setActiveView("")}
                    headerActions={<>{minimizeControl}{windowControl}</>}
                />
            ) : (
            <>
            <div style={{ ...WIDGET_STYLES.heroRow, ...normalContentBounds }}>
                <div data-dashboard-theme-role="hero-frame" style={WIDGET_STYLES.hero}>
                    <div style={WIDGET_STYLES.heroCopy}>
                        <div style={WIDGET_STYLES.heroTitle}>Automation Dashboard</div>
                        <div style={WIDGET_STYLES.heroSubtitle}>
                            Live control surface for automation services.
                        </div>
                    </div>
                    <div style={getDashboardFrameControlGroupStyle()}>
                    <button
                        type="button"
                        title={globalKillAction.disabled
                            ? "No scripts other than the dashboard are currently running."
                            : "Kill every running script on home and all reachable servers; preserve this dashboard."}
                        disabled={globalKillAction.disabled}
                        style={{
                            ...getDashboardFrameControlStyle("danger"),
                            ...(pressedActionButtonId === globalKillAction.id && !globalKillAction.disabled ? WIDGET_STYLES.actionButtonPressed : {}),
                            ...(globalKillAction.disabled ? WIDGET_STYLES.actionButtonDisabled : {}),
                        }}
                        onMouseDown={(event) => {
                            if (globalKillAction.disabled) return;
                            runDashboardFrameControlMouseDown(event, () => {
                                setPressedActionButtonId(globalKillAction.id);
                                requestGlobalKill();
                            });
                        }}
                        onClick={(event) => runDashboardFrameControlClick(event, requestGlobalKill)}
                        onMouseUp={() => setPressedActionButtonId("")}
                        onMouseLeave={() => setPressedActionButtonId("")}
                        onBlur={() => setPressedActionButtonId("")}
                    >
                        {renderActionLabel(globalKillAction)}
                    </button>
                    {windowControl}
                    {minimizeControl}
                    </div>
                </div>
            </div>

                <div
                    style={{
                        ...WIDGET_STYLES.statsRow,
                        ...normalContentBounds,
                        // One column for the whole gauge stack, not one column per gauge - each
                        // additional gauge (Cloud/Network/Hacknet/Home) used to cost a whole extra
                        // dial-width column here; stacked bars fit them all in the width of a
                        // single stat tile instead.
                        gridTemplateColumns: `minmax(0, 1fr) ${responsiveLayout.statMinimumWidth}px`,
                    }}
                >
                <div
                    style={{
                        ...WIDGET_STYLES.statsPills,
                        gridTemplateColumns: `repeat(auto-fit, minmax(${responsiveLayout.statMinimumWidth}px, 1fr))`,
                    }}
                >
                    {statsTiles.map((tile) => (
                        <div
                            key={tile.key ?? tile.label}
                            title={`${tile.label}: ${tile.value}`}
                            style={WIDGET_STYLES.statTile}
                        >
                            <TonePill label={tile.label} value={tile.value} tone={tile.tone} sourceLabel={tile.sourceLabel} state={tile.state} ageText={tile.ageText} />
                        </div>
                    ))}
                </div>
                <div style={WIDGET_STYLES.ramGaugeSlot}>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "5px", width: "100%" }}>
                        {quickGauges.map((gauge) => (
                            <RamGaugeBar key={gauge.key} {...gauge} />
                        ))}
                    </div>
                </div>
                </div>

                <div style={{ ...WIDGET_STYLES.workspaceRow, ...normalContentBounds, gridTemplateColumns: workspaceGridColumns }}>
                <div
                    ref={leftColumnRef}
                    data-dashboard-theme-role="workspace-column-first"
                    style={{ ...WIDGET_STYLES.column, ...WIDGET_STYLES.leftColumn }}
                    onScroll={(e) => rememberScroll("left", e.currentTarget.scrollTop)}
                >
                    <div>
                        <Card title="Health Filter" accent="#ffc66c" subtitle="Services Filter" widgetStyles={WIDGET_STYLES}>
                            <div style={WIDGET_STYLES.healthCounterRow}>
                                <button
                                    type="button"
                                    title={getCounterTooltip("danger")}
                                    style={{
                                        ...WIDGET_STYLES.healthCounterItem,
                                        ...getHealthStyle("danger"),
                                        ...(healthFilter === getCounterFilterMode("danger") ? WIDGET_STYLES.healthCounterItemActiveDanger : {}),
                                    }}
                                    onClick={() => setHealthFilter(getCounterFilterMode("danger"))}
                                >
                                    <div style={WIDGET_STYLES.healthCounterLabel}>Danger</div>
                                    <div style={WIDGET_STYLES.healthCounterValue}>{healthCounts.danger}</div>
                                </button>
                                <button
                                    type="button"
                                    title={getCounterTooltip("warn")}
                                    style={{
                                        ...WIDGET_STYLES.healthCounterItem,
                                        ...getHealthStyle("warn"),
                                        ...(healthFilter === getCounterFilterMode("warn") ? WIDGET_STYLES.healthCounterItemActiveWarn : {}),
                                    }}
                                    onClick={() => setHealthFilter(getCounterFilterMode("warn"))}
                                >
                                    <div style={WIDGET_STYLES.healthCounterLabel}>Warn</div>
                                    <div style={WIDGET_STYLES.healthCounterValue}>{healthCounts.warn}</div>
                                </button>
                                <button
                                    type="button"
                                    title={getCounterTooltip("healthy")}
                                    style={{
                                        ...WIDGET_STYLES.healthCounterItem,
                                        ...(healthFilter === getCounterFilterMode("healthy") ? WIDGET_STYLES.healthCounterItemActive : {}),
                                    }}
                                    onClick={() => setHealthFilter(getCounterFilterMode("healthy"))}
                                >
                                    <div style={WIDGET_STYLES.healthCounterLabel}>Healthy</div>
                                    <div style={WIDGET_STYLES.healthCounterValue}>{healthCounts.healthy}</div>
                                </button>
                            </div>
                            <div style={WIDGET_STYLES.filterBar}>
                                {[
                                    { id: "danger", label: "Danger" },
                                    { id: "warn", label: "Warn+" },
                                    { id: "all", label: "All" },
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        title={getFilterTooltip(mode.id)}
                                        style={{
                                            ...WIDGET_STYLES.filterButton,
                                            ...(healthFilter === mode.id
                                                ? mode.id === "danger"
                                                    ? WIDGET_STYLES.filterButtonActiveDanger
                                                    : mode.id === "warn"
                                                        ? WIDGET_STYLES.filterButtonActiveWarn
                                                        : WIDGET_STYLES.filterButtonActive
                                                : {}),
                                        }}
                                        onClick={() => setHealthFilter(mode.id)}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {filteredMenuGroups.map((group) => (
                            <div data-dashboard-theme-role="menu-group" key={group.id} style={WIDGET_STYLES.menuGroup}>
                                <button
                                    type="button"
                                    data-dashboard-theme-role="navigation-group"
                                    style={WIDGET_STYLES.menuHeaderButton}
                                    onClick={() => updateGroup(group.id)}
                                >
                                    {uiState.expandedGroups[group.id] ? "- " : "+ "}{group.title}
                                </button>
                                {uiState.expandedGroups[group.id] ? (
                                    <div>
                                        {group.items.map((item) => {
                                            const itemLevel = item.dashboardViewId
                                                ? "neutral"
                                                : item.shortcut
                                                    ? "neutral"
                                                : serviceHealthById[item.id]?.level ?? "neutral";
                                            const itemSelected = item.dashboardViewId
                                                ? activeView?.id === item.dashboardViewId
                                                : item.shortcut
                                                    ? false
                                                : !activeView && selectedItem === item.id;
                                            const itemService = item.dashboardViewId
                                                || item.shortcut
                                                ? null
                                                : dashboardServiceRegistry.services.find((candidate) => candidate.id === item.id);
                                            const itemHasRuntime = Boolean(itemService?.pluginFile);
                                            const itemRunning = itemHasRuntime
                                                && homeScripts.some((script) => script?.filename === itemService.pluginFile && script?.running);
                                            const itemStatusDotColor = !itemHasRuntime
                                                ? null
                                                : itemRunning
                                                    ? "#6ee7a8"
                                                    : itemService?.pluginMetadata?.daemon === true
                                                        ? "#ff8080"
                                                        : "#ffd88a";
                                            const allItemRequirementBadges = showMainMenuUnlockGlyphs && itemService
                                                ? buildPluginMenuRequirementBadges([
                                                    ...(Array.isArray(itemService.pluginMetadata?.menuUnlocks)
                                                        ? itemService.pluginMetadata.menuUnlocks
                                                        : []),
                                                    ...(Array.isArray(itemService.requirements)
                                                        ? itemService.requirements
                                                        : []),
                                                ])
                                                : [];
                                            const itemRequirementBadges = compactPluginMenuRequirementBadges(
                                                allItemRequirementBadges,
                                                getPluginMenuRequirementBadgeBudget(
                                                    menuUnlockGlyphMaxCount,
                                                    itemLevel,
                                                    Boolean(itemStatusDotColor),
                                                ),
                                            );
                                            return (
                                            <button
                                                type="button"
                                                data-dashboard-theme-role="navigation-item"
                                                key={item.id}
                                                title={getServiceItemTooltip(item.id)}
                                                style={{
                                                    ...WIDGET_STYLES.menuItemButton,
                                                    ...(itemSelected ? getActiveHealthStyle("neutral") : {})
                                                }}
                                                onMouseDown={(event) => selectMenuItem(event, item.id)}
                                                onClick={(event) => selectMenuItemFromKeyboard(event, item.id)}
                                            >
                                                <span style={{
                                                    flex: "1 1 auto",
                                                    minWidth: 0,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                }}>
                                                    <span style={{
                                                        minWidth: 0,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        {item.label}
                                                    </span>
                                                    {renderHealthBadge(itemLevel)}
                                                </span>
                                                {itemRequirementBadges.length > 0 || itemStatusDotColor ? (
                                                    <span style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        flex: "0 0 auto",
                                                        gap: "5px",
                                                        marginLeft: "auto",
                                                    }}>
                                                        {renderMenuRequirementBadges(itemRequirementBadges)}
                                                        {itemStatusDotColor ? (
                                                            <span style={{ color: itemStatusDotColor }}>●</span>
                                                        ) : null}
                                                    </span>
                                                ) : null}
                                            </button>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                        {visibleItemIds.length === 0 ? (
                            <div style={WIDGET_STYLES.muted}>No services match this health filter.</div>
                        ) : null}
                    </div>
                </div>

                {selectedWorkspaceService ? (
                    <>
                        <div
                            ref={centerColumnRef}
                            data-dashboard-theme-role="workspace-column"
                            style={{ ...WIDGET_STYLES.column, minWidth: 0, overflow: "hidden" }}
                        >
                            <WorkspaceProviderView
                                providerId={selectedWorkspaceProviderId}
                                dashboardTheme={dashboardTheme}
                                onInputFocusChange={setOptionsInputFocus}
                            />
                        </div>
                        {visibleWorkspaceWidgets.length > 0 ? (
                            <div
                                data-dashboard-theme-role="workspace-column"
                                style={{ ...WIDGET_STYLES.column, minWidth: 0, overflow: "hidden" }}
                            >
                                <div
                                    ref={playerStatsColumnRef}
                                    style={{ height: "100%", overflowY: "auto" }}
                                    onScroll={(e) => rememberScroll("playerStats", e.currentTarget.scrollTop)}
                                >
                                    {visibleWorkspaceWidgets.map(renderWorkspaceWidget)}
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <>
                        <div
                            ref={centerColumnRef}
                            data-dashboard-theme-role="workspace-column"
                            style={WIDGET_STYLES.column}
                            onScroll={(e) => rememberScroll("center", e.currentTarget.scrollTop)}
                        >
                            {selectedItem === "global.startOrder" ? (
                                <>
                                    <Card title="Kill Controls" accent="#ff9a9a" subtitle="Kill scripts across home and remote hosts" widgetStyles={WIDGET_STYLES}>
                                        {renderServiceActions(globalScriptControlActions)}
                                    </Card>
                                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                                </>
                            ) : null}
                            {renderSubWidgets()}
                        </div>

                        {visibleWorkspaceWidgets.length > 0 ? (
                            <div
                                data-dashboard-theme-role="workspace-column"
                                style={{
                                    ...WIDGET_STYLES.column,
                                    display: "grid",
                                    gridTemplateColumns: `minmax(0, 1fr) ${PLAYER_STATS_WIDGET_WIDTH}px`,
                                    gap: "10px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    ref={rightColumnRef}
                                    style={{ minWidth: 0, height: "100%", overflowY: "auto" }}
                                    onScroll={(e) => rememberScroll("right", e.currentTarget.scrollTop)}
                                >
                                    {renderDataPanel()}
                                </div>
                                <div
                                    ref={playerStatsColumnRef}
                                    style={{
                                        ...WIDGET_STYLES.playerStatusDividerColumn,
                                        height: "100%",
                                        overflowY: "auto",
                                    }}
                                    onScroll={(e) => rememberScroll("playerStats", e.currentTarget.scrollTop)}
                                >
                                    {visibleWorkspaceWidgets.map(renderWorkspaceWidget)}
                                </div>
                            </div>
                        ) : (
                            <div
                                ref={rightColumnRef}
                                data-dashboard-theme-role="workspace-column"
                                style={WIDGET_STYLES.column}
                                onScroll={(e) => rememberScroll("right", e.currentTarget.scrollTop)}
                            >
                                <div style={{ minWidth: 0 }}>{renderDataPanel()}</div>
                            </div>
                        )}
                    </>
                )}
                </div>
            </>
            )}
        </DashboardShell>
    );
}

function printFallbackDashboard(ns, homeRamStatus, runningScriptCount, serviceCount) {
    ns.tprint("=== AUTOMATION DASHBOARD ===");
    ns.tprint(`Services: ${serviceCount}`);
    ns.tprint(`Scripts:  ${runningScriptCount} running`);
    ns.tprint(`Home RAM: ${formatRam(homeRamStatus.used)} / ${formatRam(homeRamStatus.total)}`);
    ns.tprint("React UI unavailable; plugin telemetry remains available in data files.");
}

function readDashboardViewport(ns) {
    try {
        return normalizeViewport(ns.ui.windowSize());
    } catch (error) {
        return normalizeViewport({ width: 1920, height: 1080 });
    }
}

function readTailGeometry(tailProperties, fallback) {
    return {
        x: Number.isFinite(Number(tailProperties?.x)) ? Number(tailProperties.x) : fallback.x,
        y: Number.isFinite(Number(tailProperties?.y)) ? Number(tailProperties.y) : fallback.y,
        width: Number.isFinite(Number(tailProperties?.width)) ? Number(tailProperties.width) : fallback.width,
        height: Number.isFinite(Number(tailProperties?.height)) ? Number(tailProperties.height) : fallback.height,
    };
}

function getStoredWindowedGeometry(options, viewport) {
    const fallback = getDefaultWindowedGeometry(viewport);
    const x = Number(options?.dashboardWindowedX);
    const y = Number(options?.dashboardWindowedY);
    return fitWindowedGeometryToViewport({
        x: Number.isFinite(x) && x >= 0 ? x : fallback.x,
        y: Number.isFinite(y) && y >= 0 ? y : fallback.y,
        width: Number(options?.dashboardWindowedWidth) || fallback.width,
        height: Number(options?.dashboardWindowedHeight) || fallback.height,
    }, viewport);
}

function applyTailGeometry(ns, current, target) {
    if (!target) return;
    try {
        if (Math.abs(Number(current?.width) - target.width) > 0.5 || Math.abs(Number(current?.height) - target.height) > 0.5) {
            ns.ui.resizeTail(target.width, target.height);
        }
        if (Math.abs(Number(current?.x) - target.x) > 0.5 || Math.abs(Number(current?.y) - target.y) > 0.5) {
            ns.ui.moveTail(target.x, target.y);
        }
    } catch (error) {
        // Keep the native tail usable if the host rejects a transient geometry update.
    }
}

function persistDashboardTailLayout(ns) {
    if (!dashboardTailLayoutState.persistPending || Date.now() < dashboardTailLayoutState.persistReadyAt) return;
    const currentOptions = loadDashboardOptions(ns);
    const windowed = dashboardTailLayoutState.windowedGeometry;
    if (!windowed) return;
    const nextOptions = normalizeDashboardOptionsForCompare({
        ...currentOptions,
        dashboardLastWindowMode: dashboardTailLayoutState.modeBeforeMinimize,
        dashboardWindowedX: windowed.x,
        dashboardWindowedY: windowed.y,
        dashboardWindowedWidth: windowed.width,
        dashboardWindowedHeight: windowed.height,
    });
    if (!areDashboardOptionsEqual(currentOptions, nextOptions)) {
        ns.write(DASHBOARD_OPTIONS_FILE, JSON.stringify(nextOptions), "w");
    }
    dashboardTailLayoutState.persistPending = false;
    dashboardTailLayoutState.persistReadyAt = 0;
}

function syncDashboardTailLayout(ns, options = getDefaultOptions()) {
    let tailProperties = null;
    try {
        tailProperties = ns.self()?.tailProperties ?? null;
    } catch (error) {
        tailProperties = null;
    }

    const viewport = readDashboardViewport(ns);
    const defaultGeometry = getDefaultWindowedGeometry(viewport);
    if (!tailProperties) {
        dashboardTailLayoutState.visible = false;
        return buildDashboardLayoutSnapshot({
            mode: dashboardTailLayoutState.mode,
            geometry: dashboardTailLayoutState.windowedGeometry ?? defaultGeometry,
            viewport,
        });
    }

    if (!dashboardTailLayoutState.initialized) {
        dashboardTailLayoutState.windowedGeometry = getStoredWindowedGeometry(options, viewport);
        dashboardTailLayoutState.mode = resolveDashboardStartupWindowMode(
            options.dashboardWindowStartupMode,
            options.dashboardLastWindowMode
        );
        dashboardTailLayoutState.modeBeforeMinimize = dashboardTailLayoutState.mode;
        dashboardTailLayoutState.minimized = Boolean(tailProperties.minimized);
        dashboardTailLayoutState.restoreGeometry = dashboardTailLayoutState.mode === DASHBOARD_WINDOW_MODE_MAXIMIZED
            ? getMaximizedTailGeometry(viewport)
            : dashboardTailLayoutState.windowedGeometry;
        if (dashboardTailLayoutState.mode !== normalizeDashboardWindowMode(options.dashboardLastWindowMode)) {
            dashboardTailLayoutState.persistPending = true;
            dashboardTailLayoutState.persistReadyAt = 0;
        }
        dashboardTailLayoutState.initialized = true;
    } else if (!dashboardTailLayoutState.visible) {
        dashboardTailLayoutState.restoreGeometry = dashboardTailLayoutState.mode === DASHBOARD_WINDOW_MODE_MAXIMIZED
            ? getMaximizedTailGeometry(viewport)
            : fitWindowedGeometryToViewport(dashboardTailLayoutState.windowedGeometry, viewport);
    }

    let currentGeometry = readTailGeometry(tailProperties, defaultGeometry);
    const minimized = Boolean(tailProperties.minimized);
    const minimizedChanged = minimized !== dashboardTailLayoutState.minimized;

    if (dashboardTailLayoutState.requestedMode) {
        const requestedMode = normalizeDashboardWindowMode(dashboardTailLayoutState.requestedMode);
        if (!minimized && dashboardTailLayoutState.mode === DASHBOARD_WINDOW_MODE_WINDOWED) {
            dashboardTailLayoutState.windowedGeometry = fitWindowedGeometryToViewport(currentGeometry, viewport);
        }
        dashboardTailLayoutState.mode = requestedMode;
        dashboardTailLayoutState.modeBeforeMinimize = requestedMode;
        dashboardTailLayoutState.restoreGeometry = requestedMode === DASHBOARD_WINDOW_MODE_MAXIMIZED
            ? getMaximizedTailGeometry(viewport)
            : fitWindowedGeometryToViewport(dashboardTailLayoutState.windowedGeometry, viewport);
        dashboardTailLayoutState.requestedMode = null;
        dashboardTailLayoutState.persistPending = true;
        dashboardTailLayoutState.persistReadyAt = 0;
    }

    let targetGeometry = currentGeometry;
    if (minimized) {
        if (minimizedChanged) {
            if (dashboardTailLayoutState.mode === DASHBOARD_WINDOW_MODE_WINDOWED) {
                dashboardTailLayoutState.windowedGeometry = fitWindowedGeometryToViewport(currentGeometry, viewport);
                dashboardTailLayoutState.persistPending = true;
                dashboardTailLayoutState.persistReadyAt = Date.now() + 1000;
            }
            dashboardTailLayoutState.modeBeforeMinimize = dashboardTailLayoutState.mode;
        }
        targetGeometry = getMinimizedTailGeometry(viewport, dashboardTailLayoutState.windowedGeometry?.height ?? TAIL_HEIGHT);
    } else {
        if (minimizedChanged) {
            dashboardTailLayoutState.mode = dashboardTailLayoutState.modeBeforeMinimize;
            dashboardTailLayoutState.restoreGeometry = dashboardTailLayoutState.mode === DASHBOARD_WINDOW_MODE_MAXIMIZED
                ? getMaximizedTailGeometry(viewport)
                : fitWindowedGeometryToViewport(dashboardTailLayoutState.windowedGeometry, viewport);
        }

        if (dashboardTailLayoutState.mode === DASHBOARD_WINDOW_MODE_MAXIMIZED) {
            targetGeometry = getMaximizedTailGeometry(viewport);
        } else if (dashboardTailLayoutState.restoreGeometry) {
            targetGeometry = fitWindowedGeometryToViewport(dashboardTailLayoutState.restoreGeometry, viewport);
        } else {
            const observedWindowedGeometry = fitWindowedGeometryToViewport(currentGeometry, viewport);
            if (tailGeometryDiffers(observedWindowedGeometry, dashboardTailLayoutState.windowedGeometry)) {
                dashboardTailLayoutState.windowedGeometry = observedWindowedGeometry;
                dashboardTailLayoutState.persistPending = true;
                dashboardTailLayoutState.persistReadyAt = Date.now() + 1000;
            }
            targetGeometry = observedWindowedGeometry;
        }
    }

    applyTailGeometry(ns, currentGeometry, targetGeometry);
    currentGeometry = targetGeometry;
    dashboardTailLayoutState.restoreGeometry = null;
    dashboardTailLayoutState.minimized = minimized;
    dashboardTailLayoutState.visible = true;

    const nextTitle = minimized ? "Dashboard" : "Automation Dashboard";
    if (dashboardTailLayoutState.lastTitle !== nextTitle) {
        try {
            setDashboardTailTitle(ns, nextTitle);
        } catch (error) {
            // Title updates are cosmetic; continue with the current native title.
        }
    }

    persistDashboardTailLayout(ns);
    const visibleGeometry = minimized
        ? (dashboardTailLayoutState.modeBeforeMinimize === DASHBOARD_WINDOW_MODE_MAXIMIZED
            ? getMaximizedTailGeometry(viewport)
            : dashboardTailLayoutState.windowedGeometry)
        : currentGeometry;
    return buildDashboardLayoutSnapshot({
        mode: minimized ? dashboardTailLayoutState.modeBeforeMinimize : dashboardTailLayoutState.mode,
        minimized,
        geometry: visibleGeometry,
        viewport,
        titleHeight: DEFAULT_TAIL_TITLE_HEIGHT,
    });
}

function ensureSingleDashboardInstance(ns) {
    if (!ns) return true;

    const scriptName = ns.getScriptName();
    const instances = ns.ps("home")
        .filter((process) => process?.filename === scriptName)
        .sort((left, right) => (left?.pid ?? 0) - (right?.pid ?? 0));

    if (instances.length <= 1) {
        return true;
    }

    const primaryPid = instances[0]?.pid ?? ns.pid;
    if (ns.pid !== primaryPid) {
        return false;
    }

    return true;
}

function isTemporaryDashboardRun(ns) {
    try {
        return ns.self()?.temporary === true;
    } catch (error) {
        return false;
    }
}

function registerDashboardTailCleanup(ns, isDaemon) {
    if (!isDaemon) return;
    const dashboardPid = ns.pid;
    ns.atExit(() => {
        try {
            // Bitburner keeps an ordinary tail open after its process stops. Closing it while
            // the process is still addressable (atExit runs before process removal) prevents a
            // later autoexec launch from opening a second dashboard beside a stale dead tail.
            ns.ui.closeTail(dashboardPid);
        } catch (error) {
            // The tail may already have been closed manually.
        }
    }, "dashboard-tail-cleanup");
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const launchOptions = parseDashboardLaunchOptions(ns.args);
    const { isDaemon, autoStart } = launchOptions;

    if (!ensureSingleDashboardInstance(ns)) {
        return;
    }
    const temporaryRun = isTemporaryDashboardRun(ns);
    registerDashboardTailCleanup(ns, isDaemon);

    // These module-level sets support callbacks during a running dashboard, but each new main()
    // invocation must perform its own initial option replay even if the game reuses module state.
    latestHomeProcessFilenames = new Set();
    previousHomeProcessFilenames = new Set();
    lastOptionReplayServiceRegistry = null;

    setDashboardViewDragActiveState(false);
    rememberDashboardFileManagerRender("", "");
    rememberDashboardNetworkMapRender("", "");

    React = getReactLib();

    if (React) {
        ns.ui.openTail();
        setDashboardTailTitle(ns, "Automation Dashboard");
    }

    const supervisorAutostartEnabled = isServiceAutostartEnabled(SERVICE_SUPERVISOR_SCRIPT, loadDashboardOptions(ns));
    const startServiceSupervisor = shouldAutoStartServiceSupervisor(autoStart, supervisorAutostartEnabled);
    if (!temporaryRun) {
        ns.tprint(isDaemon
            ? `Starting Automation Dashboard in daemon mode${startServiceSupervisor ? " with integration auto-start" : ""}...`
            : `Starting Automation Dashboard in one-shot mode${startServiceSupervisor ? " with integration auto-start" : ""}...`);
    }
    if (startServiceSupervisor) {
        executeQueuedNetscriptAction(ns, {
            kind: "dashboard",
            actionId: DASHBOARD_ACTION_IDS.START_INTEGRATIONS,
        });
    }

    while (true) {
        applyQueuedDashboardActions(ns);

        const cycleSnapshot = dashboardSnapshotCoordinator.collectCycle(ns);
        latestHomeProcessFilenames = new Set(cycleSnapshot.homeProcesses.map((process) => process.filename));
        const scriptCatalog = dashboardSnapshotCoordinator.getOrCreate(
            "script-catalog",
            cycleSnapshot.now,
            10000,
            cycleSnapshot.fileSignature,
            () => buildHomeScriptCatalog(ns, cycleSnapshot.homeFiles)
        );
        let homeScripts = applyHomeProcessState(scriptCatalog, cycleSnapshot.homeProcesses);
        const runningProcessSnapshot = cycleSnapshot.runningProcessSnapshot;
        const runningScriptCount = runningProcessSnapshot.totalCount;
        const dashboardServiceRegistry = dashboardSnapshotCoordinator.getOrCreate(
            "service-registry",
            cycleSnapshot.now,
            5000,
            cycleSnapshot.fileSignature,
            () => rebuildDashboardServiceRegistry(ns, homeScripts)
        );
        const dashboardViewRegistry = dashboardSnapshotCoordinator.getOrCreate(
            "view-registry",
            cycleSnapshot.now,
            5000,
            cycleSnapshot.fileSignature,
            () => rebuildDashboardViewRegistry(ns, homeScripts)
        );
        const dashboardMenuGroupRegistry = rebuildDashboardMenuGroupRegistry(
            dashboardServiceRegistry.services,
            dashboardViewRegistry.views,
            dashboardServiceRegistry.shortcuts
        );
        logMenuGroupRegistryIssues(dashboardMenuGroupRegistry);
        homeScripts = applyPluginScriptMetadata(homeScripts, dashboardServiceRegistry);
        const persistedOptions = loadDashboardOptions(ns);
        // Re-apply persisted options only after plugin discovery has populated the service
        // registry. On a cold dashboard launch getDashboardServiceRegistry() otherwise falls back
        // to the core-only registry, misses every plugin child, and the old process-set bookkeeping
        // prevents a later retry. Sweep all running scripts whenever the discovered registry
        // changes; on ordinary cycles, only prime newly started scripts. A service can match both
        // its parent and managed children, so de-duplicate each integration within the sweep.
        const serviceRegistryChanged = dashboardServiceRegistry !== lastOptionReplayServiceRegistry;
        const replayedIntegrationIds = new Set();
        for (const filename of latestHomeProcessFilenames) {
            if (serviceRegistryChanged || !previousHomeProcessFilenames.has(filename)) {
                applyPersistedPluginOptions(ns, filename, replayedIntegrationIds, persistedOptions);
            }
        }
        previousHomeProcessFilenames = latestHomeProcessFilenames;
        lastOptionReplayServiceRegistry = dashboardServiceRegistry;
        const layoutSnapshot = React
            ? syncDashboardTailLayout(ns, persistedOptions)
            : buildDashboardLayoutSnapshot({
                mode: DASHBOARD_WINDOW_MODE_WINDOWED,
                geometry: getDefaultWindowedGeometry(readDashboardViewport(ns)),
                viewport: readDashboardViewport(ns),
            });
        const gameTheme = ns.ui.getTheme();
        const gameStyles = ns.ui.getStyles();
        activeDashboardTheme = buildDashboardTheme(persistedOptions.dashboardThemeMode, gameTheme, {
            gameStyles,
            textSizeMode: persistedOptions.dashboardTextSizeMode,
            maximized: layoutSnapshot.maximized,
        });
        const homeRamStatus = getHomeRamStatus(ns);
        // Computed here (the safe main-loop NS context) and threaded down as a prop rather than
        // called directly from inside a React handler - a click that re-renders the already-
        // mounted tree runs independently of this loop's own tick cadence, and calling any ns.*
        // function synchronously from within that render risks colliding with this loop's own
        // in-flight ns.sleep(), which Bitburner treats as a fatal concurrency error.
        const autostartPaused = ns.fileExists(AUTOSTART_PAUSE_FILE, "home");
        const telemetryByServiceId = dashboardSnapshotCoordinator.reuseRecord("telemetry", Object.fromEntries(
            getDashboardServiceRegistry().services
                .filter((service) => service.pluginMetadata?.telemetry?.path)
                .map((service) => [service.id, loadPluginIntegrationStats(ns, service.pluginMetadata)])
        ));
        const capabilitySnapshot = dashboardSnapshotCoordinator.getOrCreate(
            "capabilities",
            cycleSnapshot.now,
            30000,
            cycleSnapshot.fileSignature,
            () => buildCapabilitySnapshot(ns, cycleSnapshot.homeFiles)
        );
        const requirementsSignature = JSON.stringify(getDashboardServiceRegistry().services.map((service) => ({
            id: service.id,
            requirements: service.requirements,
            panelRequirements: (service.pluginMetadata?.panels ?? []).map((panel) => ({
                id: panel.id,
                requirements: panel.requirements,
            })),
        })));
        const pluginRequirements = dashboardSnapshotCoordinator.getOrCreate(
            "plugin-requirements",
            cycleSnapshot.now,
            30000,
            `${cycleSnapshot.fileSignature}:${requirementsSignature}`,
            () => buildPluginRequirementsSnapshot(
                ns,
                getDashboardServiceRegistry().services,
                capabilitySnapshot
            )
        );
        const currentDashboardUiState = globalThis[DASHBOARD_UI_STATE_KEY];
        const activeDashboardViewId = String(currentDashboardUiState?.activeViewId ?? "");
        const activeDashboardView = dashboardViewRegistry.byId.get(activeDashboardViewId);
        const fileManagerSnapshots = activeDashboardView?.renderer === "file-manager"
            ? dashboardSnapshotCoordinator.getOrCreate(
                `file-manager:${activeDashboardView.id}`,
                cycleSnapshot.now,
                5000,
                `${cycleSnapshot.fileSignature}:${activeDashboardView.descriptorFile ?? activeDashboardView.id}`,
                () => buildFileManagerSnapshots(ns, [activeDashboardView], {
                    homeFiles: cycleSnapshot.homeFiles,
                    homeProcesses: cycleSnapshot.homeProcesses,
                })
            )
            : EMPTY_DASHBOARD_SNAPSHOT_MAP;
        const scriptLogSnapshots = activeDashboardView?.renderer === "script-log"
            ? dashboardSnapshotCoordinator.getOrCreate(
                `script-log:${activeDashboardView.id}`,
                cycleSnapshot.now,
                1000,
                getDashboardViewInteractionState(activeDashboardView.id).selectedId,
                () => ({
                    [activeDashboardView.id]: buildScriptLogSnapshot(ns, activeDashboardView, {
                        selectedId: getDashboardViewInteractionState(activeDashboardView.id).selectedId,
                        homeProcesses: cycleSnapshot.homeProcesses,
                    }),
                })
            )
            : EMPTY_DASHBOARD_SNAPSHOT_MAP;
        const activeFileManagerSnapshot = activeDashboardView?.renderer === "file-manager"
            ? fileManagerSnapshots[activeDashboardView.id] ?? null
            : null;
        const fileManagerRenderSignature = activeFileManagerSnapshot
            ? getDashboardFileManagerRenderSignature(
                activeDashboardView.id,
                activeFileManagerSnapshot,
                activeDashboardTheme.signature,
                `${layoutSnapshot.mode}:${layoutSnapshot.tailWidth}x${layoutSnapshot.tailHeight}`
            )
            : "";
        // The tail renderer rebuilds interactive DOM. Keep the File Manager mounted until
        // its file topology, manifest, or explicit refresh/action result actually changes.
        const fileManagerRenderStable = activeFileManagerSnapshot
            ? isDashboardFileManagerRenderStable(activeDashboardView.id, fileManagerRenderSignature)
            : false;
        // Same idea as the File Manager stability check above, for network-map: while it's the
        // active full-window view, only ITS bound service's telemetry (plus its runtime status,
        // theme, and layout) should be able to force a remount - other plugins ticking their own
        // telemetry in the background must not blow away in-progress map interactions. See the
        // getDashboardServiceScopedViewRenderSignature note for why this matters.
        const activeNetworkMapServiceId = activeDashboardView?.renderer === "network-map"
            ? String(activeDashboardView?.data?.serviceId ?? "")
            : "";
        const activeNetworkMapService = activeNetworkMapServiceId
            ? getDashboardServiceRegistry().services.find((service) => service.id === activeNetworkMapServiceId)
            : null;
        const activeNetworkMapServiceStatus = activeNetworkMapService
            ? {
                serviceId: activeNetworkMapService.id,
                label: activeNetworkMapService.menuLabel,
                requiresRuntime: Boolean(activeNetworkMapService.pluginFile),
                running: !activeNetworkMapService.pluginFile
                    || homeScripts.some((script) => script?.filename === activeNetworkMapService.pluginFile && script?.running),
            }
            : null;
        const activeNetworkMapTelemetry = activeNetworkMapServiceId
            ? applyDashboardViewTelemetry(
                telemetryByServiceId?.[activeNetworkMapServiceId] ?? null,
                activeDashboardView,
                telemetryByServiceId
            )
            : null;
        const networkMapRenderSignature = activeNetworkMapServiceId
            ? getDashboardServiceScopedViewRenderSignature(
                activeDashboardView.id,
                activeNetworkMapTelemetry,
                activeNetworkMapServiceStatus,
                activeDashboardTheme.signature,
                `${layoutSnapshot.mode}:${layoutSnapshot.tailWidth}x${layoutSnapshot.tailHeight}`
            )
            : "";
        const networkMapRenderStable = activeNetworkMapServiceId
            ? isDashboardNetworkMapRenderStable(activeDashboardView.id, networkMapRenderSignature)
            : false;
        const activeStartOrder = !activeDashboardViewId
            && currentDashboardUiState?.selectedItem === "global.startOrder"
            && String(currentDashboardUiState?.centerPanels?.["global.startOrder"] ?? "order") === "order";
        const startOrderRenderSignature = activeStartOrder
            ? getDashboardStartOrderRenderSignature(
                homeScripts,
                activeDashboardTheme.signature,
                `${layoutSnapshot.mode}:${layoutSnapshot.tailWidth}x${layoutSnapshot.tailHeight}`
            )
            : "";
        const startOrderRenderStable = activeStartOrder
            ? isDashboardStartOrderRenderStable(startOrderRenderSignature)
            : false;
        const optionsInputFocused = Boolean(globalThis[DASHBOARD_OPTIONS_INPUT_FOCUS_KEY]);
        const viewDragActive = Boolean(globalThis[DASHBOARD_VIEW_DRAG_ACTIVE_KEY]);

        if (React) {
            if (optionsInputFocused || viewDragActive || fileManagerRenderStable
                || networkMapRenderStable || startOrderRenderStable) {
                // Keep processing actions and state, but preserve the active DOM interaction until it finishes.
                if (!isDaemon) break;
                const tickMs = layoutSnapshot.minimized ? DASHBOARD_MINIMIZED_UI_TICK_MS : DASHBOARD_UI_TICK_MS;
                await ns.sleep(tickMs);
                applyQueuedDashboardActions(ns);
                continue;
            }

            // Everything DashboardWidget's visible output depends on, gathered here. Active-view
            // navigation doesn't need to be tracked separately: the already-mounted tree handles
            // it reactively via its own React state the instant the user clicks, independent of
            // whether the Netscript side reprints a fresh tree. This only decides whether a fresh
            // tree carrying updated Netscript-sourced data (telemetry, homeScripts, options, ...)
            // is worth the cost of ns.clearLog()/printRaw()/renderTail() this tick.
            const renderSignature = [
                persistedOptions,
                homeScripts,
                dashboardMenuGroupRegistry,
                homeRamStatus,
                runningProcessSnapshot,
                telemetryByServiceId,
                pluginRequirements,
                fileManagerSnapshots,
                scriptLogSnapshots,
                layoutSnapshot,
                activeDashboardTheme.signature,
                autostartPaused,
            ];
            const canSkipRender = Array.isArray(lastRenderedSignature)
                && renderSignature.length === lastRenderedSignature.length
                && renderSignature.every((value, index) => value === lastRenderedSignature[index]);

            if (!canSkipRender) {
                ns.clearLog();
                ns.printRaw(
                    <DashboardWidget
                        persistedOptions={persistedOptions}
                        gameTheme={gameTheme}
                        gameStyles={gameStyles}
                        homeScripts={homeScripts}
                        homeRamStatus={homeRamStatus}
                        runningScriptCount={runningScriptCount}
                        runningProcessSnapshot={runningProcessSnapshot}
                        telemetryByServiceId={telemetryByServiceId}
                        pluginRequirements={pluginRequirements}
                        fileManagerSnapshots={fileManagerSnapshots}
                        scriptLogSnapshots={scriptLogSnapshots}
                        layoutSnapshot={layoutSnapshot}
                        autostartPaused={autostartPaused}
                    ></DashboardWidget>
                );
                ns.ui.renderTail();
                rememberDashboardFileManagerRender(
                    activeFileManagerSnapshot ? activeDashboardView.id : "",
                    fileManagerRenderSignature
                );
                rememberDashboardNetworkMapRender(
                    activeNetworkMapServiceId ? activeDashboardView.id : "",
                    networkMapRenderSignature
                );
                lastRenderedSignature = renderSignature;
            }
            rememberDashboardStartOrderRender(activeStartOrder ? startOrderRenderSignature : "");
        } else {
            printFallbackDashboard(
                ns,
                homeRamStatus,
                runningScriptCount,
                getDashboardServiceRegistry().services.length
            );
        }

        if (!isDaemon) break;

        const tickMs = layoutSnapshot.minimized ? DASHBOARD_MINIMIZED_UI_TICK_MS : DASHBOARD_UI_TICK_MS;
        await ns.sleep(tickMs);
        applyQueuedDashboardActions(ns);
    }
}
