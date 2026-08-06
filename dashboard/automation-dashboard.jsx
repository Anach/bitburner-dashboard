import { buildDashboardActions, buildScopedKillListActions, DASHBOARD_ACTION_GROUPS } from "dashboard/libs/dashboard-actions.js";
import {
    DEFAULT_IGNORED_SCRIPT_FILES_OPTION,
    DEFAULT_IGNORED_SCRIPT_FOLDERS,
    DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION,
    dashboardOptionsEqual,
    getDefaultDashboardOptions,
    HIDE_UNQUALIFIED_PLUGINS_MODES,
    isServiceVisibleInMenu,
    normalizeDashboardOptions,
    normalizeHideUnqualifiedPluginsMode,
} from "dashboard/libs/dashboard-options.js";
import {
    applyDashboardViewWidgetContributions as applyDashboardViewWidgetContributionsDefinition,
    buildDashboardMenuGroups,
    getDefaultSelectedServiceId as getDefaultSelectedServiceIdDefinition,
    getViewOnlyPluginEntries,
    isViewQualified,
    validateDashboardServices as validateDashboardServicesDefinition,
    validateDashboardViews as validateDashboardViewsDefinition,
} from "dashboard/libs/dashboard-registry.js";
import { buildScriptListActions, buildServiceAutostartAction } from "dashboard/libs/script-list-actions.js";
import { getDashboardPluginAdapterFactories } from "dashboard/libs/plugin-adapters.js";
import { buildDashboardPluginServices, discoverDashboardPlugins, discoverDashboardViews, isDashboardPluginDescriptorFilename } from "dashboard/libs/plugin-loader.js";
import { ACTION_TONE_STYLES, normalizeActionTone } from "dashboard/libs/action-tones.js";
import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    DASHBOARD_THEME_MODES,
    DASHBOARD_TEXT_SIZE_MODES,
    buildDashboardTheme,
    createDashboardThemedReact,
    getGameStylesSignature,
    getGameThemeSignature,
    normalizeDashboardTextSizeMode,
    normalizeDashboardThemeMode,
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
import { formatMoney, formatRam } from "dashboard/libs/format-utils.js";
import { getDashboardRestartArgs, parseDashboardLaunchOptions } from "dashboard/libs/startup-policy.js";
import {
    DASHBOARD_ACTION_WORKER_RESULT_FILE,
    DASHBOARD_ACTION_WORKER_SCRIPT,
    normalizeActionWorkerEnvelope,
    parseActionWorkerResult,
} from "dashboard/libs/action-worker-contract.js";
import { createActionWorkerQueue } from "dashboard/libs/action-worker-queue.js";
import { dispatchDashboardActions } from "dashboard/libs/dashboard-action-dispatch.js";
import { buildDashboardWorkerCommand as buildWorkerCommand } from "dashboard/libs/dashboard-worker-command.js";
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
import { configureDashboardShell, DashboardShell } from "dashboard/renderers/dashboard-shell.jsx";
import { ScriptLogView } from "dashboard/renderers/script-log-view.jsx";
import { buildScriptLogSnapshot } from "dashboard/renderers/script-log-snapshot.js";
import { MailboxView } from "dashboard/renderers/mailbox-view.jsx";
import { BadgeLine, Card, configureDashboardPanels } from "dashboard/renderers/dashboard-panels.jsx";
import { configureDashboardMetrics, RamGauge, TonePill } from "dashboard/renderers/dashboard-metrics.jsx";
import {
    configureSystemOverviewPanels,
    HomePanel,
    PluginRuntimeWarning,
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
    getPluginIntegrationAutoStartFundsThreshold,
    getPluginIntegrationOverviewGauges,
    getPluginIntegrationGraphs,
    getPluginIntegrationOverviewLines,
    loadPluginIntegrationStats,
    normalizePluginIntegrationOptions,
    shouldStartPluginIntegrationAfterOptionChange,
} from "dashboard/libs/plugin-integration.js";
import {
    buildPluginRequirementSection,
    buildPluginRequirementsSnapshot,
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
    isScriptFileIgnored,
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
let activeDashboardTheme = buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let DASH_NS = null;

const DASHBOARD_UI_STATE_KEY = "__dashboard_ui_state_v1";
const DASHBOARD_ACTION_QUEUE_KEY = "__dashboard_action_queue_v1";
const DASHBOARD_SCROLL_STATE_KEY = "__dashboard_scroll_state_v1";
const DASHBOARD_SERVICE_REGISTRY_KEY = "__dashboard_service_registry_v3";
const DASHBOARD_SERVICE_REGISTRY_SOURCE_KEY = "__dashboard_service_registry_source_v2";
const DASHBOARD_VIEW_REGISTRY_KEY = "__dashboard_view_registry_v1";
const DASHBOARD_VIEW_INTERACTION_STATE_KEY = "__dashboard_view_interaction_state_v1";
const DASHBOARD_VIEW_DRAG_ACTIVE_KEY = "__dashboard_view_drag_active_v1";
const DASHBOARD_OPTIONS_INPUT_FOCUS_KEY = "__dashboard_options_input_focus_v1";
const DASHBOARD_FILE_ACTION_RESULT_KEY = "__dashboard_file_action_result_v1";
const DASHBOARD_FILE_VIEW_RENDER_STATE_KEY = "__dashboard_file_view_render_state_v1";
const DASHBOARD_ACTION_WORKER_TIMEOUT_MS = 60000;
const DASHBOARD_OPTIONS_FILE = "data/dashboard_options.json";
const AUTOSTART_PAUSE_FILE = "data/autostart_paused.txt";
const DASHBOARD_SCRIPT = "dashboard/automation-dashboard.jsx";
const SERVICE_SUPERVISOR_SCRIPT = "dashboard/service-supervisor.js";
const DASHBOARD_VIEW_ITEM_PREFIX = "dashboard.view:";
const PLAYER_STATS_WIDGET_WIDTH = 360;
const PLUGIN_RUNTIME_EXCLUDED_FOLDERS = DEFAULT_IGNORED_SCRIPT_FOLDERS;
const TAIL_WIDTH = DEFAULT_TAIL_WIDTH;
const TAIL_HEIGHT = DEFAULT_TAIL_HEIGHT;
const DASHBOARD_UI_TICK_MS = 1000;
const DASHBOARD_MINIMIZED_UI_TICK_MS = 250;
const DASHBOARD_ACTION_POLL_MS = 50;
// Every ns.printRaw() call mounts a brand-new React tree (see wrapUserNode's ever-incrementing
// key in Bitburner's own NetscriptHelpers.tsx) - no useState/useRef survives between ticks. This
// MUST be module-level state, not a ref, or a cooldown guard silently resets to empty every tick
// and never actually blocks anything. Without it, a service that starts and immediately self-exits
// (e.g. hacknet-buyer/server-buyer finding themselves already fully capped and upgraded) gets
// restarted on the very next tick, forever. Five minutes matches the retry backoff already used
// for the same class of problem in singularity/faction-manager.js.
const FUNDS_AUTO_START_COOLDOWN_MS = 5 * 60 * 1000;
const fundsAutoStartCooldowns = new Map();
const dashboardSnapshotCoordinator = createDashboardSnapshotCoordinator();
const dashboardOptionsCache = { raw: null, services: null, value: null };
const scriptCatalogEntryCache = new Map();
let latestHomeProcessFilenames = new Set();

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
    optionsPanel: {
        border: "1px solid #355435",
        borderRadius: "8px",
        background: "rgba(8, 12, 8, 0.98)",
        padding: "10px"
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
    heroAction: {
        flex: "0 0 auto",
        minWidth: "160px",
        padding: "8px 12px",
        textAlign: "center",
        whiteSpace: "nowrap",
        fontWeight: 400,
        background: "rgba(36, 12, 12, 0.78)"
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
    homeHint: {
        color: "#7799b8",
        fontSize: "10px",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        textAlign: "right"
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
        justifyContent: "center",
        minHeight: "130px",
        borderRadius: "7px",
        padding: "8px",
        background: "rgba(5, 9, 8, 0.78)",
        border: "1px solid rgba(110, 231, 168, 0.14)"
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
        gap: "10px",
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
        padding: "5px 6px",
        border: "1px solid rgba(125, 160, 212, 0.14)",
        borderRadius: "5px",
        background: "rgba(7, 12, 10, 0.8)",
        color: "#b9d3c1",
        fontSize: "10px",
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
    mono: {
        fontVariantNumeric: "tabular-nums"
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
            globalOptions: false
        },
        activeViewId: "",
        healthFilter: "all",
        selectedItem: getDefaultSelectedServiceId(),
        centerPanels: {
            "hardware.home": "infrastructure",
            "global.dashboardOptions": "options",
            "global.options": "",
            "global.coreModules": "",
            "global.integrations": "",
            "global.plugins": "",
        }
    };
}

function loadUiState() {
    const base = getDefaultUiState();
    const saved = globalThis[DASHBOARD_UI_STATE_KEY];
    if (!saved || typeof saved !== "object") return base;

    const upgradedSelectedItem = (() => {
        const selected = saved.selectedItem ?? base.selectedItem;
        if (selected === "progression.actions" || selected === "progression.blocker" || selected === "progression.contracts") return "progression.overview";
        if (selected === "scripts.control" || selected === "options.config") return "global.options";
        if (selected === "stock.activity" || selected === "finances.stock") return "automation.stockTrader";
        if (selected === "infra.capacity") return "hardware.home";
        return selected;
    })();

    const upgradedCenterPanels = {
        ...base.centerPanels,
        ...(saved.centerPanels ?? {})
    };

    if (upgradedCenterPanels["global.options"] === "scripts-list" || upgradedCenterPanels["global.options"] === "batcher") {
        upgradedCenterPanels["global.options"] = base.centerPanels["global.options"];
    }

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
    const savedActiveViewId = typeof saved.activeViewId === "string"
        ? saved.activeViewId
        : saved.homeMode ? "system-overview" : "";

    return {
        expandedGroups: upgradedExpandedGroups,
        activeViewId: savedActiveViewId === "home" ? "system-overview" : savedActiveViewId,
        healthFilter: HEALTH_FILTER_MODES.has(saved.healthFilter) ? saved.healthFilter : base.healthFilter,
        selectedItem: getServiceById(upgradedSelectedItem) ? upgradedSelectedItem : base.selectedItem,
        centerPanels: upgradedCenterPanels
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

function getDashboardPluginFiles() {
    return getDashboardServiceRegistry().services
        .map((service) => normalizeFilePath(service?.pluginFile))
        .filter(Boolean);
}

function buildDashboardWorkerCommand(ns, command) {
    return buildWorkerCommand(ns, command, {
        restartDashboardActionId: DASHBOARD_ACTION_IDS.RESTART_DASHBOARD,
        dashboardScript: DASHBOARD_SCRIPT,
        getDashboardPid: (workerNs) => workerNs.pid,
        getDashboardRestartArgs: (workerNs) => getDashboardRestartArgs(workerNs.args),
        getScriptListSettings: (workerNs) => {
            const options = loadDashboardOptions(workerNs);
            return {
                ignoredFolders: parseScriptFolders(options.ignoredScriptFolders),
                ignoredFiles: parseScriptFiles(options.ignoredScriptFiles),
            };
        },
        getPluginFiles: getDashboardPluginFiles,
        resolveScriptActionExecution,
        getScriptLaunchArgs,
        getFileActionView: getDashboardFileActionView,
        normalizeFilePath,
        loadFileManagerManifest,
        normalizeFileManifest,
    });
}

function completeDashboardWorkerAction(ns, pending, result) {
    const command = pending.command;
    const message = String(result?.message ?? "Dashboard action worker returned an invalid result.");
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

const dashboardActionWorker = createActionWorkerQueue({
    workerScript: DASHBOARD_ACTION_WORKER_SCRIPT,
    resultFile: DASHBOARD_ACTION_WORKER_RESULT_FILE,
    timeoutMs: DASHBOARD_ACTION_WORKER_TIMEOUT_MS,
    normalizeEnvelope: normalizeActionWorkerEnvelope,
    parseResult: parseActionWorkerResult,
    onComplete: completeDashboardWorkerAction,
});

function pollDashboardWorkerAction(ns) {
    dashboardActionWorker.poll(ns);
}

function queueDashboardWorkerAction(ns, command) {
    const workerCommand = buildDashboardWorkerCommand(ns, command);
    if (!workerCommand) return false;
    dashboardActionWorker.enqueue(ns, workerCommand);
    return true;
}

function applyQueuedDashboardActions(ns) {
    if (!ns) return;
    pollDashboardWorkerAction(ns);
    const queue = flushDashboardActionQueue();
    if (!Array.isArray(queue) || queue.length === 0) return;
    dispatchDashboardActions(ns, queue, {
        "window-mode": (command) => {
            const requestedMode = normalizeDashboardWindowMode(command.mode);
            if (requestedMode !== dashboardTailLayoutState.mode) {
                dashboardTailLayoutState.requestedMode = requestedMode;
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
            }, { running: latestHomeProcessFilenames.has(integration?.scriptPath) });
        },
        "plugin-command": (command) => {
            const integration = getServiceById(command.serviceId)?.pluginMetadata;
            applyPluginIntegrationCommand(
                ns,
                integration,
                command.command,
                (tone, message) => logMajorAction(ns, message, tone),
                { running: latestHomeProcessFilenames.has(integration?.scriptPath) }
            );
        },
        dashboard: (command) => {
            if (typeof command.actionId === "string") queueDashboardWorkerAction(ns, command);
        },
        file: (command) => {
            if (command.actionId === "refresh") {
                setDashboardFileActionResult(command.viewId, "success", "Home filesystem rescanned.");
            } else {
                queueDashboardWorkerAction(ns, command);
            }
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
    pollDashboardWorkerAction(ns);
}

function getScriptLaunchArgs(filename) {
    const pluginService = getDashboardServiceRegistry().services.find((service) => service.pluginFile === filename);
    if (Array.isArray(pluginService?.pluginMetadata?.launchArgs)) return pluginService.pluginMetadata.launchArgs;
    return [];
}

function isDashboardPluginScript(filename) {
    if (typeof filename !== "string" || filename.length === 0) return false;
    const normalized = filename.replace(/\\/g, "/");
    if (isDashboardCoreScript(normalized)) return false;
    return getDashboardServiceRegistry().services.some((service) => service.pluginFile === normalized);
}

function isDashboardCoreScript(filename) {
    return filename === DASHBOARD_SCRIPT || filename === SERVICE_SUPERVISOR_SCRIPT;
}

function isGlobalListMenuItem(itemId) {
    return itemId === "global.options" || itemId === "global.coreModules"
        || itemId === "global.integrations" || itemId === "global.plugins";
}

function isDashboardIntegrationScript(filename) {
    if (typeof filename !== "string" || filename.length === 0) return false;
    const normalized = filename.replace(/\\/g, "/");
    return getDashboardServiceRegistry().services.some((service) => {
        return service.pluginFile === normalized
            && typeof service.pluginIntegrationFile === "string"
            && service.pluginIntegrationFile.startsWith("dashboard/integrations/");
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

function isDashboardSupportScript(filename, ignoredFolders = DEFAULT_IGNORED_SCRIPT_FOLDERS, ignoredFiles = []) {
    return isDashboardCoreScript(filename)
        || isScriptInFolders(filename, ignoredFolders)
        || isScriptFileIgnored(filename, ignoredFiles);
}

function getNonPluginScripts(homeScripts, ignoredFolders, ignoredFiles = []) {
    return (homeScripts ?? []).filter((script) => {
        return !isDashboardPluginScript(script?.filename)
            && !isDashboardSupportScript(script?.filename, ignoredFolders, ignoredFiles);
    });
}

function buildScriptBuckets(
    homeScripts = [],
    rawIgnoredFolders = DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION,
    rawIgnoredFiles = DEFAULT_IGNORED_SCRIPT_FILES_OPTION,
    views = []
) {
    const scripts = Array.isArray(homeScripts) ? homeScripts : [];
    const ignoredFolders = parseScriptFolders(rawIgnoredFolders);
    const ignoredFiles = parseScriptFiles(rawIgnoredFiles);
    const integrationScripts = scripts.filter((script) => isDashboardIntegrationScript(script?.filename));
    const pluginScripts = [
        ...scripts.filter((script) => isDashboardPluginScript(script?.filename) && !isDashboardIntegrationScript(script?.filename)),
        ...getViewOnlyPluginEntries(views),
    ];
    const dashboardCoreScripts = scripts.filter((script) => isDashboardCoreScript(script?.filename));
    const nonPluginScripts = getNonPluginScripts(scripts, ignoredFolders, ignoredFiles);

    return {
        integrationScripts,
        pluginScripts,
        nonPluginScripts,
        dashboardCoreScripts,
    };
}

function applyPluginScriptMetadata(homeScripts, registry) {
    const pluginMetadataByFile = new Map(
        (registry?.services ?? [])
            .filter((service) => typeof service?.pluginFile === "string")
            .map((service) => [service.pluginFile, service.pluginMetadata])
    );

    return (homeScripts ?? []).map((script) => {
        const pluginMetadata = pluginMetadataByFile.get(script?.filename);
        if (typeof pluginMetadata?.daemon !== "boolean") return script;
        return { ...script, daemon: pluginMetadata.daemon, lifecycleSource: "integration" };
    });
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

function applyHomeProcessState(scriptCatalog, homeProcesses) {
    const runningThreadsByFile = new Map();
    for (const process of Array.isArray(homeProcesses) ? homeProcesses : []) {
        const current = runningThreadsByFile.get(process.filename) ?? 0;
        runningThreadsByFile.set(process.filename, current + (process.threads ?? 0));
    }

    return (Array.isArray(scriptCatalog) ? scriptCatalog : []).map((script) => {
        const runningThreads = runningThreadsByFile.get(script.filename) ?? 0;
        return {
            ...script,
            running: runningThreads > 0,
            runningThreads,
            runningRam: script.ramPerThread * runningThreads,
        };
    });
}

function getHomeRamStatus(ns) {
    if (!ns) {
        return { used: 0, total: 0, ratio: 0 };
    }

    const used = ns.getServerUsedRam("home");
    const total = ns.getServerMaxRam("home");
    const ratio = total > 0 ? used / total : 0;
    return { used, total, ratio };
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

function applyPersistedPluginOptions(ns, filename) {
    const integration = getDashboardServiceRegistry().services.find((service) => service.pluginFile === filename)?.pluginMetadata;
    if (!integration || Object.keys(integration.options ?? {}).length === 0) return;
    applyPluginIntegrationOptions(ns, integration, loadDashboardOptions(ns), (tone, message) => {
        logMajorAction(ns, message, tone);
    }, { running: true });
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
        queueDashboardWorkerAction(ns, { kind: "script", actionId: action, filename });
        return;
    }
    logMajorAction(ns, `Unsupported execution type for action ${action}: ${execution.executeType}`, "warning");
}

const DASHBOARD_MENU_GROUPS = [
    { id: "overview", title: "Overview" },
    { id: "affiliations", title: "Affiliations" },
    { id: "automation", title: "Automation" },
    { id: "finances", title: "Finances" },
    { id: "hacking", title: "Hacking" },
    { id: "hardware", title: "Hardware" },
    { id: "software", title: "Software" },
    { id: "globalOptions", title: "Options" },
];

const DASHBOARD_SERVICES = [
    {
        id: "hardware.home",
        menuGroup: "hardware",
        menuLabel: "Home Server",
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
            options: { title: "Home Options", accent: "#6ee7a8", subtitle: "Configure Home settings" },
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
                { id: "reserved-home-ram", label: "Reserved Home RAM (GB)", optionKey: "reservedHomeRam", value: options.reservedHomeRam, min: 0 },
            ];
        },
        getState: ({ selectedCenterPanel, options, homeRamStatus }) => {
            if (selectedCenterPanel !== "infrastructure") return [];
            return [
                { label: "Reserved RAM", value: `${options.reservedHomeRam} GB`, tone: "info" },
                { label: "Used RAM", value: formatRam(homeRamStatus.used), tone: getRamHealthLevel(homeRamStatus) },
                { label: "Total RAM", value: formatRam(homeRamStatus.total), tone: "neutral" },
                { label: "Utilization", value: formatUtilizationPercent(homeRamStatus.ratio), tone: getRamHealthLevel(homeRamStatus) },
            ];
        },
        getActions: ({ selectedCenterPanel }) => {
            if (selectedCenterPanel !== "options") return [];
            return [{ id: "save-home-options", label: "Save options", kind: "save-options" }];
        },
    },
    {
        id: "global.dashboardOptions",
        menuGroup: "globalOptions",
        menuLabel: "Dashboard Options",
        description: "Controls dashboard-wide presentation and Script List visibility. Plugin discovery is unaffected.",
        alwaysVisible: true,
        defaultPanelId: "options",
        subviews: [
            { id: "options", label: "Options" },
        ],
        panelMeta: {
            options: { title: "Dashboard Options", accent: "#6cb4ff", subtitle: "Configure dashboard-wide behavior" },
        },
        getInputs: ({ selectedCenterPanel, options, pluginDashboardOptionInputs }) => {
            if (selectedCenterPanel !== "options") return [];
            return [
                {
                    id: "dashboard-theme-mode",
                    label: "Dashboard theme",
                    optionKey: "dashboardThemeMode",
                    type: "select",
                    options: DASHBOARD_THEME_MODES,
                    value: options.dashboardThemeMode,
                },
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
                ...(Array.isArray(pluginDashboardOptionInputs) ? pluginDashboardOptionInputs : []),
                {
                    id: "ignored-script-folders",
                    label: "Ignored folders (comma-separated)",
                    optionKey: "ignoredScriptFolders",
                    type: "text",
                    value: options.ignoredScriptFolders,
                },
                {
                    id: "ignored-script-files",
                    label: "Ignored scripts (comma-separated)",
                    optionKey: "ignoredScriptFiles",
                    type: "text",
                    value: options.ignoredScriptFiles,
                },
            ];
        },
        getState: ({ selectedCenterPanel, options, pluginDashboardOptionInputs }) => {
            if (selectedCenterPanel !== "options") return [];
            const configuredFolders = parseScriptFolders(options.ignoredScriptFolders);
            const configuredFiles = parseScriptFiles(options.ignoredScriptFiles);
            return [
                { label: "Theme", value: normalizeDashboardThemeMode(options.dashboardThemeMode), tone: "info" },
                { label: "Text size", value: normalizeDashboardTextSizeMode(options.dashboardTextSizeMode), tone: "info" },
                { label: "Window startup", value: normalizeDashboardStartupMode(options.dashboardWindowStartupMode), tone: "info" },
                { label: "Hide unqualified plugins", value: normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode), tone: "info" },
                { label: "Last window mode", value: normalizeDashboardWindowMode(options.dashboardLastWindowMode), tone: "neutral" },
                { label: "Ignored folders", value: configuredFolders.join(", ") || "None", tone: "info" },
                { label: "Ignored scripts", value: configuredFiles.join(", ") || "None", tone: "info" },
                { label: "Defaults", value: DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION, tone: "neutral" },
            ];
        },
    },
    {
        id: "global.coreModules",
        menuGroup: "globalOptions",
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
        getState: ({ selectedScript, homeScripts, pluginRequirements, ns }) => {
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
                    Boolean(ns?.fileExists?.(AUTOSTART_PAUSE_FILE, "home"))
                ),
            ];
        },
        getActions: ({ selectedScript, options, services, views }) => {
            return buildScriptListActions(selectedScript, options, undefined, services, views);
        },
    },
    {
        id: "global.integrations",
        menuGroup: "globalOptions",
        menuLabel: "Integrations",
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
        getHealth: ({ homeScripts }) => summarizeScriptListHealth((homeScripts ?? []).filter((script) => {
            return isDashboardIntegrationScript(script?.filename);
        })),
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
        menuGroup: "globalOptions",
        menuLabel: "Plugins",
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
        getHealth: ({ homeScripts }) => summarizeScriptListHealth((homeScripts ?? []).filter((script) => {
            return isDashboardPluginScript(script?.filename) && !isDashboardIntegrationScript(script?.filename);
        })),
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
        menuGroup: "globalOptions",
        menuLabel: "Scripts",
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
            parseScriptFolders(options.ignoredScriptFolders),
            parseScriptFiles(options.ignoredScriptFiles)
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

const DASHBOARD_MENU_GROUP_IDS = new Set(DASHBOARD_MENU_GROUPS.map((group) => group.id));
const DASHBOARD_VIEW_RENDERERS = new Set(["system-overview", "network-map", "file-manager", "script-log", "mailbox"]);
const DASHBOARD_HOME_WIDGET_TYPES = new Set(["metrics", "player-stats", "health", "gauges", "service-health", "graphs"]);
const SERVICE_ACTION_KINDS = new Set(["dashboard", "script", "save-options", "plugin-command"]);
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
    return validateDashboardServicesDefinition(services, DASHBOARD_MENU_GROUP_IDS, SERVICE_CONTRACT_STRICT_MODE);
}

function getDashboardServiceRegistry() {
    const registry = globalThis[DASHBOARD_SERVICE_REGISTRY_KEY];
    if (registry && Array.isArray(registry.services) && registry.byId instanceof Map) {
        return registry;
    }

    const fallbackRegistry = validateDashboardServices(DASHBOARD_SERVICES);
    globalThis[DASHBOARD_SERVICE_REGISTRY_KEY] = fallbackRegistry;
    return fallbackRegistry;
}

function setDashboardServiceRegistry(registry) {
    if (!registry || !Array.isArray(registry.services) || !(registry.byId instanceof Map)) return;
    globalThis[DASHBOARD_SERVICE_REGISTRY_KEY] = registry;
}

function validateDashboardViews(views = []) {
    return validateDashboardViewsDefinition(
        views,
        DASHBOARD_MENU_GROUP_IDS,
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

function rebuildDashboardViewRegistry(ns, homeScripts = []) {
    const filenames = homeScripts.map((script) => script.filename).sort(compareScriptPathsByName);
    const cacheKey = filenames.join("|");
    const now = Date.now();
    const cache = globalThis.__dashboard_view_scan_cache_v1;
    const canUseCache = cache
        && typeof cache === "object"
        && cache.key === cacheKey
        && Array.isArray(cache.definitions)
        && Number.isFinite(cache.scannedAt)
        && (now - cache.scannedAt) < 5000;
    const definitions = canUseCache ? cache.definitions : discoverDashboardViews(ns, filenames);

    if (!canUseCache) {
        globalThis.__dashboard_view_scan_cache_v1 = {
            key: cacheKey,
            definitions,
            scannedAt: now,
        };
    }

    const contributedDefinitions = applyDashboardViewWidgetContributions(
        definitions,
        getDashboardServiceRegistry().services
    );
    const definitionSignature = JSON.stringify(contributedDefinitions);
    const previous = globalThis.__dashboard_view_registry_source_v1;
    if (previous?.signature === definitionSignature && previous.registry) return previous.registry;
    const registry = validateDashboardViews(contributedDefinitions);
    globalThis[DASHBOARD_VIEW_REGISTRY_KEY] = registry;
    globalThis.__dashboard_view_registry_source_v1 = { signature: definitionSignature, registry };
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
    const cache = globalThis.__dashboard_plugin_scan_cache_v2;
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
        globalThis.__dashboard_plugin_scan_cache_v2 = {
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

    const pluginIds = new Set(pluginServices.map((service) => service.id));
    const coreServices = DASHBOARD_SERVICES.filter((service) => !pluginIds.has(service.id));
    const mergedServices = [...coreServices, ...pluginServices];
    const registry = validateDashboardServices(mergedServices);
    setDashboardServiceRegistry(registry);
    globalThis[DASHBOARD_SERVICE_REGISTRY_SOURCE_KEY] = { signature: definitionSignature, registry };
    logServiceRegistryIssues(registry);
    return registry;
}

function getServiceById(serviceId) {
    return getDashboardServiceRegistry().byId.get(serviceId) ?? null;
}

function getDefaultSelectedServiceId() {
    return getDefaultSelectedServiceIdDefinition(getDashboardServiceRegistry().services, DASHBOARD_MENU_GROUPS);
}

function getMenuGroups(options = {}, pluginRequirements = {}) {
    return buildDashboardMenuGroups(getDashboardServiceRegistry().services, DASHBOARD_MENU_GROUPS, options, pluginRequirements);
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
    if (typeof service?.getState !== "function") {
        return [];
    }

    const stateLines = service.getState(context);
    return Array.isArray(stateLines) ? stateLines : [];
}

function getServiceSections(service, context) {
    if (typeof service?.getSections !== "function") {
        return [];
    }

    const sections = service.getSections(context);
    return Array.isArray(sections) ? sections : [];
}

function getServiceInputs(service, context) {
    if (typeof service?.getInputs !== "function") {
        return [];
    }

    const inputs = service.getInputs(context);
    if (!Array.isArray(inputs)) {
        return [];
    }

    return inputs.filter((input) => input && typeof input.id === "string" && typeof input.label === "string" && typeof input.optionKey === "string");
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

function buildDashboardHudDefinition(services, telemetryByServiceId) {
    const definitions = [];
    for (const service of Array.isArray(services) ? services : []) {
        const hud = service?.pluginMetadata?.hud;
        if (!hud || typeof hud !== "object" || !Array.isArray(hud.groups)) continue;
        const telemetry = telemetryByServiceId?.[service.id];
        const groups = hud.groups.map((group) => ({
            id: `${service.id}:${String(group?.id ?? "group")}`,
            sourceId: String(group?.id ?? "group"),
            title: String(group?.title ?? service.menuLabel ?? "Status"),
            items: (Array.isArray(group?.items) ? group.items : []).map((item) => {
                const value = getDashboardViewValue(telemetry, item?.key);
                if (value === undefined || value === null) return null;
                if (item?.hideWhenZero && Number(value) === 0) return null;
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

function getDashboardResponsiveLayout(layoutSnapshot) {
    const tier = String(layoutSnapshot?.layoutTier ?? "compact");
    if (tier === "wide") {
        return {
            workspaceColumns: "320px 420px minmax(620px, 1fr)",
            statMinimumWidth: 180,
            gaugeWidth: 72,
        };
    }
    if (tier === "standard") {
        return {
            workspaceColumns: "280px 360px minmax(520px, 1fr)",
            statMinimumWidth: 160,
            gaugeWidth: 68,
        };
    }
    return {
        workspaceColumns: "minmax(220px, 0.85fr) minmax(280px, 1fr) minmax(480px, 2.2fr)",
        statMinimumWidth: 138,
        gaugeWidth: 64,
    };
}

function DashboardWidget({ persistedOptions, gameTheme, gameStyles, homeScripts, homeRamStatus, runningScriptCount, runningProcessSnapshot, telemetryByServiceId, pluginRequirements, fileManagerSnapshots, scriptLogSnapshots, layoutSnapshot }) {
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
    const [pressedActionButtonId, setPressedActionButtonId] = React.useState("");
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
    const lastAutoSyncedOptionsRef = React.useRef(normalizeDashboardOptionsForCompare(persistedOptions ?? getDefaultOptions()));
    const leftColumnRef = React.useRef(null);
    const centerColumnRef = React.useRef(null);
    const rightColumnRef = React.useRef(null);
    const playerStatsColumnRef = React.useRef(null);
    const systemOverviewRef = React.useRef(null);
    const dashboardViews = getDashboardViewRegistry().views;
    const serviceMenuGroups = getMenuGroups(options, pluginRequirements);
    const hideUnqualifiedPluginsMode = normalizeHideUnqualifiedPluginsMode(options.hideUnqualifiedPluginsMode);
    const menuGroups = serviceMenuGroups.map((group) => ({
        ...group,
        items: [
            ...dashboardViews
                .filter((view) => view.menuGroup === group.id)
                .filter((view) => isServiceVisibleInMenu(view.id, options))
                .filter((view) => isViewQualified(view, pluginRequirements, hideUnqualifiedPluginsMode))
                .map((view) => ({
                    id: `${DASHBOARD_VIEW_ITEM_PREFIX}${view.id}`,
                    label: view.menuLabel,
                    alwaysVisible: true,
                    dashboardViewId: view.id,
                })),
            ...group.items,
        ],
    }));
    const scriptBuckets = React.useMemo(
        () => buildScriptBuckets(homeScripts, options.ignoredScriptFolders, options.ignoredScriptFiles, dashboardViews),
        [homeScripts, options.ignoredScriptFolders, options.ignoredScriptFiles, dashboardViews]
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
            if (optionsDirtyRef.current || optionsInputFocusedRef.current) return currentOptions;
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

            for (const service of getDashboardServiceRegistry().services) {
                const integration = service.pluginMetadata;
                if (!integration || Object.keys(integration.options ?? {}).length === 0) continue;
                const previousPluginOptions = normalizePluginIntegrationOptions(integration, previousOptions);
                const currentPluginOptions = normalizePluginIntegrationOptions(integration, currentOptions);
                const changed = Object.keys(currentPluginOptions).some((key) => previousPluginOptions[key] !== currentPluginOptions[key]);
                const running = homeScripts.some((script) => script?.filename === integration.scriptPath && script?.running);
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
            optionsDirtyRef.current = false;
            autoSyncTimerRef.current = null;
        }, 250);

        return () => {
            if (autoSyncTimerRef.current) {
                clearTimeout(autoSyncTimerRef.current);
                autoSyncTimerRef.current = null;
            }
        };
    }, [options, homeScripts]);

    // Auto-start any service configured with `lifecycle.autoStartWhenFundsAbove` once home money
    // (read from progression-report telemetry, already polled at no extra Netscript RAM cost)
    // crosses its configured threshold. Unlike the option-increase effect above, this re-checks on
    // every tick, not just when an option changes, so it reacts to money actually accumulating
    // rather than only to the user editing a cap.
    React.useEffect(() => {
        const currentMoney = Number(telemetryByServiceId?.["progression.report"]?.currentMoney);
        if (!Number.isFinite(currentMoney)) return;

        const now = Date.now();
        const cooldowns = fundsAutoStartCooldowns;

        for (const service of getDashboardServiceRegistry().services) {
            const integration = service.pluginMetadata;
            if (!integration) continue;

            const fundsThreshold = getPluginIntegrationAutoStartFundsThreshold(integration, options);
            if (fundsThreshold === null || currentMoney < fundsThreshold) continue;

            const running = homeScripts.some((script) => script?.filename === integration.scriptPath && script?.running);
            if (running) {
                // Confirmed alive - clear any cooldown so a future self-exit is retried promptly.
                cooldowns.delete(integration.serviceId);
                continue;
            }

            const lastAttemptAt = cooldowns.get(integration.serviceId) ?? 0;
            if (now - lastAttemptAt < FUNDS_AUTO_START_COOLDOWN_MS) continue;

            cooldowns.set(integration.serviceId, now);
            enqueueDashboardAction({
                kind: "script",
                actionId: SCRIPT_ACTION_IDS.START,
                filename: integration.scriptPath,
            });
        }
    }, [telemetryByServiceId, homeScripts, options]);

    const selectedItem = uiState.selectedItem;
    const activeView = getDashboardViewRegistry().byId.get(uiState.activeViewId) ?? null;
    const dashboardServiceRegistry = getDashboardServiceRegistry();
    const playerHudDefinitions = buildDashboardHudDefinition(dashboardServiceRegistry.services, telemetryByServiceId);
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
        if (itemId.startsWith(DASHBOARD_VIEW_ITEM_PREFIX)) {
            setActiveView(itemId.slice(DASHBOARD_VIEW_ITEM_PREFIX.length));
            return;
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
        ns: DASH_NS,
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
        selectedItem
    );
    const visibleWorkspaceWidgets = workspaceWidgets.filter((widget) => widget.type !== "player-stats" || playerStatsEnabled);
    const selectedServiceHealth = serviceHealthById[selectedItem] ?? { level: "neutral", panels: {}, summary: "", panelSummaries: {} };
    const healthFilter = HEALTH_FILTER_MODES.has(uiState.healthFilter) ? uiState.healthFilter : "all";
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
        .filter((item) => !item.dashboardViewId)
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
            <span style={{ marginLeft: "6px", color: level === "danger" ? "#ff9a9a" : "#ffd88a" }}>
                {level === "danger" ? "!!" : "!"}
            </span>
        );
    };

    const getHealthSummaryTone = (level) => {
        if (level === "danger") return "#ffb0b0";
        if (level === "warn") return "#ffd88a";
        if (level === "info") return "#c8e0ff";
        return "#9ab0cc";
    };

    const getServiceItemTooltip = (itemId) => {
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
        if (action?.kind !== "plugin-command") return {};
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
            enqueueDashboardAction({
                kind: "plugin-command",
                serviceId: action.serviceId,
                command: action.command,
            });
            return;
        }
        if (action.kind === "dashboard") {
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

        return (
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
        );
    };

    const updateOptionInput = (input, rawValue) => {
        if (!input?.optionKey) return;
        optionsDirtyRef.current = true;
        setOptions((current) => {
            const next = { ...current };

            if (input.type === "checkbox") {
                next[input.optionKey] = Boolean(rawValue);
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

    const renderServiceInputs = (inputs, layout = "default") => {
        if (!Array.isArray(inputs) || inputs.length === 0) {
            return null;
        }

        const containerStyle = layout === "wrap-180"
            ? { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }
            : WIDGET_STYLES.optionGrid;

        const fieldStyle = layout === "wrap-180"
            ? { ...WIDGET_STYLES.optionField, minWidth: "180px", flex: "1 1 180px" }
            : WIDGET_STYLES.optionField;

        const controlStyle = {
            ...WIDGET_STYLES.input,
            minHeight: "34px",
            height: "34px",
            boxSizing: "border-box",
        };

        return (
            <div style={containerStyle}>
                {inputs.map((input) => (
                    <label key={input.id} style={fieldStyle}>
                        <span data-dashboard-theme-role="data-heading">{input.label}</span>
                        {input.type === "select" && Array.isArray(input.options) ? (
                            <select
                                data-dashboard-theme-role="data-value"
                                title={`Adjust ${input.label}`}
                                style={controlStyle}
                                value={String(input.value ?? "")}
                                disabled={Boolean(input.disabled)}
                                onFocus={() => setOptionsInputFocus(true)}
                                onBlur={() => setOptionsInputFocus(false)}
                                onChange={(e) => updateOptionInput(input, e.target.value)}
                            >
                                {input.options.map((optionValue) => (
                                    <option key={`${input.id}:${optionValue}`} value={optionValue}>{optionValue}</option>
                                ))}
                            </select>
                        ) : input.type === "checkbox" ? (
                            <input
                                data-dashboard-theme-role="data-value"
                                title={`Toggle ${input.label}`}
                                style={WIDGET_STYLES.input}
                                type="checkbox"
                                checked={Boolean(input.value)}
                                disabled={Boolean(input.disabled)}
                                onFocus={() => setOptionsInputFocus(true)}
                                onBlur={() => setOptionsInputFocus(false)}
                                onChange={(e) => updateOptionInput(input, e.target.checked)}
                            />
                        ) : (
                            <input
                                data-dashboard-theme-role="data-value"
                                title={`Adjust ${input.label}`}
                                style={controlStyle}
                                type={input.type ?? "number"}
                                value={input.value}
                                min={input.type === "number" && Number.isFinite(input.min) ? input.min : undefined}
                                max={input.type === "number" && Number.isFinite(input.max) ? input.max : undefined}
                                disabled={Boolean(input.disabled)}
                                onFocus={() => setOptionsInputFocus(true)}
                                onBlur={() => setOptionsInputFocus(false)}
                                onChange={(e) => updateOptionInput(input, e.target.value)}
                            />
                        )}
                    </label>
                ))}
            </div>
        );
    };

    const renderStateCard = (meta, stateLines) => (
        <Card title={meta.title} accent={meta.accent} subtitle={meta.subtitle} widgetStyles={WIDGET_STYLES}>
            <div style={WIDGET_STYLES.list}>
                {stateLines.map((line) => (
                    <BadgeLine key={line.label} label={line.label} value={line.value} tone={line.tone ?? "neutral"} />
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
                        return <DashboardDataGraph key={`graph-${section.title ?? index}`} section={section} index={index} />;
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
                telemetryByServiceId?.[service.id] ?? null
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
            telemetryByServiceId?.[service.id] ?? null
        ).map((gauge) => ({
            ...gauge,
            id: `${service.id}:${gauge.key}`,
            key: `${service.id}:${gauge.key}`,
            serviceId: service.id,
            menuGroup: service.menuGroup,
            sourceKind: "plugin",
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
    const homeServiceGroups = DASHBOARD_MENU_GROUPS
        .map((group) => ({
            ...group,
            services: dashboardServiceRegistry.services.filter((service) => service.menuGroup === group.id),
        }))
        .filter((group) => group.services.length > 0);
    const homeGraphs = dashboardServiceRegistry.services
        .flatMap((service) => getPluginIntegrationGraphs(
            service.pluginMetadata,
            telemetryByServiceId?.[service.id] ?? null
        ).map((graph, graphIndex) => ({
            ...graph,
            id: `${service.id}:${graph.id ?? `${graph.panelId ?? "graph"}-${graphIndex}`}`,
            key: `${service.id}:${graph.id ?? `${graph.panelId ?? "graph"}-${graphIndex}`}`,
            serviceId: service.id,
            menuGroup: service.menuGroup,
            sourceKind: "plugin",
            title: `${service.menuLabel} · ${graph.title ?? "History"}`,
        })));
    const hasKillAllTargets = runningProcessSnapshot.remoteFilenames.length > 0
        || runningProcessSnapshot.homeFilenames.some((filename) => {
            return filename !== DASHBOARD_SCRIPT && filename !== DASHBOARD_ACTION_WORKER_SCRIPT;
        });
    const globalKillAction = buildDashboardActions([DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS], {
        disabledActionIds: hasKillAllTargets && !killAllPending ? [] : [DASHBOARD_ACTION_IDS.KILL_ALL_SCRIPTS],
    })[0];
    const requestGlobalKill = () => {
        if (globalKillAction.disabled) return;
        killAllSnapshotRef.current = runningProcessSnapshot;
        setKillAllPending(true);
        runServiceAction(globalKillAction);
    };

    const serviceSupervisorRunning = homeScripts.some((script) => {
        return script?.filename === SERVICE_SUPERVISOR_SCRIPT && script?.running;
    });
    const runningHomeFilenames = Array.isArray(runningProcessSnapshot?.homeFilenames)
        ? runningProcessSnapshot.homeFilenames
        : [];
    const runningRemoteFilenames = Array.isArray(runningProcessSnapshot?.remoteFilenames)
        ? runningProcessSnapshot.remoteFilenames
        : [];
    const isIntegrationOnlyScript = (filename) => isDashboardIntegrationScript(filename);
    const isPluginOnlyScript = (filename) => isDashboardPluginScript(filename) && !isDashboardIntegrationScript(filename);

    const hasLocalCoreModuleTargets = serviceSupervisorRunning;
    const coreModulesListTopActions = buildScopedKillListActions(DASHBOARD_ACTION_GROUPS.CORE_MODULES_LIST_CONTROLS, {
        homeActionId: DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_HOME_SCRIPTS,
        remoteActionId: DASHBOARD_ACTION_IDS.KILL_CORE_MODULES_REMOTE_SCRIPTS,
        hasLocalTargets: hasLocalCoreModuleTargets,
        hasRemoteTargets: false, // core modules never run remotely
        extraDisabledActionIds: serviceSupervisorRunning ? [DASHBOARD_ACTION_IDS.START_INTEGRATIONS] : [],
        filenames: dashboardCoreScripts.map((script) => script.filename).filter((filename) => typeof filename === "string" && filename.length > 0),
    });

    const hasLocalIntegrationTargets = serviceSupervisorRunning || runningHomeFilenames.some(isIntegrationOnlyScript);
    const hasRemoteIntegrationTargets = runningRemoteFilenames.some(isIntegrationOnlyScript);
    const integrationsListTopActions = buildScopedKillListActions(DASHBOARD_ACTION_GROUPS.INTEGRATIONS_LIST_CONTROLS, {
        homeActionId: DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_HOME_SCRIPTS,
        remoteActionId: DASHBOARD_ACTION_IDS.KILL_INTEGRATIONS_REMOTE_SCRIPTS,
        hasLocalTargets: hasLocalIntegrationTargets,
        hasRemoteTargets: hasRemoteIntegrationTargets,
        filenames: integrationScripts.map((script) => script.filename).filter((filename) => typeof filename === "string" && filename.length > 0),
    });

    const hasLocalPluginTargets = serviceSupervisorRunning || runningHomeFilenames.some(isPluginOnlyScript);
    const hasRemotePluginTargets = runningRemoteFilenames.some(isPluginOnlyScript);
    const pluginsListTopActions = buildScopedKillListActions(DASHBOARD_ACTION_GROUPS.PLUGINS_LIST_CONTROLS, {
        homeActionId: DASHBOARD_ACTION_IDS.KILL_PLUGINS_HOME_SCRIPTS,
        remoteActionId: DASHBOARD_ACTION_IDS.KILL_PLUGINS_REMOTE_SCRIPTS,
        hasLocalTargets: hasLocalPluginTargets,
        hasRemoteTargets: hasRemotePluginTargets,
        filenames: pluginScripts.map((script) => script.filename).filter((filename) => typeof filename === "string" && filename.length > 0),
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
                    const inlineActions = selectedItem === "global.options"
                        ? [
                            ...standardInlineActions,
                            {
                                id: `ignore-script:${panel.id}`,
                                label: "Add to ignore list",
                                kind: "save-options",
                                tone: "warn",
                                disabled: false,
                                tooltip: `Hide ${panel.id} from the Script List and exclude it from Script List kill actions.`,
                                optionOverrides: {
                                    ignoredScriptFiles: normalizeScriptFiles([
                                        ...parseScriptFiles(options.ignoredScriptFiles),
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
        const ignoredFolders = parseScriptFolders(persistedOptions.ignoredScriptFolders);
        const ignoredFiles = parseScriptFiles(persistedOptions.ignoredScriptFiles);
        const isScriptListTarget = (filename) => {
            return !isDashboardPluginScript(filename)
                && !isDashboardSupportScript(filename, ignoredFolders, ignoredFiles);
        };
        const hasLocalScriptTargets = runningHomeFilenames.some(isScriptListTarget);
        const hasRemoteScriptTargets = runningRemoteFilenames.some(isScriptListTarget);
        const scriptListDisabledActionIds = [
            ...(!hasLocalScriptTargets ? [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS] : []),
            ...(!hasRemoteScriptTargets ? [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS] : []),
        ];
        const scriptListTopActions = selectedItem === "global.options"
            ? buildDashboardActions(DASHBOARD_ACTION_GROUPS.SCRIPT_LIST_CONTROLS, {
                disabledActionIds: scriptListDisabledActionIds,
            })
            : [];

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
                <>
                    <Card title="Script Controls" accent="#6cb4ff" subtitle="Unmanaged script actions" widgetStyles={WIDGET_STYLES}>
                        {renderServiceActions(scriptListTopActions)}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Scripts" accent="#6cb4ff" subtitle="Script Controls" widgetStyles={WIDGET_STYLES}>
                        <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                        {runningPanels.length > 0 ? renderGroupedScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running scripts.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                        {stoppedPanels.length > 0 ? renderGroupedScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped scripts.</div>}
                    </Card>
                </>
            );
        }

        if (selectedItem === "global.coreModules") {
            const { runningPanels, stoppedPanels } = splitScriptPanels(centerPanels);

            return (
                <>
                    <Card title="Core Module Controls" accent="#6ee7a8" subtitle="Managed script actions" widgetStyles={WIDGET_STYLES}>
                        {renderServiceActions(coreModulesListTopActions)}
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
                <>
                    <Card title="Integration Controls" accent="#6cb4ff" subtitle="Managed script actions" widgetStyles={WIDGET_STYLES}>
                        {renderServiceActions(integrationsListTopActions)}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Integrations" accent="#6cb4ff" subtitle="Integration Controls" widgetStyles={WIDGET_STYLES}>
                        <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                        {runningPanels.length > 0 ? renderScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running integrations.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                        {stoppedPanels.length > 0 ? renderScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped integrations.</div>}
                    </Card>
                </>
            );
        }

        if (selectedItem === "global.plugins") {
            const { runningPanels, stoppedPanels } = splitScriptPanels(centerPanels);

            return (
                <>
                    <Card title="Plugin Controls" accent="#6cb4ff" subtitle="Managed script actions" widgetStyles={WIDGET_STYLES}>
                        {renderServiceActions(pluginsListTopActions)}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Plugins" accent="#6cb4ff" subtitle="Plugin Controls" widgetStyles={WIDGET_STYLES}>
                        <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                        {runningPanels.length > 0 ? renderScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running plugins.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                        {stoppedPanels.length > 0 ? renderScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped plugins.</div>}
                    </Card>
                </>
            );
        }

        return (
            <Card title="Sub-Widgets" accent="#6cb4ff" subtitle="Choose a sub-category" widgetStyles={WIDGET_STYLES}>
                <div style={WIDGET_STYLES.actionGrid}>
                    {centerPanels.map((panel) => {
                        const panelLevel = selectedServiceHealth?.panels?.[panel.id] ?? "neutral";
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
                                    {panel.label}{hasInlineScriptActions && isSelected ? (isInlineActionsExpanded ? " -" : " +") : ""}
                                    {isGlobalListMenuItem(selectedItem) ? null : renderHealthBadge(panelLevel)}
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
                            <BadgeLine key={line.label} label={line.label} value={line.value} tone={line.tone ?? "neutral"} />
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
            ? buildPluginRequirementSection(pluginRequirements?.[selectedService.id] ?? [])
            : null;
        const sections = isPluginOptionsPanel
            ? []
            : [requirementSection, ...serviceSections].filter(Boolean);
        const inputs = getInputs();
        const actions = panelActions;

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
            description: isPluginOptionsPanel || isStandalonePanel ? "" : selectedService?.description ?? "",
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
        const title = typeof widget.title === "string" ? widget.title : "Player Status";
        const subtitle = typeof widget.subtitle === "string" ? widget.subtitle : "Live player telemetry";
        const emptyText = typeof widget.emptyText === "string" ? widget.emptyText : "Waiting for player telemetry.";

        return (
            <div key={`${widget.contributionServiceId}:${widget.id}`} style={WIDGET_STYLES.playerStatusColumn}>
                <HomePanel title={title} subtitle={subtitle}>
                    <PluginRuntimeWarning statuses={runtimeStatuses} />
                    {definitions.length > 0
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
                    telemetry={telemetryByServiceId?.[activeView?.data?.serviceId] ?? null}
                    serviceStatus={serviceRuntimeById[activeView?.data?.serviceId] ?? null}
                    onCommand={(serviceId, command) => runServiceAction({
                        kind: "plugin-command",
                        serviceId,
                        command,
                    })}
                    onInputFocusChange={setOptionsInputFocus}
                    onExit={() => setActiveView("")}
                    windowControl={networkMapWindowControl}
                    closeControl={networkMapCloseControl}
                    widgetStyles={WIDGET_STYLES}
                />
            ) : activeView?.renderer === "file-manager" ? (
                <FileManagerView
                    view={activeView}
                    snapshot={fileManagerSnapshots?.[activeView.id] ?? null}
                    dashboardTheme={dashboardTheme}
                    ignoredFolders={parseScriptFolders(options.ignoredScriptFolders)}
                    initialState={getDashboardViewInteractionState(activeView.id)}
                    lastActionResult={globalThis[DASHBOARD_FILE_ACTION_RESULT_KEY] ?? null}
                    onStateChange={(state) => saveDashboardViewInteractionState(activeView.id, state)}
                    onFileAction={(action) => enqueueDashboardAction({
                        kind: "file",
                        viewId: activeView.id,
                        ...action,
                    })}
                    onReadFile={(path) => DASH_NS?.read(path) ?? ""}
                    onInputFocusChange={setOptionsInputFocus}
                    onExit={() => setActiveView("")}
                    headerActions={windowControl}
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
                    headerActions={windowControl}
                />
            ) : activeView?.renderer === "mailbox" ? (
                <MailboxView
                    view={activeView}
                    telemetry={telemetryByServiceId?.[activeView?.data?.serviceId] ?? null}
                    dashboardTheme={dashboardTheme}
                    onCommand={(serviceId, command) => runServiceAction({
                        kind: "plugin-command",
                        serviceId,
                        command,
                    })}
                    onInputFocusChange={setOptionsInputFocus}
                    onExit={() => setActiveView("")}
                    headerActions={windowControl}
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
                    </div>
                </div>
            </div>

                <div
                    style={{
                        ...WIDGET_STYLES.statsRow,
                        ...normalContentBounds,
                        gridTemplateColumns: `minmax(0, 1fr) repeat(${Math.max(1, quickGauges.length)}, ${responsiveLayout.gaugeWidth}px)`,
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
                            <TonePill label={tile.label} value={tile.value} tone={tile.tone} />
                        </div>
                    ))}
                </div>
                {quickGauges.map((gauge) => (
                    <div key={gauge.key} style={WIDGET_STYLES.ramGaugeSlot}>
                        <RamGauge {...gauge} />
                    </div>
                ))}
                </div>

                <div style={{ ...WIDGET_STYLES.workspaceRow, ...normalContentBounds, gridTemplateColumns: workspaceColumns }}>
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
                                                : serviceHealthById[item.id]?.level ?? "neutral";
                                            const itemSelected = item.dashboardViewId
                                                ? activeView?.id === item.dashboardViewId
                                                : !activeView && selectedItem === item.id;
                                            const itemService = item.dashboardViewId
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
                                                {item.label}
                                                {renderHealthBadge(itemLevel)}
                                                {itemStatusDotColor ? (
                                                    <span style={{ marginLeft: "6px", color: itemStatusDotColor }}>●</span>
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

                <div
                    ref={centerColumnRef}
                    data-dashboard-theme-role="workspace-column"
                    style={WIDGET_STYLES.column}
                    onScroll={(e) => rememberScroll("center", e.currentTarget.scrollTop)}
                >
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
                            style={{ height: "100%", overflowY: "auto" }}
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
            ns.ui.setTailTitle(nextTitle);
            dashboardTailLayoutState.lastTitle = nextTitle;
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
        ns.tprint(`[DASHBOARD] Another instance is already running (pid ${primaryPid}). Exiting pid ${ns.pid}.`);
        return false;
    }

    return true;
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const launchOptions = parseDashboardLaunchOptions(ns.args);
    const { isDaemon, autoStart } = launchOptions;
    DASH_NS = ns;

    if (!ensureSingleDashboardInstance(ns)) {
        return;
    }

    setDashboardViewDragActiveState(false);
    rememberDashboardFileManagerRender("", "");

    React = getReactLib();

    if (React) {
        ns.ui.openTail();
        ns.ui.setTailTitle("Automation Dashboard");
    }

    ns.print(isDaemon
        ? `Starting Automation Dashboard in daemon mode${autoStart ? " with integration auto-start" : ""}...`
        : `Starting Automation Dashboard in one-shot mode${autoStart ? " with integration auto-start" : ""}...`);

    if (autoStart) {
        queueDashboardWorkerAction(ns, {
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
        homeScripts = applyPluginScriptMetadata(homeScripts, dashboardServiceRegistry);
        const persistedOptions = loadDashboardOptions(ns);
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
        const activeDashboardViewId = String(globalThis[DASHBOARD_UI_STATE_KEY]?.activeViewId ?? "");
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
            : {};
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
            : {};
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
        const optionsInputFocused = Boolean(globalThis[DASHBOARD_OPTIONS_INPUT_FOCUS_KEY]);
        const viewDragActive = Boolean(globalThis[DASHBOARD_VIEW_DRAG_ACTIVE_KEY]);

        if (React) {
            if (optionsInputFocused || viewDragActive || fileManagerRenderStable) {
                // Keep processing actions and state, but preserve the active DOM interaction until it finishes.
                if (!isDaemon) break;
                let remainingSleepMs = layoutSnapshot.minimized ? DASHBOARD_MINIMIZED_UI_TICK_MS : DASHBOARD_UI_TICK_MS;
                while (remainingSleepMs > 0) {
                    const stepMs = Math.min(DASHBOARD_ACTION_POLL_MS, remainingSleepMs);
                    await ns.sleep(stepMs);
                    remainingSleepMs -= stepMs;
                    applyQueuedDashboardActions(ns);
                }
                continue;
            }
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
                ></DashboardWidget>
            );
            ns.ui.renderTail();
            rememberDashboardFileManagerRender(
                activeFileManagerSnapshot ? activeDashboardView.id : "",
                fileManagerRenderSignature
            );
        } else {
            printFallbackDashboard(
                ns,
                homeRamStatus,
                runningScriptCount,
                getDashboardServiceRegistry().services.length
            );
        }

        if (!isDaemon) break;

        let remainingSleepMs = layoutSnapshot.minimized ? DASHBOARD_MINIMIZED_UI_TICK_MS : DASHBOARD_UI_TICK_MS;
        while (remainingSleepMs > 0) {
            const stepMs = Math.min(DASHBOARD_ACTION_POLL_MS, remainingSleepMs);
            await ns.sleep(stepMs);
            remainingSleepMs -= stepMs;
            applyQueuedDashboardActions(ns);
        }
    }
}
