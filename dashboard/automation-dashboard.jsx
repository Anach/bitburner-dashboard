import { buildDashboardActions, DASHBOARD_ACTION_GROUPS } from "dashboard/libs/dashboard-actions.js";
import { getDashboardPluginAdapterFactories } from "dashboard/libs/plugin-adapters.js";
import { buildDashboardPluginServices, discoverDashboardPlugins, discoverDashboardViews } from "dashboard/libs/plugin-loader.js";
import { ACTION_TONE_STYLES, normalizeActionTone } from "dashboard/libs/action-tones.js";
import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    DASHBOARD_THEME_MODES,
    DASHBOARD_TEXT_SIZE_COMFORTABLE,
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
    DASHBOARD_STARTUP_MODE_REMEMBER,
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
import { buildPluginDashboardOptionInputs, selectDashboardWorkspaceWidgets } from "dashboard/libs/workspace-widgets.js";
import { createDashboardSnapshotCoordinator } from "dashboard/libs/dashboard-snapshots.js";
import {
    DASHBOARD_FRAME_CONTROL_LABELS,
    getDashboardFrameControlGroupStyle,
    getDashboardFrameHeaderStyle,
    getDashboardFrameControlOverlayStyle,
    getDashboardFrameControlStyle,
} from "dashboard/libs/frame-controls.js";
import { buildGroupedNetworkLayout, buildLayeredNetworkLayout, fitNetworkLayout } from "dashboard/libs/network-layout.js";
import { FileManagerView } from "dashboard/renderers/file-manager-view.jsx";
import { buildFileManagerSnapshots, loadFileManagerManifest } from "dashboard/renderers/file-manager-snapshot.js";
import { ScriptLogView } from "dashboard/renderers/script-log-view.jsx";
import { buildScriptLogSnapshot } from "dashboard/renderers/script-log-snapshot.js";
import {
    normalizeFileManifest,
    normalizeFilePath,
} from "dashboard/libs/file-utils.js";
import { DASHBOARD_ACTION_IDS, SCRIPT_ACTION_IDS } from "dashboard/libs/action-ids.js";
import { buildScriptActions, resolveScriptActionExecution } from "dashboard/libs/script-actions.js";
import {
    applyPluginIntegrationCommand,
    applyPluginIntegrationOptions,
    getPluginIntegrationDefaultOptions,
    getPluginIntegrationOverviewGauges,
    getPluginIntegrationGraphs,
    getPluginIntegrationOverviewLines,
    loadPluginIntegrationStats,
    normalizePluginIntegrationOptions,
    shouldStartPluginIntegrationAfterOptionChange,
} from "dashboard/libs/plugin-integration.js";
import { buildPluginRequirementSection, buildPluginRequirementsSnapshot } from "dashboard/libs/plugin-requirements.js";
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
const DASHBOARD_SCRIPT = "dashboard/automation-dashboard.jsx";
const SERVICE_SUPERVISOR_SCRIPT = "dashboard/service-supervisor.js";
const USER_INIT_SCRIPT = "init/init-services.js";
const DASHBOARD_VIEW_ITEM_PREFIX = "dashboard.view:";
const DEFAULT_IGNORED_SCRIPT_FOLDERS = ["dashboard", "libs", "trashbin"];
const DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION = normalizeScriptFolders(DEFAULT_IGNORED_SCRIPT_FOLDERS);
const DEFAULT_IGNORED_SCRIPT_FILES_OPTION = "";
const DEFAULT_DASHBOARD_THEME_MODE = DASHBOARD_THEME_MODE_DASHBOARD;
const DEFAULT_DASHBOARD_TEXT_SIZE_MODE = DASHBOARD_TEXT_SIZE_COMFORTABLE;
const DEFAULT_DASHBOARD_WINDOW_STARTUP_MODE = DASHBOARD_STARTUP_MODE_REMEMBER;
const DASHBOARD_PLAYER_HUD_MODE_AUTO = "Auto";
const DASHBOARD_PLAYER_HUD_MODE_SHOWN = "Shown";
const DASHBOARD_PLAYER_HUD_MODE_HIDDEN = "Hidden";
const DEFAULT_DASHBOARD_PLAYER_HUD_MODE = DASHBOARD_PLAYER_HUD_MODE_AUTO;
const PLAYER_STATS_WIDGET_WIDTH = 360;
const PLUGIN_RUNTIME_EXCLUDED_FOLDERS = DEFAULT_IGNORED_SCRIPT_FOLDERS;
const TAIL_WIDTH = DEFAULT_TAIL_WIDTH;
const TAIL_HEIGHT = DEFAULT_TAIL_HEIGHT;
const DASHBOARD_UI_TICK_MS = 1000;
const DASHBOARD_ACTION_POLL_MS = 50;
const dashboardSnapshotCoordinator = createDashboardSnapshotCoordinator();
const dashboardOptionsCache = { raw: null, services: null, value: null };
const scriptCatalogEntryCache = new Map();
let latestHomeProcessFilenames = new Set();
const dashboardActionWorkerQueue = [];
let pendingDashboardActionWorker = null;
let dashboardActionWorkerSequence = 0;

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

function normalizeDashboardPlayerHudMode(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === DASHBOARD_PLAYER_HUD_MODE_SHOWN.toLowerCase()) return DASHBOARD_PLAYER_HUD_MODE_SHOWN;
    if (normalized === DASHBOARD_PLAYER_HUD_MODE_HIDDEN.toLowerCase()) return DASHBOARD_PLAYER_HUD_MODE_HIDDEN;
    return DASHBOARD_PLAYER_HUD_MODE_AUTO;
}
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

    if (upgradedCenterPanels["global.plugins"] === "plugins-list") {
        upgradedCenterPanels["global.plugins"] = base.centerPanels["global.plugins"];
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

function setDashboardViewDragActiveState(isActive) {
    globalThis[DASHBOARD_VIEW_DRAG_ACTIVE_KEY] = Boolean(isActive);
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
    const defaults = {
        reservedHomeRam: 1024,
        dashboardThemeMode: DEFAULT_DASHBOARD_THEME_MODE,
        dashboardTextSizeMode: DEFAULT_DASHBOARD_TEXT_SIZE_MODE,
        dashboardPlayerHudMode: DEFAULT_DASHBOARD_PLAYER_HUD_MODE,
        dashboardWindowStartupMode: DEFAULT_DASHBOARD_WINDOW_STARTUP_MODE,
        dashboardLastWindowMode: DASHBOARD_WINDOW_MODE_WINDOWED,
        dashboardWindowedX: -1,
        dashboardWindowedY: -1,
        dashboardWindowedWidth: TAIL_WIDTH,
        dashboardWindowedHeight: TAIL_HEIGHT,
        ignoredScriptFolders: DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION,
        ignoredScriptFiles: DEFAULT_IGNORED_SCRIPT_FILES_OPTION,
    };
    for (const service of getDashboardServiceRegistry().services) {
        Object.assign(defaults, getPluginIntegrationDefaultOptions(service.pluginMetadata));
    }
    return defaults;
}

function migrateIgnoredScriptFolders(rawFolders) {
    const migrated = parseScriptFolders(rawFolders).map((folder) => {
        if (folder === "dashboard-core" || folder === "dashboard-integrations" || folder === "dashboard-libs") {
            return "dashboard";
        }
        return folder;
    });
    return normalizeScriptFolders(migrated);
}

function normalizeDashboardOptionsForCompare(rawOptions = {}) {
    const defaults = getDefaultOptions();
    const normalizeGeometryNumber = (value, fallback, minimum = Number.NEGATIVE_INFINITY) => {
        if (value === null || value === undefined || value === "") return fallback;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? Math.max(minimum, Math.floor(numeric)) : fallback;
    };
    const normalized = {
        reservedHomeRam: Number(rawOptions.reservedHomeRam) >= 0 ? Math.floor(Number(rawOptions.reservedHomeRam)) : defaults.reservedHomeRam,
        dashboardThemeMode: normalizeDashboardThemeMode(rawOptions.dashboardThemeMode ?? defaults.dashboardThemeMode),
        dashboardTextSizeMode: normalizeDashboardTextSizeMode(rawOptions.dashboardTextSizeMode ?? defaults.dashboardTextSizeMode),
        dashboardPlayerHudMode: normalizeDashboardPlayerHudMode(rawOptions.dashboardPlayerHudMode ?? defaults.dashboardPlayerHudMode),
        dashboardWindowStartupMode: normalizeDashboardStartupMode(rawOptions.dashboardWindowStartupMode ?? defaults.dashboardWindowStartupMode),
        dashboardLastWindowMode: normalizeDashboardWindowMode(rawOptions.dashboardLastWindowMode ?? defaults.dashboardLastWindowMode),
        dashboardWindowedX: normalizeGeometryNumber(rawOptions.dashboardWindowedX, defaults.dashboardWindowedX, -1),
        dashboardWindowedY: normalizeGeometryNumber(rawOptions.dashboardWindowedY, defaults.dashboardWindowedY, -1),
        dashboardWindowedWidth: normalizeGeometryNumber(rawOptions.dashboardWindowedWidth, defaults.dashboardWindowedWidth, 150),
        dashboardWindowedHeight: normalizeGeometryNumber(rawOptions.dashboardWindowedHeight, defaults.dashboardWindowedHeight, DEFAULT_TAIL_TITLE_HEIGHT),
        ignoredScriptFolders: migrateIgnoredScriptFolders(
            rawOptions.ignoredScriptFolders === undefined
                ? defaults.ignoredScriptFolders
                : rawOptions.ignoredScriptFolders
        ),
        ignoredScriptFiles: normalizeScriptFiles(
            rawOptions.ignoredScriptFiles === undefined
                ? defaults.ignoredScriptFiles
                : rawOptions.ignoredScriptFiles
        ),
    };
    for (const service of getDashboardServiceRegistry().services) {
        Object.assign(normalized, normalizePluginIntegrationOptions(service.pluginMetadata, rawOptions));
    }
    return normalized;
}

function areDashboardOptionsEqual(leftOptions, rightOptions) {
    const left = normalizeDashboardOptionsForCompare(leftOptions);
    const right = normalizeDashboardOptionsForCompare(rightOptions);
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => left[key] === right[key]);
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
    if (command?.kind === "dashboard") {
        const workerCommand = { kind: "dashboard", actionId: command.actionId };
        if (command.actionId === DASHBOARD_ACTION_IDS.RESTART_DASHBOARD) {
            workerCommand.dashboardPid = ns.pid;
            workerCommand.args = getDashboardRestartArgs(ns.args);
        }
        if (String(command.actionId).includes("script-list")) {
            const options = loadDashboardOptions(ns);
            workerCommand.ignoredFolders = parseScriptFolders(options.ignoredScriptFolders);
            workerCommand.ignoredFiles = parseScriptFiles(options.ignoredScriptFiles);
        }
        if (String(command.actionId).includes("script-list") || String(command.actionId).includes("plugin-list")) {
            workerCommand.pluginFiles = getDashboardPluginFiles();
        }
        return workerCommand;
    }
    if (command?.kind === "script") {
        const execution = resolveScriptActionExecution(command.actionId, command.filename);
        if (!execution || !["start", "stop", "restart"].includes(execution.executeType)) return null;
        if (command.filename === DASHBOARD_SCRIPT && execution.executeType === "restart") {
            return buildDashboardWorkerCommand(ns, {
                kind: "dashboard",
                actionId: DASHBOARD_ACTION_IDS.RESTART_DASHBOARD,
            });
        }
        return {
            kind: "script",
            actionId: execution.executeType,
            filename: command.filename,
            args: getScriptLaunchArgs(command.filename),
        };
    }
    if (command?.kind === "file") {
        const view = getDashboardFileActionView(command.viewId);
        if (!view) throw new Error("File Manager view is unavailable.");
        const workerCommand = {
            ...command,
            protection: view.protection ?? {},
            archiveRoot: normalizeFilePath(view?.archive?.root ?? "trashbin") || "trashbin",
        };
        if (command.actionId === "archive-many") {
            const manifest = normalizeFileManifest(loadFileManagerManifest(ns, view), view.manifest ?? {});
            if (!manifest.available) throw new Error("Cleanup requires a deployment manifest.");
            workerCommand.stalePaths = manifest.staleFiles;
        }
        return workerCommand;
    }
    return null;
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

function startNextDashboardWorkerAction(ns) {
    if (pendingDashboardActionWorker || dashboardActionWorkerQueue.length === 0) return;
    const rawCommand = dashboardActionWorkerQueue.shift();
    const requestId = `${ns.pid}-${Date.now()}-${++dashboardActionWorkerSequence}`;
    let envelope = null;
    try {
        envelope = normalizeActionWorkerEnvelope({ requestId, command: rawCommand });
    } catch (error) {
        const message = String(error?.message ?? error);
        completeDashboardWorkerAction(ns, { command: rawCommand }, { ok: false, message, tone: "error" });
        startNextDashboardWorkerAction(ns);
        return;
    }

    ns.write(DASHBOARD_ACTION_WORKER_RESULT_FILE, "", "w");
    const workerPid = ns.run(DASHBOARD_ACTION_WORKER_SCRIPT, 1, JSON.stringify(envelope));
    if (!(workerPid > 0)) {
        completeDashboardWorkerAction(ns, { command: envelope.command }, {
            ok: false,
            message: "Could not start the dashboard action worker. Check available home RAM.",
            tone: "error",
        });
        startNextDashboardWorkerAction(ns);
        return;
    }
    pendingDashboardActionWorker = {
        requestId,
        command: envelope.command,
        workerPid,
        startedAt: Date.now(),
    };
}

function pollDashboardWorkerAction(ns) {
    if (pendingDashboardActionWorker) {
        const result = parseActionWorkerResult(
            ns.read(DASHBOARD_ACTION_WORKER_RESULT_FILE),
            pendingDashboardActionWorker.requestId
        );
        if (result) {
            const completed = pendingDashboardActionWorker;
            pendingDashboardActionWorker = null;
            completeDashboardWorkerAction(ns, completed, result);
        } else if (Date.now() - pendingDashboardActionWorker.startedAt >= DASHBOARD_ACTION_WORKER_TIMEOUT_MS) {
            const timedOut = pendingDashboardActionWorker;
            pendingDashboardActionWorker = null;
            completeDashboardWorkerAction(ns, timedOut, {
                ok: false,
                message: "Dashboard action worker timed out.",
                tone: "error",
            });
        }
    }
    startNextDashboardWorkerAction(ns);
}

function queueDashboardWorkerAction(ns, command) {
    const workerCommand = buildDashboardWorkerCommand(ns, command);
    if (!workerCommand) return false;
    dashboardActionWorkerQueue.push(workerCommand);
    startNextDashboardWorkerAction(ns);
    return true;
}

function applyQueuedDashboardActions(ns) {
    if (!ns) return;
    pollDashboardWorkerAction(ns);

    const queue = flushDashboardActionQueue();
    if (!Array.isArray(queue) || queue.length === 0) return;

    for (const command of queue) {
        if (!command || typeof command !== "object") continue;

        try {
            if (command.kind === "window-mode") {
                const requestedMode = normalizeDashboardWindowMode(command.mode);
                if (requestedMode !== dashboardTailLayoutState.mode) {
                    dashboardTailLayoutState.requestedMode = requestedMode;
                }
                continue;
            }

            if (command.kind === "save-options") {
                const rawOptions = command.options;
                if (!rawOptions || typeof rawOptions !== "object") continue;
                const defaults = getDefaultOptions();
                const safeOptions = normalizeDashboardOptionsForCompare(rawOptions);
                saveDashboardOptions(ns, safeOptions);
                continue;
            }

            if (command.kind === "plugin-options") {
                const integration = getServiceById(command.serviceId)?.pluginMetadata;
                applyPluginIntegrationOptions(ns, integration, command.options, (tone, message) => {
                    logMajorAction(ns, message, tone);
                }, { running: latestHomeProcessFilenames.has(integration?.scriptPath) });
                continue;
            }

            if (command.kind === "plugin-command") {
                const integration = getServiceById(command.serviceId)?.pluginMetadata;
                applyPluginIntegrationCommand(
                    ns,
                    integration,
                    command.command,
                    (tone, message) => logMajorAction(ns, message, tone),
                    { running: latestHomeProcessFilenames.has(integration?.scriptPath) }
                );
                continue;
            }

            if (command.kind === "dashboard") {
                if (typeof command.actionId === "string") {
                    queueDashboardWorkerAction(ns, command);
                }
                continue;
            }

            if (command.kind === "file") {
                if (command.actionId === "refresh") {
                    setDashboardFileActionResult(command.viewId, "success", "Home filesystem rescanned.");
                } else {
                    queueDashboardWorkerAction(ns, command);
                }
                continue;
            }

            if (command.kind === "script") {
                if (typeof command.actionId === "string" && typeof command.filename === "string") {
                    performScriptFileAction(ns, command.actionId, command.filename);
                }
            }
        } catch (error) {
            const actionName = typeof command.kind === "string" ? command.kind : "unknown";
            const message = error && typeof error === "object" && "message" in error
                ? String(error.message)
                : String(error);
            logMajorAction(ns, `Dashboard action failed (${actionName}): ${message}`, "danger");
        }
    }
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

function buildSupervisorServiceStateLines(services, homeScripts, pluginRequirements, supervisorRunning) {
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
    rawIgnoredFiles = DEFAULT_IGNORED_SCRIPT_FILES_OPTION
) {
    const scripts = Array.isArray(homeScripts) ? homeScripts : [];
    const ignoredFolders = parseScriptFolders(rawIgnoredFolders);
    const ignoredFiles = parseScriptFiles(rawIgnoredFiles);
    const pluginScripts = scripts.filter((script) => isDashboardPluginScript(script?.filename));
    const dashboardCoreScripts = scripts.filter((script) => isDashboardCoreScript(script?.filename));
    const nonPluginScripts = getNonPluginScripts(scripts, ignoredFolders, ignoredFiles);

    return {
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
    { id: "hacking", title: "Hacking" },
    { id: "finances", title: "Finances" },
    { id: "hardware", title: "Hardware" },
    { id: "automation", title: "Automation" },
    { id: "globalOptions", title: "Global Options" },
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
            const hasPlayerStatsOption = Array.isArray(pluginDashboardOptionInputs)
                && pluginDashboardOptionInputs.some((input) => input.optionKey === "dashboardPlayerHudMode");
            return [
                { label: "Theme", value: normalizeDashboardThemeMode(options.dashboardThemeMode), tone: "info" },
                { label: "Text size", value: normalizeDashboardTextSizeMode(options.dashboardTextSizeMode), tone: "info" },
                ...(hasPlayerStatsOption
                    ? [{ label: "Player Stats", value: normalizeDashboardPlayerHudMode(options.dashboardPlayerHudMode), tone: "info" }]
                    : []),
                { label: "Window startup", value: normalizeDashboardStartupMode(options.dashboardWindowStartupMode), tone: "info" },
                { label: "Last window mode", value: normalizeDashboardWindowMode(options.dashboardLastWindowMode), tone: "neutral" },
                { label: "Ignored folders", value: configuredFolders.join(", ") || "None", tone: "info" },
                { label: "Ignored scripts", value: configuredFiles.join(", ") || "None", tone: "info" },
                { label: "Defaults", value: DEFAULT_IGNORED_SCRIPT_FOLDERS_OPTION, tone: "neutral" },
            ];
        },
        getActions: ({ selectedCenterPanel }) => {
            if (selectedCenterPanel !== "options") return [];
            return [{ id: "save-dashboard-options", label: "Save options", kind: "save-options" }];
        },
    },
    {
        id: "global.options",
        menuGroup: "globalOptions",
        menuLabel: "Script List",
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
            default: { title: "Script List", accent: "#ff7bd0", subtitle: "Home directory scripts" },
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
        getActions: ({ selectedScript }) => {
            return buildScriptActions(selectedScript);
        },
    },
    {
        id: "global.plugins",
        menuGroup: "globalOptions",
        menuLabel: "Plugins List",
        alwaysVisible: true,
        rendererKey: "global.plugins",
        defaultPanelId: "",
        subviews: [],
        getPanels: (homeScripts = []) => homeScripts
            .filter((script) => isDashboardPluginScript(script?.filename) || isDashboardCoreScript(script?.filename))
            .map((script) => ({
                id: script.id,
                label: script.label,
                running: script.running,
                daemon: script.daemon,
            })),
        panelMeta: {
            default: { title: "Plugin List", accent: "#6cb4ff", subtitle: "Dashboard plugin scripts" },
            script: { title: "Plugin", accent: "#6cb4ff", subtitle: "Plugin status and controls" },
        },
        getHealth: ({ homeScripts }) => summarizeScriptListHealth((homeScripts ?? []).filter((script) => {
            return isDashboardPluginScript(script?.filename) || isDashboardCoreScript(script?.filename);
        })),
        getState: ({ selectedScript, homeScripts, pluginRequirements }) => {
            if (!selectedScript) return [];
            const scriptTypeLabel = isDashboardCoreScript(selectedScript.filename) ? "Dashboard Core" : "Plugin";
            const scriptLines = [
                { label: scriptTypeLabel, value: selectedScript.label, tone: "info" },
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
                    selectedScript.running
                ),
            ];
        },
        getActions: ({ selectedScript }) => {
            return buildScriptActions(selectedScript);
        },
    },
];

const DASHBOARD_MENU_GROUP_IDS = new Set(DASHBOARD_MENU_GROUPS.map((group) => group.id));
const DASHBOARD_VIEW_RENDERERS = new Set(["system-overview", "network-map", "file-manager", "script-log"]);
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
    const issues = [];
    const validServices = [];
    const seenIds = new Set();

    for (const service of services) {
        if (!service || typeof service !== "object") {
            issues.push("Service entry is not an object.");
            continue;
        }

        if (typeof service.id !== "string" || service.id.length === 0) {
            issues.push("Service is missing a valid id.");
            continue;
        }

        if (seenIds.has(service.id)) {
            issues.push(`Duplicate service id: ${service.id}`);
            continue;
        }
        seenIds.add(service.id);

        if (!DASHBOARD_MENU_GROUP_IDS.has(service.menuGroup)) {
            issues.push(`Service ${service.id} references unknown menu group: ${service.menuGroup}`);
            continue;
        }

        if (typeof service.menuLabel !== "string" || service.menuLabel.length === 0) {
            issues.push(`Service ${service.id} is missing menuLabel.`);
            continue;
        }

        if (service.subviews != null && !Array.isArray(service.subviews)) {
            issues.push(`Service ${service.id} has non-array subviews.`);
            continue;
        }

        if (Array.isArray(service.subviews)) {
            const panelIds = new Set();
            for (const panel of service.subviews) {
                if (!panel || typeof panel.id !== "string" || typeof panel.label !== "string") {
                    issues.push(`Service ${service.id} has invalid subview.`);
                    continue;
                }
                panelIds.add(panel.id);
            }

            if (service.defaultPanelId && !panelIds.has(service.defaultPanelId)) {
                issues.push(`Service ${service.id} defaultPanelId is not present in subviews.`);
                if (SERVICE_CONTRACT_STRICT_MODE) {
                    continue;
                }
            }
        }

        validServices.push(service);
    }

    const byId = new Map(validServices.map((service) => [service.id, service]));
    return { services: validServices, byId, issues };
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
    const validViews = [];
    const seenIds = new Set();
    for (const view of views) {
        if (!view || typeof view !== "object") continue;
        if (typeof view.id !== "string" || !view.id || seenIds.has(view.id)) continue;
        if (!DASHBOARD_MENU_GROUP_IDS.has(view.menuGroup)) continue;
        if (!DASHBOARD_VIEW_RENDERERS.has(view.renderer)) continue;
        if (!Array.isArray(view.widgets)) continue;

        const widgetIds = new Set();
        const widgets = view.widgets.filter((widget) => {
            const valid = widget
                && typeof widget === "object"
                && widget.enabled !== false
                && typeof widget.id === "string"
                && widget.id.length > 0
                && !widgetIds.has(widget.id)
                && DASHBOARD_HOME_WIDGET_TYPES.has(widget.type);
            if (valid) widgetIds.add(widget.id);
            return valid;
        });
        seenIds.add(view.id);
        validViews.push({ ...view, widgets });
    }

    return {
        views: validViews,
        byId: new Map(validViews.map((view) => [view.id, view])),
    };
}

function getDashboardViewRegistry() {
    const registry = globalThis[DASHBOARD_VIEW_REGISTRY_KEY];
    if (registry && Array.isArray(registry.views) && registry.byId instanceof Map) return registry;
    const fallback = validateDashboardViews([]);
    globalThis[DASHBOARD_VIEW_REGISTRY_KEY] = fallback;
    return fallback;
}

function applyDashboardViewWidgetContributions(views, services) {
    const widgetsByViewId = new Map();
    const layoutByViewId = new Map();
    for (const service of Array.isArray(services) ? services : []) {
        const contributions = service?.pluginMetadata?.viewWidgets;
        if (!Array.isArray(contributions)) continue;
        for (const contribution of contributions) {
            const viewId = typeof contribution?.viewId === "string" ? contribution.viewId : "";
            if (!viewId) continue;
            const { viewId: ignoredViewId, viewLayout, ...widget } = contribution;
            if (viewLayout && typeof viewLayout === "object" && !Array.isArray(viewLayout)) {
                layoutByViewId.set(viewId, {
                    ...(layoutByViewId.get(viewId) ?? {}),
                    ...viewLayout,
                });
            }
            const widgets = widgetsByViewId.get(viewId) ?? [];
            widgets.push(widget);
            widgetsByViewId.set(viewId, widgets);
        }
    }

    return (Array.isArray(views) ? views : []).map((view) => ({
        ...view,
        layout: {
            ...(view?.layout ?? {}),
            ...(layoutByViewId.get(view?.id) ?? {}),
        },
        widgets: [
            ...(Array.isArray(view?.widgets) ? view.widgets : []),
            ...(widgetsByViewId.get(view?.id) ?? []),
        ],
    }));
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

function rebuildDashboardServiceRegistry(ns, homeScripts = []) {
    const filenames = homeScripts.map((script) => script.filename).sort(compareScriptPathsByName);
    const pluginCacheKey = `${filenames.join("|")}::${PLUGIN_RUNTIME_EXCLUDED_FOLDERS.join("|")}`;
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
    const services = getDashboardServiceRegistry().services;
    for (const group of DASHBOARD_MENU_GROUPS) {
        const service = services.find((candidate) => candidate.menuGroup === group.id);
        if (service) return service.id;
    }
    return services[0]?.id ?? "";
}

function getMenuGroups() {
    const registry = getDashboardServiceRegistry();
    return DASHBOARD_MENU_GROUPS.map((group) => ({
        id: group.id,
        title: group.title,
        items: registry.services
            .filter((service) => service.menuGroup === group.id && service.menuVisible !== false)
            .map((service) => ({
                id: service.id,
                label: service.menuLabel,
                alwaysVisible: Boolean(service.alwaysVisible),
            })),
    }));
}

function getCenterPanelsForItem(selectedItem, homeScripts = []) {
    const service = getServiceById(selectedItem);
    if (!service) {
        return [{ id: "core-stats", label: "Core stats" }];
    }

    if (typeof service.getPanels === "function") {
        const dynamicPanels = service.getPanels(homeScripts);
        if (Array.isArray(dynamicPanels) && dynamicPanels.length > 0) {
            return dynamicPanels;
        }
    }

    if (Array.isArray(service.subviews) && service.subviews.length > 0) {
        return service.subviews;
    }

    // Script and plugin lists should render as empty when there are no eligible scripts,
    // rather than falling back to a synthetic placeholder panel.
    if (service.id === "global.options" || service.id === "global.plugins") {
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

function TonePill({ label, value, tone = "neutral" }) {
    const tones = {
        neutral: { border: "rgba(125, 160, 212, 0.18)", value: "#eef5ff" },
        warn: { border: "rgba(255, 198, 92, 0.35)", value: "#ffd88a" },
        danger: { border: "rgba(255, 122, 122, 0.35)", value: "#ffb0b0" },
        success: { border: "rgba(110, 231, 168, 0.35)", value: "#baf6d2" },
        info: { border: "rgba(108, 180, 255, 0.35)", value: "#c8e0ff" }
    };
    const style = tones[tone] ?? tones.neutral;

    return (
        <div data-dashboard-theme-role="quick-stat" style={{ ...WIDGET_STYLES.pill, borderColor: style.border }}>
            <div style={WIDGET_STYLES.pillLabel}>{label}</div>
            <div data-dashboard-theme-role="stat-value" style={{ ...WIDGET_STYLES.pillValue, color: style.value }}>{value}</div>
        </div>
    );
}

function formatUtilizationPercent(ratio) {
    const percentage = Math.max(0, Number(ratio) || 0) * 100;
    if (percentage === 0) return "0%";
    if (percentage < 0.01) return "<0.01%";
    if (percentage < 1) return `${percentage.toFixed(2)}%`;
    if (percentage < 10) return `${percentage.toFixed(1)}%`;
    return `${Math.round(percentage)}%`;
}

function RamGauge({ label, shortLabel, used: rawUsed, total: rawTotal, ratio: rawRatio, valueFormat = "ram", size: rawSize = 60 }) {
    const used = Math.max(0, Number(rawUsed) || 0);
    const total = Math.max(0, Number(rawTotal) || 0);
    const size = Math.max(48, Math.min(120, Math.floor(Number(rawSize) || 60)));
    const center = size / 2;
    const strokeWidth = Math.max(5, Math.round(size * 0.066));
    const radius = center - strokeWidth - 2;
    const configuredRatio = Number(rawRatio);
    const ratio = Number.isFinite(configuredRatio) && configuredRatio >= 0
        ? configuredRatio
        : total > 0
            ? used / total
            : 0;
    const hasCapacity = total > 0;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const health = getRamHealthLevel({ ratio });
    const stroke = !hasCapacity
        ? "#759875"
        : health === "danger"
        ? "#ff7a7a"
        : health === "warn"
            ? "#ffc65c"
            : "#6ee7a8";
    const circumference = 2 * Math.PI * radius;
    const percentage = hasCapacity ? formatUtilizationPercent(ratio) : "n/a";
    const formattedUsed = valueFormat === "ram" ? formatRam(used) : used.toLocaleString();
    const formattedTotal = valueFormat === "ram" ? formatRam(total) : total.toLocaleString();
    const title = hasCapacity
        ? `${label}: ${formattedUsed} / ${formattedTotal} (${percentage})`
        : `${label}: no capacity`;

    return (
        <div
            role="meter"
            aria-label={`${label} utilization`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.min(100, ratio * 100)}
            title={title}
            style={{
                position: "relative",
                width: `${size}px`,
                height: `${size}px`,
                flex: "0 0 auto",
            }}
        >
            <svg
                viewBox={`0 0 ${size} ${size}`}
                width={size}
                height={size}
                aria-hidden="true"
                style={{ display: "block", transform: "rotate(-90deg)" }}
            >
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="rgba(8, 8, 8, 0.96)"
                    stroke="rgba(125, 160, 212, 0.18)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: circumference * (1 - clampedRatio),
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.05,
                    pointerEvents: "none",
                }}
            >
                <div style={{ color: stroke, fontSize: percentage.length > 5 ? `${Math.max(9, size * 0.14)}px` : `${Math.max(10, size * 0.16)}px`, fontWeight: 800 }}>
                    {percentage}
                </div>
                <div style={{ color: "#7fda7f", fontSize: `${Math.max(7, size * 0.095)}px`, letterSpacing: "0.08em", marginTop: "2px" }}>
                    {shortLabel}
                </div>
            </div>
        </div>
    );
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

function DataGraph({ section, index = 0, presentation = "default" }) {
    const terminalMode = presentation === "terminal" && activeDashboardTheme?.followGame === true;
    const rawData = Array.isArray(section?.data) ? section.data : [];
    const requestedPointLimit = Math.floor(Number(section?.maxPoints));
    const pointLimit = Number.isFinite(requestedPointLimit)
        ? Math.max(2, Math.min(2000, requestedPointLimit))
        : 240;
    const xKey = typeof section?.xKey === "string" ? section.xKey : "";
    const series = (Array.isArray(section?.series) ? section.series : [])
        .filter((entry) => {
            return entry
                && typeof entry.key === "string"
                && entry.key.length > 0
                && typeof entry.label === "string";
        });
    const points = rawData
        .slice(-pointLimit)
        .map((record, pointIndex) => {
            const rawX = xKey ? Number(getGraphValue(record, xKey)) : pointIndex;
            if (!Number.isFinite(rawX)) return null;
            return { record, x: rawX };
        })
        .filter(Boolean)
        .sort((left, right) => left.x - right.x);
    const yValues = points.flatMap(({ record }) => {
        return series
            .map((entry) => Number(getGraphValue(record, entry.key)))
            .filter(Number.isFinite);
    });
    const frameStyle = {
        ...WIDGET_STYLES.sectionFrame,
        marginTop: index > 0 ? "5px" : 0,
        ...(terminalMode ? {
            padding: "7px 8px 5px",
            background: "#000000",
        } : {}),
    };
    const title = section?.title || "History";

    if (points.length === 0 || series.length === 0 || yValues.length === 0) {
        return (
            <div data-dashboard-theme-role="graph-panel" style={frameStyle}>
                <div
                    data-dashboard-theme-role="data-heading"
                    title={title}
                    style={{ ...WIDGET_STYLES.strong, ...WIDGET_STYLES.graphTitle, marginBottom: "5px" }}
                >
                    {terminalMode ? "> " : ""}{title}
                </div>
                <div style={WIDGET_STYLES.muted}>
                    {section?.emptyText || "Collecting history data..."}
                </div>
            </div>
        );
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
    const plot = {
        left: 68,
        right: graphWidth - 12,
        top: 10,
        bottom: graphHeight - 25,
    };
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    const scaleX = (value) => plot.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
    const scaleY = (value) => plot.bottom - ((value - yMin) / (yMax - yMin)) * plotHeight;
    const gridTicks = Array.from({ length: 5 }, (_, tickIndex) => {
        const ratio = tickIndex / 4;
        const value = yMax - ratio * (yMax - yMin);
        return { value, y: plot.top + ratio * plotHeight };
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
            latest = { x, y, value, timestamp: point.x };
        }
        return {
            ...entry,
            color: entry.color || ["#6ee7a8", "#6cb4ff", "#c084fc", "#ffc66c"][seriesIndex % 4],
            path,
            latest,
        };
    }).filter((entry) => entry.path && entry.latest);

    return (
        <div data-dashboard-theme-role="graph-panel" style={frameStyle}>
            <div style={WIDGET_STYLES.graphHeader}>
                <div data-dashboard-theme-role="data-heading" title={title} style={{ ...WIDGET_STYLES.strong, ...WIDGET_STYLES.graphTitle }}>
                    {terminalMode ? "> " : ""}{title}
                </div>
                <div style={{ ...WIDGET_STYLES.muted, ...WIDGET_STYLES.tiny, ...WIDGET_STYLES.graphPointCount }}>
                    {terminalMode ? `[${points.length} pts]` : `${points.length} point${points.length === 1 ? "" : "s"}`}
                </div>
            </div>
            <div style={WIDGET_STYLES.graphLegend}>
                {renderedSeries.map((entry) => (
                    <div key={entry.key} style={WIDGET_STYLES.graphLegendItem}>
                        <span style={{ ...WIDGET_STYLES.graphSwatch, borderRadius: terminalMode ? 0 : WIDGET_STYLES.graphSwatch.borderRadius, background: entry.color }} />
                        <span data-dashboard-theme-role="data-value">
                            {entry.label}{terminalMode ? " = " : ": "}{formatCompactDashboardValue(entry.latest.value, yFormat)}
                        </span>
                    </div>
                ))}
            </div>
            <svg
                role="img"
                aria-label={title}
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                preserveAspectRatio="none"
                style={{ ...WIDGET_STYLES.graphCanvas, height: `${graphHeight}px` }}
            >
                <title>{title}</title>
                {gridTicks.map((tick, tickIndex) => (
                    <g key={`grid-${tickIndex}`}>
                        <line
                            x1={plot.left}
                            y1={tick.y}
                            x2={plot.right}
                            y2={tick.y}
                            stroke={terminalMode ? "rgba(238, 245, 255, 0.11)" : "rgba(125, 160, 125, 0.16)"}
                            strokeDasharray={terminalMode ? "2 5" : undefined}
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                        />
                        <text
                            x={plot.left - 7}
                            y={tick.y}
                            fill={terminalMode ? "#999999" : "#759875"}
                            fontSize="9"
                            textAnchor="end"
                            dominantBaseline="middle"
                        >
                            {formatCompactDashboardValue(tick.value, yFormat)}
                        </text>
                    </g>
                ))}
                {terminalMode ? React.createElement("path", {
                    "aria-hidden": "true",
                    d: `M ${plot.left} ${plot.top} V ${plot.bottom} H ${plot.right} v 4`,
                    fill: "none",
                    stroke: "rgba(238, 245, 255, 0.34)",
                    strokeWidth: "1",
                    vectorEffect: "non-scaling-stroke",
                }) : null}
                {yMin < 0 && yMax > 0 ? (
                    <line
                        x1={plot.left}
                        y1={scaleY(0)}
                        x2={plot.right}
                        y2={scaleY(0)}
                        stroke="rgba(238, 245, 255, 0.38)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                ) : null}
                {renderedSeries.map((entry) => (
                    <g key={entry.key}>
                        <path
                            d={entry.path}
                            fill="none"
                            stroke={entry.color}
                            strokeWidth={Number(entry.strokeWidth) || 2}
                            strokeLinejoin={terminalMode ? "miter" : "round"}
                            strokeLinecap={terminalMode ? "square" : "round"}
                            vectorEffect="non-scaling-stroke"
                        />
                        {terminalMode ? React.createElement("rect", {
                            x: entry.latest.x - 3,
                            y: entry.latest.y - 3,
                            width: "6",
                            height: "6",
                            fill: entry.color,
                            vectorEffect: "non-scaling-stroke",
                        }, React.createElement("title", null,
                            `${entry.label}: ${formatCompactDashboardValue(entry.latest.value, yFormat)}`
                        )) : (
                            <circle
                                cx={entry.latest.x}
                                cy={entry.latest.y}
                                r="3"
                                fill={entry.color}
                                vectorEffect="non-scaling-stroke"
                            >
                                <title>
                                    {entry.label}: {formatCompactDashboardValue(entry.latest.value, yFormat)}
                                </title>
                            </circle>
                        )}
                    </g>
                ))}
                <text x={plot.left} y={graphHeight - 7} fill={terminalMode ? "#999999" : "#759875"} fontSize="9" textAnchor="start">
                    {formatGraphXValue(xMin, xFormat)}
                </text>
                <text x={plot.right} y={graphHeight - 7} fill={terminalMode ? "#999999" : "#759875"} fontSize="9" textAnchor="end">
                    {formatGraphXValue(xMax, xFormat)}
                </text>
            </svg>
        </div>
    );
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

function HomePanel({ title, subtitle = "", children }) {
    return (
        <section data-dashboard-theme-role="card-frame" style={WIDGET_STYLES.homePanel}>
            <div style={WIDGET_STYLES.homePanelHeader}>
                <div style={WIDGET_STYLES.homePanelTitle}>{title}</div>
                {subtitle ? <div style={WIDGET_STYLES.homePanelSubtitle}>{subtitle}</div> : null}
            </div>
            {children}
        </section>
    );
}

function PluginRuntimeWarning({ statuses = [] }) {
    const stoppedStatuses = (Array.isArray(statuses) ? statuses : [])
        .filter((status) => status?.requiresRuntime && !status?.running);
    if (stoppedStatuses.length === 0) return null;

    const serviceNames = stoppedStatuses
        .map((status) => String(status.label ?? status.serviceId ?? "Plugin"))
        .join(", ");
    return (
        <div
            role="status"
            style={{
                marginBottom: "8px",
                padding: "6px 8px",
                color: "#ffd17a",
                fontSize: "9px",
                lineHeight: 1.35,
                border: "1px solid rgba(255, 198, 92, 0.35)",
                borderRadius: "6px",
                background: "rgba(34, 24, 10, 0.92)",
            }}
        >
            <strong>{serviceNames}</strong> {stoppedStatuses.length === 1 ? "service is" : "services are"} stopped. Showing cached data.
        </div>
    );
}

function HomeMetricCard({ metric }) {
    const palette = getHomeTonePalette(metric?.tone);
    return (
        <div
            title={`${metric?.label ?? "Metric"}: ${metric?.value ?? "n/a"}`}
            style={{
                ...WIDGET_STYLES.homeMetric,
                borderColor: palette.border,
                background: `linear-gradient(140deg, ${palette.glow}, rgba(5, 9, 8, 0.82) 58%)`,
                boxShadow: `inset 0 -2px 0 ${palette.accent}`,
            }}
        >
            <div style={WIDGET_STYLES.homeMetricLabel}>{metric?.label ?? "Metric"}</div>
            <div data-dashboard-theme-role="stat-value" style={{ ...WIDGET_STYLES.homeMetricValue, color: palette.accent }}>
                {metric?.value ?? "n/a"}
            </div>
            {metric?.sourceLabel ? (
                <div style={WIDGET_STYLES.homeMetricSource}>{metric.sourceLabel}</div>
            ) : null}
        </div>
    );
}

function HomeHealthRing({ counts }) {
    const segments = [
        { id: "danger", label: "Danger", count: Math.max(0, Number(counts?.danger) || 0), color: "#ff7a7a" },
        { id: "warn", label: "Warning", count: Math.max(0, Number(counts?.warn) || 0), color: "#ffc65c" },
        { id: "healthy", label: "Healthy", count: Math.max(0, Number(counts?.healthy) || 0), color: "#6ee7a8" },
    ];
    const total = segments.reduce((sum, segment) => sum + segment.count, 0);
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const ringSegments = segments.map((segment) => {
        const length = total > 0 ? (segment.count / total) * circumference : 0;
        const ring = { ...segment, length, offset };
        offset += length;
        return ring;
    });

    return (
        <div style={WIDGET_STYLES.homeHealthLayout}>
            <div style={{ position: "relative", width: "108px", height: "108px" }}>
                <svg viewBox="0 0 108 108" width="108" height="108" aria-label={`${total} monitored services`}>
                    <circle cx="54" cy="54" r={radius} fill="rgba(4, 8, 7, 0.86)" stroke="rgba(125, 160, 212, 0.14)" strokeWidth="10" />
                    {ringSegments.filter((segment) => segment.length > 0).map((segment) => (
                        <circle
                            key={segment.id}
                            cx="54"
                            cy="54"
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="10"
                            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                            strokeDashoffset={-segment.offset}
                            transform="rotate(-90 54 54)"
                        />
                    ))}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ color: "#e7fff0", fontSize: "20px", fontWeight: 800 }}>{total}</div>
                    <div style={{ color: "#6c8b78", fontSize: "7px", letterSpacing: "0.12em" }}>SERVICES</div>
                </div>
            </div>
            <div style={WIDGET_STYLES.homeHealthLegend}>
                {segments.map((segment) => (
                    <div key={segment.id} style={WIDGET_STYLES.homeHealthLegendRow}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: segment.color }} />
                        <span>{segment.label}</span>
                        <span style={{ color: segment.color, fontWeight: 800 }}>{segment.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HomeGaugeCard({ gauge, size = 84 }) {
    const used = Math.max(0, Number(gauge?.used) || 0);
    const total = Math.max(0, Number(gauge?.total) || 0);
    const valueFormat = gauge?.valueFormat ?? "number";
    return (
        <div style={WIDGET_STYLES.homeGaugeCard}>
            <RamGauge {...gauge} size={size} />
            <div style={WIDGET_STYLES.homeGaugeValue}>
                {formatResourceCardValue(used, valueFormat)} / {formatResourceCardValue(total, valueFormat)}
            </div>
        </div>
    );
}

function HomeServiceLandscape({ groups, healthById }) {
    return (
        <div style={WIDGET_STYLES.homeServiceGrid}>
            {groups.map((group) => {
                const counts = group.services.reduce((result, service) => {
                    const level = healthById?.[service.id]?.level ?? "neutral";
                    if (level === "danger") result.danger += 1;
                    else if (level === "warn") result.warn += 1;
                    else result.healthy += 1;
                    return result;
                }, { danger: 0, warn: 0, healthy: 0 });
                const total = group.services.length;
                const segments = [
                    { id: "danger", count: counts.danger, color: "#ff7a7a" },
                    { id: "warn", count: counts.warn, color: "#ffc65c" },
                    { id: "healthy", count: counts.healthy, color: "#6ee7a8" },
                ];
                return (
                    <div key={group.id} style={WIDGET_STYLES.homeServiceRow}>
                        <div style={WIDGET_STYLES.homeServiceLabel}>
                            <span>{group.title}</span>
                            <span>{total}</span>
                        </div>
                        <div style={WIDGET_STYLES.homeServiceBar} title={`${group.title}: ${counts.healthy} healthy, ${counts.warn} warning, ${counts.danger} danger`}>
                            {segments.filter((segment) => segment.count > 0).map((segment) => (
                                <span
                                    key={segment.id}
                                    style={{
                                        width: `${(segment.count / total) * 100}%`,
                                        background: segment.color,
                                        boxShadow: `0 0 8px ${segment.color}44`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function selectDashboardViewItems(items, widget) {
    const candidates = Array.isArray(items) ? items : [];
    let selected = candidates;

    if (widget?.includeSystem === false) {
        selected = selected.filter((item) => item?.sourceKind !== "system");
    }
    if (Array.isArray(widget?.serviceIds) && widget.serviceIds.length > 0) {
        const serviceIds = new Set(widget.serviceIds.filter((value) => typeof value === "string"));
        selected = selected.filter((item) => serviceIds.has(item?.serviceId));
    }
    if (Array.isArray(widget?.menuGroups) && widget.menuGroups.length > 0) {
        const menuGroups = new Set(widget.menuGroups.filter((value) => typeof value === "string"));
        selected = selected.filter((item) => menuGroups.has(item?.menuGroup));
    }
    if (Array.isArray(widget?.itemIds) && widget.itemIds.length > 0) {
        const byId = new Map(selected.map((item) => [item.id, item]));
        selected = widget.itemIds.map((itemId) => byId.get(itemId)).filter(Boolean);
    }

    const maximum = Math.floor(Number(widget?.maxItems));
    return Number.isFinite(maximum) && maximum >= 0 ? selected.slice(0, maximum) : selected;
}

function selectDashboardViewServiceGroups(groups, widget) {
    const menuGroups = Array.isArray(widget?.menuGroups) && widget.menuGroups.length > 0
        ? new Set(widget.menuGroups.filter((value) => typeof value === "string"))
        : null;
    const serviceIds = Array.isArray(widget?.serviceIds) && widget.serviceIds.length > 0
        ? new Set(widget.serviceIds.filter((value) => typeof value === "string"))
        : null;

    return (Array.isArray(groups) ? groups : [])
        .filter((group) => !menuGroups || menuGroups.has(group.id))
        .map((group) => ({
            ...group,
            services: serviceIds
                ? group.services.filter((service) => serviceIds.has(service.id))
                : group.services,
        }))
        .filter((group) => group.services.length > 0);
}

function SystemOverview({ view, metrics, playerHudDefinitions, playerStatsEnabled, dashboardTheme, gauges, healthServices, serviceGroups, serviceHealthById, serviceRuntimeById, graphs, scrollRef, onScroll, onExit, windowControl, killAllControl }) {
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
        ? `repeat(${columns - 1}, minmax(0, 1fr)) ${PLAYER_STATS_WIDGET_WIDTH}px`
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
            return (
                <div key={widget.id} style={wrapperStyle}>
                    <HomePanel title={title} subtitle={subtitle}>
                        {selectedMetrics.length > 0 ? (
                            <div style={WIDGET_STYLES.homeMetricGrid}>
                                {selectedMetrics.map((metric) => <HomeMetricCard key={metric.id} metric={metric} />)}
                            </div>
                        ) : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                    </HomePanel>
                </div>
            );
        }

        if (widget.type === "player-stats") {
            if (playerStatsEnabled === false) return null;
            const widgetServiceIds = Array.isArray(widget.serviceIds)
                ? widget.serviceIds.filter((value) => typeof value === "string")
                : [];
            const serviceIds = widgetServiceIds.length > 0
                ? new Set(widgetServiceIds)
                : null;
            const selectedDefinitions = (Array.isArray(playerHudDefinitions) ? playerHudDefinitions : [])
                .filter((definition) => (!serviceIds || serviceIds.has(definition.serviceId)) && (definition.groups?.length ?? 0) > 0);
            const runtimeStatuses = widgetServiceIds.map((serviceId) => serviceRuntimeById?.[serviceId]).filter(Boolean);
            return (
                <div key={widget.id} style={{ ...wrapperStyle, ...WIDGET_STYLES.playerStatusColumn }}>
                    <HomePanel title={title} subtitle={subtitle}>
                        <PluginRuntimeWarning statuses={runtimeStatuses} />
                        {selectedDefinitions.length > 0
                            ? <PlayerStatsOverview definitions={selectedDefinitions} dashboardTheme={dashboardTheme} groupIds={widget.groupIds} orientation={widget.orientation} />
                            : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                    </HomePanel>
                </div>
            );
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
                .sort((left, right) => {
                    if (left.level === right.level) return left.label.localeCompare(right.label);
                    return left.level === "danger" ? -1 : 1;
                });
            const configuredAlertLimit = Math.floor(Number(widget.maxAlerts));
            const alertLimit = Number.isFinite(configuredAlertLimit) ? Math.max(0, configuredAlertLimit) : 2;
            const visibleAlerts = alerts.slice(0, alertLimit);
            const hiddenAlertCount = Math.max(0, alerts.length - visibleAlerts.length);
            return (
                <div key={widget.id} style={wrapperStyle}>
                    <HomePanel title={title} subtitle={subtitle}>
                        <HomeHealthRing counts={counts} />
                        <div style={WIDGET_STYLES.homeAlertList}>
                            {visibleAlerts.length > 0 ? visibleAlerts.map((alert) => {
                                const palette = getHomeTonePalette(alert.level);
                                return (
                                    <div key={alert.id} style={{ ...WIDGET_STYLES.homeAlert, borderColor: palette.border }}>
                                        <span style={{ color: palette.accent, fontWeight: 800 }}>{alert.level === "danger" ? "!!" : "!"}</span>
                                        <span><span style={{ color: palette.accent }}>{alert.label}</span>{alert.summary ? ` — ${alert.summary}` : ""}</span>
                                    </div>
                                );
                            }) : (
                                <div style={{ ...WIDGET_STYLES.homeAlert, borderColor: "rgba(110, 231, 168, 0.2)", color: "#8ef0b5" }}>
                                    <span>✓</span><span>No warnings or danger alerts.</span>
                                </div>
                            )}
                            {hiddenAlertCount > 0 ? <div style={WIDGET_STYLES.homePanelSubtitle}>+{hiddenAlertCount} more alert{hiddenAlertCount === 1 ? "" : "s"}</div> : null}
                        </div>
                    </HomePanel>
                </div>
            );
        }

        if (widget.type === "gauges") {
            const selectedGauges = selectDashboardViewItems(gauges, widget);
            const configuredGaugeSize = Math.floor(Number(widget.gaugeSize));
            const gaugeSize = Number.isFinite(configuredGaugeSize) ? configuredGaugeSize : 84;
            return (
                <div key={widget.id} style={wrapperStyle}>
                    <HomePanel title={title} subtitle={subtitle}>
                        {selectedGauges.length > 0 ? (
                            <div style={WIDGET_STYLES.homeGaugeGrid}>
                                {selectedGauges.map((gauge) => <HomeGaugeCard key={gauge.id} gauge={gauge} size={gaugeSize} />)}
                            </div>
                        ) : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                    </HomePanel>
                </div>
            );
        }

        if (widget.type === "service-health") {
            const selectedGroups = selectDashboardViewServiceGroups(serviceGroups, widget);
            return (
                <div key={widget.id} style={wrapperStyle}>
                    <HomePanel title={title} subtitle={subtitle}>
                        {selectedGroups.length > 0
                            ? <HomeServiceLandscape groups={selectedGroups} healthById={serviceHealthById} />
                            : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                    </HomePanel>
                </div>
            );
        }

        if (widget.type === "graphs") {
            const selectedGraphs = selectDashboardViewItems(graphs, widget);
            const configuredGraphColumns = Math.floor(Number(widget.graphColumns));
            const graphColumns = Number.isFinite(configuredGraphColumns) ? Math.max(1, Math.min(4, configuredGraphColumns)) : 2;
            const configuredGraphHeight = Math.floor(Number(widget.graphHeight));
            const graphHeight = Number.isFinite(configuredGraphHeight) ? configuredGraphHeight : 160;
            return (
                <div key={widget.id} style={wrapperStyle}>
                    <HomePanel title={title} subtitle={subtitle}>
                        {selectedGraphs.length > 0 ? (
                            <div style={{ ...WIDGET_STYLES.homeGraphGrid, marginTop: 0, gridTemplateColumns: `repeat(${graphColumns}, minmax(0, 1fr))` }}>
                                {selectedGraphs.map((graph) => (
                                    <DataGraph key={graph.id} section={{ ...graph, height: graphHeight }} index={0} presentation="terminal" />
                                ))}
                            </div>
                        ) : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                    </HomePanel>
                </div>
            );
        }

        return null;
    };

    return (
        <main
            data-dashboard-theme-role="app-frame"
            ref={scrollRef}
            aria-label="System overview"
            style={WIDGET_STYLES.systemOverview}
            onScroll={onScroll}
        >
            <div style={WIDGET_STYLES.homeHeader}>
                <div>
                    <div style={WIDGET_STYLES.homeTitle}>{view?.title ?? view?.menuLabel ?? "Overview"}</div>
                    {view?.subtitle ? <div style={{ ...WIDGET_STYLES.muted, marginTop: "3px" }}>{view.subtitle}</div> : null}
                </div>
                <div style={getDashboardFrameControlGroupStyle()}>
                    {killAllControl}
                    {windowControl}
                    <button
                        type="button"
                        title="Close System Overview and return to dashboard controls"
                        style={getDashboardFrameControlStyle("neutral")}
                        onClick={onExit}
                    >
                        {view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}
                    </button>
                </div>
            </div>

            <div
                style={{
                    ...WIDGET_STYLES.homeWidgetGrid,
                    gridTemplateColumns,
                    gap: `${gap}px`,
                }}
            >
                {widgets.map(renderWidget)}
            </div>
        </main>
    );
}

function getDashboardViewValue(source, key) {
    if (!source || typeof source !== "object" || typeof key !== "string" || !key) return undefined;
    return key.split(".").reduce((value, segment) => {
        if (!value || typeof value !== "object" || !(segment in value)) return undefined;
        return value[segment];
    }, source);
}

function getDashboardViewInteractionState(viewId) {
    const registry = globalThis[DASHBOARD_VIEW_INTERACTION_STATE_KEY];
    if (!registry || typeof registry !== "object") return {};
    const saved = registry[viewId];
    return saved && typeof saved === "object" ? saved : {};
}

function saveDashboardViewInteractionState(viewId, state) {
    const registry = globalThis[DASHBOARD_VIEW_INTERACTION_STATE_KEY];
    globalThis[DASHBOARD_VIEW_INTERACTION_STATE_KEY] = {
        ...(registry && typeof registry === "object" ? registry : {}),
        [viewId]: state,
    };
}

function formatNetworkMapMetric(primary, secondary, format) {
    const left = Number(primary) || 0;
    const right = Number(secondary) || 0;
    if (format === "ramRatio") return `${formatRam(left)} / ${formatRam(right)}`;
    if (format === "moneyRatio") return `${formatMoney(left)} / ${formatMoney(right)}`;
    if (format === "ratio") return `${left.toLocaleString()} / ${right.toLocaleString()}`;
    if (format === "percent") return `${(left * 100).toFixed(1)}%`;
    if (format === "decimal") return left.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (format === "boolean") return primary ? "Yes" : "No";
    if (format === "ram") return formatRam(left);
    if (format === "money") return formatMoney(left);
    if (format === "number") return left.toLocaleString();
    return secondary === undefined ? String(primary ?? "n/a") : `${primary ?? 0} / ${secondary ?? 0}`;
}

function NetworkMapView({ view, telemetry, serviceStatus, onCommand, onInputFocusChange, onExit, windowControl }) {
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
    const activeTelemetry = modeMaps?.[activeModeId] ?? telemetry;
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
    const fittedRef = React.useRef(Boolean(savedInteraction?.transform));
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
        if ((!cloudVisibilityChanged && fittedRef.current) || !viewportRef.current || nodes.length === 0) return;
        const bounds = viewportRef.current.getBoundingClientRect();
        lastViewportBoundsRef.current = { width: bounds.width, height: bounds.height };
        setTransform(fitNetworkLayout(layout, getUsableViewportWidth(bounds), bounds.height, layoutConfig));
        fittedRef.current = true;
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
            fittedRef.current = true;
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [view?.id, activeModeId, showCloud, layout.width, layout.height, nodes.length, Boolean(selectedNode)]);

    React.useEffect(() => {
        saveDashboardViewInteractionState(view?.id ?? "", {
            transform,
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
        fittedRef.current = true;
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

    const sendCommand = (prefix, target = "") => {
        const serviceId = String(actionConfig.serviceId ?? dataConfig.serviceId ?? "");
        const command = target ? `${prefix}${encodeURIComponent(target)}` : String(prefix ?? "");
        if (!serviceId || !command) return;
        onCommand(serviceId, command);
    };

    const copyNodeActionValue = (value, label) => {
        const text = String(value ?? "");
        if (!text) return;
        try {
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
            sendCommand(actionConfig.hopPrefix, nodeId);
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
        fittedRef.current = false;
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
        event.preventDefault();
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
            style={{ ...WIDGET_STYLES.networkView, cursor: isPanning ? "grabbing" : "grab" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointerPan}
            onPointerCancel={endPointerPan}
            onWheel={handleWheel}
        >
            <div style={WIDGET_STYLES.networkHeader}>
                <div>
                    <div style={WIDGET_STYLES.homeTitle}>{activeTitle}</div>
                    <div style={{ ...WIDGET_STYLES.muted, marginTop: "2px", fontSize: "9px" }}>
                        {activeSubtitle}
                        {updatedAt > 0 ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}` : ""}
                    </div>
                    <div style={{ marginTop: "7px" }}>
                        <PluginRuntimeWarning statuses={serviceStatus ? [serviceStatus] : []} />
                    </div>
                </div>
            </div>

            <div style={getDashboardFrameControlOverlayStyle()} data-network-control="true">
                {windowControl}
                <button
                    type="button"
                    data-network-control="true"
                    title="Return to the dashboard"
                    style={getDashboardFrameControlStyle("neutral", { position: "static" })}
                    onClick={onExit}
                >
                    {view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}
                </button>
            </div>

            <div
                style={{
                    ...WIDGET_STYLES.networkWorld,
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
                                ...WIDGET_STYLES.networkNode,
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
                                                ? WIDGET_STYLES.networkNode.background
                                                : "linear-gradient(145deg, rgba(8, 18, 20, 0.96), rgba(5, 10, 13, 0.96))",
                            }}
                            onClick={() => handleNodeClick(nodeId)}
                            onDoubleClick={() => selectable && centerNode(nodeId, true)}
                        >
                            <div style={{ ...WIDGET_STYLES.networkNodeLabel, color: nodeAccent }}>
                                {getDashboardViewValue(node, fields.label) ?? nodeId}
                            </div>
                            <div style={WIDGET_STYLES.networkNodeSubline}>
                                {getDashboardViewValue(node, fields.detail) || getDashboardViewValue(node, fields.subtitle) || "\u00a0"}
                            </div>
                            <div style={WIDGET_STYLES.networkNodeStatus}>
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

            {modeMenuOpen && modeOptions.length > 0 ? (
                <div data-network-control="true" style={WIDGET_STYLES.networkModePopup}>
                    <div style={WIDGET_STYLES.homePanelTitle}>{modeSelector.popupTitle ?? "Map view"}</div>
                    <div style={WIDGET_STYLES.networkFilterList}>
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
                                        ...WIDGET_STYLES.networkModeOption,
                                        ...(active ? {
                                            color: "#8fc5ff",
                                            borderColor: "rgba(108, 180, 255, 0.55)",
                                            background: "rgba(10, 24, 38, 0.95)",
                                        } : {}),
                                    }}
                                    onClick={() => selectMode(optionId)}
                                >
                                    <span>{optionCurrent ? "● " : ""}{optionLabel}</span>
                                    <span style={{ ...WIDGET_STYLES.smallMuted, color: optionCurrent ? "#8ef0b5" : undefined }}>{optionNote}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {showNodeFilters && filtersOpen && filterDefinitions.length > 0 ? (
                <div data-network-control="true" style={WIDGET_STYLES.networkFilterPopup}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={WIDGET_STYLES.homePanelTitle}>Node filters</span>
                        {selectedFilterIds.length > 0 ? (
                            <button
                                type="button"
                                style={{ ...WIDGET_STYLES.actionButton, padding: "3px 6px", fontSize: "9px" }}
                                onClick={() => setSelectedFilterIds([])}
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                    <div style={WIDGET_STYLES.networkFilterList}>
                        {filterDefinitions.map((filter) => {
                            const checked = selectedFilterIdSet.has(filter.id);
                            return (
                                <label
                                    key={filter.id}
                                    style={{
                                        ...WIDGET_STYLES.networkFilterOption,
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

            <div data-network-control="true" style={WIDGET_STYLES.networkToolbar}>
                {modeOptions.length > 0 ? (
                    <button
                        type="button"
                        title={`Choose map view · ${activeModeLabel}`}
                        aria-label="Choose map view"
                        aria-expanded={modeMenuOpen}
                        style={{
                            ...WIDGET_STYLES.actionButton,
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
                            ...WIDGET_STYLES.actionButton,
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
                    style={{ ...WIDGET_STYLES.input, width: "128px", padding: "5px 7px", userSelect: "text", WebkitUserSelect: "text" }}
                    onChange={(event) => setSearchText(event.target.value)}
                    onFocus={() => onInputFocusChange?.(true)}
                    onBlur={() => onInputFocusChange?.(false)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") findNode();
                    }}
                />
                <button type="button" style={WIDGET_STYLES.actionButton} onClick={findNode}>Find</button>
                <button type="button" title="Zoom out" style={WIDGET_STYLES.actionButton} onClick={() => zoomBy(0.82)}>−</button>
                <button type="button" title="Fit current map" style={WIDGET_STYLES.actionButton} onClick={fitView}>Fit</button>
                <button type="button" title="Zoom in" style={WIDGET_STYLES.actionButton} onClick={() => zoomBy(1.22)}>+</button>
                {actionConfig.refreshCommand ? (
                    <button type="button" title="Refresh map telemetry" style={WIDGET_STYLES.actionButton} onClick={() => sendCommand(actionConfig.refreshCommand)}>Refresh</button>
                ) : null}
                {showCloudControl && fields.cloud ? (
                    <button
                        type="button"
                        title={`${showCloud ? "Hide" : "Show"} ${filterConfig.cloudLabel ?? "filtered servers"}`}
                        style={{
                            ...WIDGET_STYLES.actionButton,
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
                <span style={{ ...WIDGET_STYLES.smallMuted, padding: "0 4px" }}>{Math.round(transform.scale * 100)}%</span>
            </div>

            <aside
                ref={detailsRef}
                data-network-control="true"
                style={{ ...WIDGET_STYLES.networkDetails, width: `${inspectorWidth}px`, display: selectedNode ? "block" : "none" }}
                onPointerDown={(event) => event.stopPropagation()}
                onScroll={(event) => setDetailsScrollTop(Math.max(0, event.currentTarget.scrollTop))}
            >
                {selectedNode ? (
                    <>
                        <div style={{ ...WIDGET_STYLES.homePanelTitle, color: "#8fc5ff" }}>{selectionLabel}</div>
                        <div style={{ ...WIDGET_STYLES.homeTitle, marginTop: "5px", fontSize: "15px", textTransform: "none" }}>
                            {getDashboardViewValue(selectedNode, fields.label) ?? selectedId}
                        </div>
                        <div style={{ ...WIDGET_STYLES.muted, fontSize: "9px", marginTop: "2px" }}>
                            {[getDashboardViewValue(selectedNode, fields.subtitle), getDashboardViewValue(selectedNode, fields.detail)].filter(Boolean).join(" · ") || "No additional identity data"}
                        </div>

                        <div style={{ ...WIDGET_STYLES.networkDetailGrid, gridTemplateColumns: `${inspectorLabelWidth}px minmax(0, 1fr)` }}>
                            {stateDefinitions.map((state) => {
                                const active = Boolean(getDashboardViewValue(selectedNode, state.key));
                                const palette = getHomeTonePalette(active ? state.trueTone : state.falseTone);
                                return (
                                    <React.Fragment key={state.key}>
                                        <span title={state.label} style={{ ...WIDGET_STYLES.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.label}</span>
                                        <span style={{ color: palette.accent, minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{active ? state.trueText : state.falseText}</span>
                                    </React.Fragment>
                                );
                            })}
                            {metricDefinitions.filter((metric) => {
                                return !metric.visibleKey || Boolean(getDashboardViewValue(selectedNode, metric.visibleKey));
                            }).map((metric) => (
                                <React.Fragment key={metric.key}>
                                    <span title={metric.label} style={{ ...WIDGET_STYLES.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{metric.label}</span>
                                    <span style={{ color: "#c8e0ff", minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>
                                        {formatNetworkMapMetric(
                                            getDashboardViewValue(selectedNode, metric.key),
                                            metric.secondaryKey ? getDashboardViewValue(selectedNode, metric.secondaryKey) : undefined,
                                            metric.format
                                        )}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>

                        {showRoutes ? (
                            <>
                                <div style={{ ...WIDGET_STYLES.homePanelTitle, marginTop: "12px" }}>Route from home</div>
                                <div style={WIDGET_STYLES.networkRoute}>
                                    {selectedRoute.length > 0 ? selectedRoute.map((hop) => (
                                        <span key={hop} style={{
                                            ...WIDGET_STYLES.networkRouteHop,
                                            ...(hop === currentId ? { color: "#8fc5ff", borderColor: "rgba(108, 180, 255, 0.55)" } : {}),
                                        }}>{hop}</span>
                                    )) : <span style={WIDGET_STYLES.muted}>No route available.</span>}
                                </div>

                                <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
                                    <button
                                        type="button"
                                        disabled={!canConnect || !Boolean(getDashboardViewValue(selectedNode, fields.direct))}
                                        style={{
                                            ...WIDGET_STYLES.actionButton,
                                            textAlign: "center",
                                            ...(!canConnect || !Boolean(getDashboardViewValue(selectedNode, fields.direct)) ? WIDGET_STYLES.actionButtonDisabled : {}),
                                        }}
                                        onClick={() => sendCommand(actionConfig.directPrefix, selectedId)}
                                    >
                                        {actionConfig.directLabel ?? "Direct connect"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canConnect || selectedRoute.length === 0}
                                        style={{
                                            ...WIDGET_STYLES.actionButton,
                                            textAlign: "center",
                                            ...(!canConnect || selectedRoute.length === 0 ? WIDGET_STYLES.actionButtonDisabled : {}),
                                        }}
                                        onClick={() => sendCommand(actionConfig.routePrefix, selectedId)}
                                    >
                                        {actionConfig.routeLabel ?? "Auto route"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canConnect || selectedRoute.length === 0}
                                        style={{
                                            ...WIDGET_STYLES.actionButton,
                                            textAlign: "center",
                                            ...(stepTargetId === selectedId ? {
                                                color: "#ffd17a",
                                                borderColor: "rgba(255, 198, 92, 0.55)",
                                                background: "rgba(34, 22, 10, 0.95)",
                                            } : {}),
                                            ...(!canConnect || selectedRoute.length === 0 ? WIDGET_STYLES.actionButtonDisabled : {}),
                                        }}
                                        onClick={() => setStepTargetId((current) => current === selectedId ? "" : selectedId)}
                                    >
                                        {stepTargetId === selectedId ? "Cancel step route" : actionConfig.stepLabel ?? "Step route"}
                                    </button>
                                </div>

                                {stepTargetId === selectedId ? (
                                    <div style={{ ...WIDGET_STYLES.networkRouteHop, marginTop: "8px", color: nextStepId ? "#ffd17a" : "#8ef0b5" }}>
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
                                                ...WIDGET_STYLES.actionButton,
                                                textAlign: "center",
                                                ...(!enabled ? WIDGET_STYLES.actionButtonDisabled : {}),
                                            }}
                                            onClick={() => actionType === "clipboard"
                                                ? copyNodeActionValue(target, label)
                                                : sendCommand(action.prefix, target)}
                                        >
                                            {displayLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        {clipboardNotice ? (
                            <div style={{ ...WIDGET_STYLES.networkRouteHop, marginTop: "8px", color: "#8ef0b5", borderColor: "rgba(110, 231, 168, 0.3)" }}>
                                {clipboardNotice}
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div style={WIDGET_STYLES.muted}>{telemetry ? `Select a ${selectionSubject} to inspect it.` : "Waiting for map telemetry…"}</div>
                )}

                {showRoutes && !canConnect ? (
                    <div style={{ ...WIDGET_STYLES.networkRouteHop, marginTop: "10px", color: "#ffd17a", borderColor: "rgba(255, 198, 92, 0.35)" }}>
                        {actionConfig.unavailableMessage ?? "Automatic connections are unavailable. The map and routes remain available."}
                    </div>
                ) : null}
                {lastResultMessage ? (
                    <div style={{
                        ...WIDGET_STYLES.networkRouteHop,
                        marginTop: "8px",
                        color: lastResultStatus === "error" ? "#ff9a9a" : "#8ef0b5",
                        borderColor: lastResultStatus === "error" ? "rgba(255, 122, 122, 0.35)" : "rgba(110, 231, 168, 0.3)",
                    }}>
                        {lastResultMessage}{lastResultTime > 0 ? ` · ${new Date(lastResultTime).toLocaleTimeString()}` : ""}
                    </div>
                ) : null}
            </aside>
        </main>
    );
}

function Card({ title, accent, subtitle, children }) {
    return (
        <section data-dashboard-theme-role="card-frame" style={WIDGET_STYLES.card}>
            <div style={WIDGET_STYLES.cardHeader}>
                <div>
                    <div data-dashboard-theme-role="data-heading" style={WIDGET_STYLES.cardTitle}>{title}</div>
                    {subtitle ? <div style={{ ...WIDGET_STYLES.muted, marginTop: "4px" }}>{subtitle}</div> : null}
                </div>
                <div style={{ ...WIDGET_STYLES.cardAccent, background: accent }} />
            </div>
            <div style={WIDGET_STYLES.cardBody}>{children}</div>
        </section>
    );
}

function BadgeLine({ label, value, tone = "neutral" }) {
    return (
        <div data-dashboard-theme-role="data-row" style={{ ...WIDGET_STYLES.item, borderColor: tone === "success" ? "rgba(110, 231, 168, 0.25)" : tone === "warn" ? "rgba(255, 198, 92, 0.25)" : tone === "danger" ? "rgba(255, 122, 122, 0.25)" : "rgba(125, 160, 212, 0.12)" }}>
            <div data-dashboard-theme-role="data-heading" style={WIDGET_STYLES.itemTitle}>{label}</div>
            <div data-dashboard-theme-role="data-value" style={WIDGET_STYLES.itemDetail}>{value}</div>
        </div>
    );
}

function formatDashboardHudValue(value, format) {
    if (format === "compactMoney") return formatCompactDashboardValue(Number(value) || 0, "money");
    if (format === "compactNumber") return formatCompactDashboardValue(Number(value) || 0);
    if (format === "money") return formatMoney(Number(value) || 0);
    if (format === "number") return (Number(value) || 0).toLocaleString();
    if (format === "time") return Number(value) > 0 ? new Date(Number(value)).toLocaleTimeString() : "n/a";
    return String(value ?? "n/a");
}

const DASHBOARD_HUD_THEME_COLORS = {
    hp: "#ff7a7a",
    money: "#ffd17a",
    hack: "#8ef0b5",
    combat: "#e4f8e9",
    cha: "#c084fc",
    int: "#8fc5ff",
    rep: "#e4f8e9",
    primary: "#8ef0b5",
    secondary: "#9ab0a0",
    maplocation: "#e4f8e9",
};

function getDashboardHudThemeColor(theme, themeColor, fallback) {
    const key = String(themeColor ?? "").trim().toLowerCase();
    if (!key) return fallback;
    if (theme?.followGame && typeof theme?.gameTheme?.[key] === "string") return theme.gameTheme[key];
    return DASHBOARD_HUD_THEME_COLORS[key] ?? fallback;
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

function PlayerStatsOverview({ definitions, dashboardTheme, groupIds, orientation = "horizontal" }) {
    const selectedGroupIds = Array.isArray(groupIds) && groupIds.length > 0
        ? new Set(groupIds.filter((value) => typeof value === "string"))
        : null;
    const groups = (Array.isArray(definitions) ? definitions : [])
        .flatMap((definition) => definition.groups ?? [])
        .filter((group) => !selectedGroupIds || selectedGroupIds.has(group.sourceId));
    const vertical = String(orientation).trim().toLowerCase() === "vertical";

    return (
        <div style={{
            ...WIDGET_STYLES.homePlayerGroupGrid,
            ...(vertical ? { gridTemplateColumns: "1fr", gap: "8px" } : {}),
        }}>
            {groups.map((group) => (
                <section key={group.id} style={WIDGET_STYLES.homePlayerGroup}>
                    <div data-dashboard-theme-role="data-heading" style={{ ...WIDGET_STYLES.heading, marginBottom: "3px" }}>{group.title}</div>
                    <div style={{
                        ...WIDGET_STYLES.homePlayerStatGrid,
                        ...(vertical ? { gridTemplateColumns: "1fr", gap: "1px" } : {}),
                    }}>
                        {group.items.map((item) => {
                            const palette = getHomeTonePalette(item.tone);
                            const itemColor = getDashboardHudThemeColor(dashboardTheme, item.themeColor, palette.accent);
                            const itemThemeRole = item.themeColor ? `player-stat-${item.themeColor}` : "";
                            const hasProgress = Number.isFinite(item.progress);
                            const progress = hasProgress ? Math.max(0, Math.min(1, Number(item.progress))) : 0;
                            return (
                                <div key={item.id} title={`${item.label}: ${item.value}`} style={WIDGET_STYLES.homePlayerStat}>
                                    <div style={WIDGET_STYLES.homePlayerStatLine}>
                                        <div data-dashboard-theme-role={itemThemeRole} style={{ ...WIDGET_STYLES.pillLabel, marginBottom: 0, color: itemColor }}>{item.label}</div>
                                        <div
                                            data-dashboard-theme-role={itemThemeRole}
                                            style={{ color: itemColor, minWidth: 0, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
                                        >
                                            {item.value}
                                        </div>
                                    </div>
                                    {hasProgress ? (
                                        <div style={{ height: "3px", marginTop: "3px", overflow: "hidden", background: "rgba(125, 160, 212, 0.16)" }}>
                                            <div data-dashboard-theme-role={itemThemeRole} style={{ width: `${progress * 100}%`, height: "100%", background: itemColor }} />
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}

function DashboardWindowModeButton({ layoutSnapshot }) {
    const maximized = Boolean(layoutSnapshot?.maximized);
    const nextMode = maximized ? DASHBOARD_WINDOW_MODE_WINDOWED : DASHBOARD_WINDOW_MODE_MAXIMIZED;
    return (
        <button
            type="button"
            data-network-control="true"
            title={maximized ? "Restore the dashboard to its saved window size" : "Maximize the dashboard inside the Bitburner window"}
            style={getDashboardFrameControlStyle("neutral")}
            onClick={(event) => {
                event.stopPropagation();
                enqueueDashboardAction({ kind: "window-mode", mode: nextMode });
            }}
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
    const responsiveLayout = getDashboardResponsiveLayout(dashboardLayout);
    const normalContentBounds = dashboardLayout.layoutTier === "wide"
        ? { width: "100%", maxWidth: "2800px", alignSelf: "center" }
        : {};
    const windowControl = <DashboardWindowModeButton layoutSnapshot={dashboardLayout} />;
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
    const systemOverviewRef = React.useRef(null);
    const dashboardViews = getDashboardViewRegistry().views;
    const serviceMenuGroups = getMenuGroups();
    const menuGroups = serviceMenuGroups.map((group) => ({
        ...group,
        items: [
            ...dashboardViews
                .filter((view) => view.menuGroup === group.id)
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
        () => buildScriptBuckets(homeScripts, options.ignoredScriptFolders, options.ignoredScriptFiles),
        [homeScripts, options.ignoredScriptFolders, options.ignoredScriptFiles]
    );
    const nonPluginScripts = scriptBuckets.nonPluginScripts;
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

    const selectedItem = uiState.selectedItem;
    const activeView = getDashboardViewRegistry().byId.get(uiState.activeViewId) ?? null;
    const playerHudMode = normalizeDashboardPlayerHudMode(options.dashboardPlayerHudMode);
    const dashboardServiceRegistry = getDashboardServiceRegistry();
    const playerHudDefinitions = buildDashboardHudDefinition(dashboardServiceRegistry.services, telemetryByServiceId);
    const playerStatsEnabled = playerHudMode !== DASHBOARD_PLAYER_HUD_MODE_HIDDEN;
    const pluginDashboardOptionInputs = buildPluginDashboardOptionInputs(dashboardServiceRegistry.services, options);
    const workspaceColumns = responsiveLayout.workspaceColumns;
    const setActiveView = (viewId) => {
        setUiState((current) => ({ ...current, activeViewId: String(viewId ?? "") }));
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
        setUiState((current) => ({ ...current, activeViewId: "", selectedItem: itemId }));
    };

    const centerPanelSource = selectedItem === "global.options"
        ? nonPluginScripts
        : selectedItem === "global.plugins"
            ? [...pluginScripts, ...dashboardCoreScripts]
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
    };

    const getPanelMeta = (panelId, fallbackMeta) => getServicePanelMeta(selectedService, panelId, fallbackMeta);
    const getStateLines = (overrides = {}) => getServiceState(selectedService, { ...serviceContext, ...overrides });
    const getSections = (overrides = {}) => getServiceSections(selectedService, { ...serviceContext, ...overrides });
    const getInputs = (overrides = {}) => getServiceInputs(selectedService, { ...serviceContext, ...overrides });
    const serviceActions = getServiceActions(selectedService, serviceContext);
    const pluginScript = selectedService?.pluginFile
        ? homeScripts.find((script) => script?.filename === selectedService.pluginFile)
        : null;
    const standardScriptActions = pluginScript
        ? buildScriptActions(pluginScript, { includeDisabledStates: true })
        : [];
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
        if (selectedItem === "global.options" || selectedItem === "global.plugins") {
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
            optionsDirtyRef.current = false;
            enqueueDashboardAction({
                kind: "save-options",
                options: optionOverrides ? { ...options, ...optionOverrides } : { ...options },
            });
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
        <Card title={meta.title} accent={meta.accent} subtitle={meta.subtitle}>
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
                        return <DataGraph key={`graph-${section.title ?? index}`} section={section} index={index} />;
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

    const renderSubWidgets = () => {
        const serviceSupervisorRunning = homeScripts.some((script) => {
            return script?.filename === SERVICE_SUPERVISOR_SCRIPT && script?.running;
        });
        const userInitAvailable = homeScripts.some((script) => {
            return script?.filename === USER_INIT_SCRIPT;
        });
        const userInitRunning = homeScripts.some((script) => {
            return script?.filename === USER_INIT_SCRIPT && script?.running;
        });
        const runningHomeFilenames = Array.isArray(runningProcessSnapshot?.homeFilenames)
            ? runningProcessSnapshot.homeFilenames
            : [];
        const runningRemoteFilenames = Array.isArray(runningProcessSnapshot?.remoteFilenames)
            ? runningProcessSnapshot.remoteFilenames
            : [];
        const ignoredFolders = parseScriptFolders(persistedOptions.ignoredScriptFolders);
        const ignoredFiles = parseScriptFiles(persistedOptions.ignoredScriptFiles);
        const isScriptListTarget = (filename) => {
            return !isDashboardPluginScript(filename)
                && !isDashboardSupportScript(filename, ignoredFolders, ignoredFiles);
        };
        const hasLocalScriptTargets = runningHomeFilenames.some(isScriptListTarget);
        const hasRemoteScriptTargets = runningRemoteFilenames.some(isScriptListTarget);
        const hasLocalPluginTargets = serviceSupervisorRunning
            || runningHomeFilenames.some((filename) => isDashboardPluginScript(filename));
        const hasRemotePluginTargets = runningRemoteFilenames.some((filename) => isDashboardPluginScript(filename));
        const scriptListDisabledActionIds = [
            ...(!hasLocalScriptTargets ? [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_HOME_SCRIPTS] : []),
            ...(!hasRemoteScriptTargets ? [DASHBOARD_ACTION_IDS.KILL_SCRIPT_LIST_REMOTE_SCRIPTS] : []),
            ...(!userInitAvailable || userInitRunning ? [DASHBOARD_ACTION_IDS.START_SERVICES] : []),
        ];
        const pluginListDisabledActionIds = [
            ...(!hasLocalPluginTargets ? [DASHBOARD_ACTION_IDS.KILL_PLUGIN_LIST_HOME_SCRIPTS] : []),
            ...(!hasRemotePluginTargets ? [DASHBOARD_ACTION_IDS.KILL_PLUGIN_LIST_REMOTE_SCRIPTS] : []),
            ...(serviceSupervisorRunning ? [DASHBOARD_ACTION_IDS.START_INTEGRATIONS] : []),
        ];
        const scriptListTopActions = selectedItem === "global.options"
            ? buildDashboardActions(DASHBOARD_ACTION_GROUPS.SCRIPT_LIST_CONTROLS, {
                disabledActionIds: scriptListDisabledActionIds,
            })
            : [];
        const pluginListTopActions = selectedItem === "global.plugins"
            ? buildDashboardActions(DASHBOARD_ACTION_GROUPS.PLUGIN_LIST_CONTROLS, {
                disabledActionIds: pluginListDisabledActionIds,
            })
            : [];

        const renderScriptButtons = (panels, renderOptions = {}) => {
            const selectable = renderOptions.selectable !== false;
            return (
                <div style={WIDGET_STYLES.actionGrid}>
                    {panels.map((panel) => {
                        const isSelected = selectedCenterPanel === panel.id;
                        const pinnedExpandKey = `${selectedItem}:pinned-script-controls:${panel.id}`;
                        const isPinnedExpanded = uiState.expandedGroups?.[pinnedExpandKey] ?? false;
                        const isExpanded = selectable ? isSelected : isPinnedExpanded;
                        const standardInlineActions = buildScriptActions(
                            { id: panel.id, filename: panel.id, running: panel.running },
                            { includeDisabledStates: true }
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
                                    onClick={() => {
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
                                    }}
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
                    <Card title="Script Controls" accent="#6cb4ff" subtitle="Unmanaged script actions">
                        {renderServiceActions(scriptListTopActions)}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Scripts" accent="#6cb4ff" subtitle="Script Controls">
                        <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                        {runningPanels.length > 0 ? renderGroupedScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running scripts.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                        {stoppedPanels.length > 0 ? renderGroupedScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped scripts.</div>}
                    </Card>
                </>
            );
        }

        if (selectedItem === "global.plugins") {
            const pluginPanelIds = new Set(pluginScripts.map((script) => script.id));
            const pluginPanels = centerPanels.filter((panel) => pluginPanelIds.has(panel.id));
            const { runningPanels, stoppedPanels } = splitScriptPanels(pluginPanels);
            const dashboardCorePanels = dashboardCoreScripts.map((script) => ({
                id: script.id,
                label: script.label,
                running: script.running,
                daemon: script.daemon,
            }));
            const { runningPanels: runningCorePanels, stoppedPanels: stoppedCorePanels } = splitScriptPanels(dashboardCorePanels);

            return (
                <>
                    <Card title="Plugin Controls" accent="#6cb4ff" subtitle="Managed script actions">
                        {renderServiceActions(pluginListTopActions)}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Plugins" accent="#6cb4ff" subtitle="Integration Controls">
                        <div style={WIDGET_STYLES.heading}>Running ({runningPanels.length})</div>
                        {runningPanels.length > 0 ? renderScriptButtons(runningPanels) : <div style={WIDGET_STYLES.muted}>No running plugins.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedPanels.length})</div>
                        {stoppedPanels.length > 0 ? renderScriptButtons(stoppedPanels) : <div style={WIDGET_STYLES.muted}>No stopped plugins.</div>}
                    </Card>
                    <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                    <Card title="Dashboard Core" accent="#6ee7a8" subtitle="Dashboard core scripts">
                        <div style={WIDGET_STYLES.heading}>Running ({runningCorePanels.length})</div>
                        {runningCorePanels.length > 0 ? renderScriptButtons(runningCorePanels) : <div style={WIDGET_STYLES.muted}>No running dashboard core scripts.</div>}
                        <div style={{ ...WIDGET_STYLES.sectionGap, height: "8px" }} />
                        <div style={WIDGET_STYLES.heading}>Stopped ({stoppedCorePanels.length})</div>
                        {stoppedCorePanels.length > 0 ? renderScriptButtons(stoppedCorePanels) : <div style={WIDGET_STYLES.muted}>No stopped dashboard core scripts.</div>}
                    </Card>
                </>
            );
        }

        return (
            <Card title="Sub-Widgets" accent="#6cb4ff" subtitle="Choose a sub-category">
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
                                        ...((selectedItem === "global.options" || selectedItem === "global.plugins") ? {
                                            borderColor: panel.running ? "rgba(110, 231, 168, 0.45)" : "rgba(255, 122, 122, 0.45)",
                                            color: panel.running ? "#baf6d2" : "#ffb0b0",
                                            background: panel.running ? "rgba(10, 26, 10, 0.95)" : "rgba(26, 10, 10, 0.95)",
                                        } : {}),
                                        ...((selectedItem === "global.options" || selectedItem === "global.plugins") ? {} : getHealthStyle(panelLevel)),
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
                                    {(selectedItem === "global.options" || selectedItem === "global.plugins") ? null : renderHealthBadge(panelLevel)}
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
            <Card title={meta.title} accent={meta.accent} subtitle={meta.subtitle}>
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

    const renderGlobalOptions = () => {
        const isPluginList = selectedItem === "global.plugins";
        const sourceScripts = isPluginList ? [...pluginScripts, ...dashboardCoreScripts] : nonPluginScripts;
        const selectedScript = resolveSelectedScriptPanel(selectedCenterPanel, sourceScripts);
        const selectedDashboardCore = isPluginList && isDashboardCoreScript(selectedScript?.filename);
        const selectedSupervisor = selectedScript?.filename === SERVICE_SUPERVISOR_SCRIPT;
        const selectedScriptContext = { ...serviceContext, selectedScript };
        const selectedScriptLines = getStateLines({ selectedScript });
        const listMeta = getPanelMeta("default", {
            title: isPluginList ? "Plugin List" : "Script List",
            accent: isPluginList ? "#6cb4ff" : "#ff7bd0",
            subtitle: isPluginList ? "Dashboard plugin scripts" : "Home directory scripts"
        });
        const scriptMeta = getPanelMeta("script", {
            title: isPluginList ? "Plugin" : "Script",
            accent: isPluginList ? "#6cb4ff" : "#ff7bd0",
            subtitle: isPluginList ? "Plugin status and controls" : "Script status and controls"
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
                emptyMessage: isPluginList
                    ? (sourceScripts.length > 0
                        ? "Select a plugin or Dashboard Core script to view its status."
                        : "No plugin integrations or Dashboard Core scripts were found.")
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
                accent: selectedDashboardCore ? "#6ee7a8" : scriptMeta.accent,
                subtitle: selectedSupervisor
                    ? "Managed service status and controls"
                    : selectedDashboardCore ? "Dashboard core status and controls" : scriptMeta.subtitle,
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
        if (selectedItem === "global.options" || selectedItem === "global.plugins") {
            return renderGlobalOptions();
        }

        if (selectedService) {
            return renderStandardServicePanel();
        }

        return (
            <Card title="Dashboard" accent="#6ee7a8" subtitle="Service overview">
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
                        ? <PlayerStatsOverview definitions={definitions} dashboardTheme={dashboardTheme} groupIds={widget.groupIds} orientation={widget.orientation ?? "vertical"} />
                        : <div style={WIDGET_STYLES.muted}>{emptyText}</div>}
                </HomePanel>
            </div>
        );
    };

    return (
        <div data-dashboard-theme-role="app-frame" style={{
            ...WIDGET_STYLES.shell,
            fontFamily: dashboardTheme.typography.fontFamily,
            lineHeight: dashboardTheme.typography.lineHeight,
            height: `${dashboardLayout.contentHeight}px`,
            minHeight: `${dashboardLayout.contentHeight}px`,
            maxHeight: `${dashboardLayout.contentHeight}px`,
        }}>
            {activeView?.renderer === "system-overview" ? (
                <SystemOverview
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
                    windowControl={windowControl}
                    killAllControl={(
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
                            onClick={() => {
                                if (globalKillAction.disabled) return;
                                killAllSnapshotRef.current = runningProcessSnapshot;
                                setKillAllPending(true);
                                runServiceAction(globalKillAction);
                            }}
                            onMouseDown={() => {
                                if (globalKillAction.disabled) return;
                                setPressedActionButtonId(globalKillAction.id);
                            }}
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
                    windowControl={windowControl}
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
                        onClick={() => {
                            if (globalKillAction.disabled) return;
                            killAllSnapshotRef.current = runningProcessSnapshot;
                            setKillAllPending(true);
                            runServiceAction(globalKillAction);
                        }}
                        onMouseDown={() => {
                            if (globalKillAction.disabled) return;
                            setPressedActionButtonId(globalKillAction.id);
                        }}
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
                        <Card title="Health Filter" accent="#ffc66c" subtitle="Services Filter">
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
                                            return (
                                            <button
                                                type="button"
                                                data-dashboard-theme-role="navigation-item"
                                                key={item.id}
                                                title={getServiceItemTooltip(item.id)}
                                                style={{
                                                    ...WIDGET_STYLES.menuItemButton,
                                                    ...getHealthStyle(itemLevel),
                                                    ...(itemSelected ? getActiveHealthStyle(itemLevel) : {})
                                                }}
                                                onClick={() => selectItem(item.id)}
                                            >
                                                {item.label}
                                                {renderHealthBadge(itemLevel)}
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

                <div
                    ref={rightColumnRef}
                    data-dashboard-theme-role="workspace-column"
                    style={{
                        ...WIDGET_STYLES.column,
                        ...(visibleWorkspaceWidgets.length > 0 ? {
                            display: "grid",
                            gridTemplateColumns: `minmax(0, 1fr) ${PLAYER_STATS_WIDGET_WIDTH}px`,
                            gap: "10px",
                            alignItems: "start",
                        } : {}),
                    }}
                    onScroll={(e) => rememberScroll("right", e.currentTarget.scrollTop)}
                >
                    <div style={{ minWidth: 0 }}>{renderDataPanel()}</div>
                    {visibleWorkspaceWidgets.map(renderWorkspaceWidget)}
                </div>
                </div>
            </>
            )}
        </div>
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
                let remainingSleepMs = layoutSnapshot.minimized ? 5000 : DASHBOARD_UI_TICK_MS;
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

        let remainingSleepMs = layoutSnapshot.minimized ? 5000 : DASHBOARD_UI_TICK_MS;
        while (remainingSleepMs > 0) {
            const stepMs = Math.min(DASHBOARD_ACTION_POLL_MS, remainingSleepMs);
            await ns.sleep(stepMs);
            remainingSleepMs -= stepMs;
            applyQueuedDashboardActions(ns);
        }
    }
}
