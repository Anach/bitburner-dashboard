import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import { RamGauge } from "dashboard/renderers/dashboard-metrics.jsx";
import { getTelemetryFreshnessTooltip } from "dashboard/libs/telemetry-freshness.js";
import {
    NATIVE_OVERVIEW_ACTIONS,
    readNativeOverviewActionState,
    runNativeOverviewAction,
} from "dashboard/libs/native-overview-actions.js";

let React = null;
let rawReact = null;
let getDashboardTheme = () => buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);
let getWidgetStyles = () => ({});
let formatResourceValue = () => "n/a";

export function configureSystemOverviewPanels({ getTheme, getStyles, formatResource } = {}) {
    if (typeof getTheme === "function") getDashboardTheme = getTheme;
    if (typeof getStyles === "function") getWidgetStyles = getStyles;
    if (typeof formatResource === "function") formatResourceValue = formatResource;
}

function getReact() {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, getDashboardTheme);
    }
    return React;
}

// muted matches TonePill/HomeMetricCard's own stale-state opacity (0.7) so an offline widget
// fades consistently everywhere, regardless of which of these three components is showing it.
export function HomePanel({ title, subtitle = "", headerActions = null, children, widgetStyles, muted = false }) {
    const react = getReact();
    const styles = widgetStyles ?? getWidgetStyles();
    if (!react) return null;
    return (
        <section data-dashboard-theme-role="card-frame" style={{ ...styles.homePanel, opacity: muted ? 0.7 : 1 }}>
            <div style={styles.homePanelHeader}>
                <div style={styles.homePanelTitle}>{title}</div>
                {headerActions
                    ? <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>{headerActions}</div>
                    : subtitle ? <div style={styles.homePanelSubtitle}>{subtitle}</div> : null}
            </div>
            {children}
        </section>
    );
}

function NativeOverviewActionIcon({ action, state, onClick }) {
    const available = state?.available === true;
    const color = available ? state?.color || action.fallbackColor : "#526474";
    const commonSvgProps = {
        viewBox: "0 0 18 18",
        width: "15",
        height: "15",
        focusable: "false",
        "aria-hidden": "true",
        style: { display: "block", pointerEvents: "none" },
    };
    return <button
        type="button"
        aria-label={action.ariaLabel}
        title={available ? action.title : `${action.title} unavailable`}
        disabled={!available}
        onClick={onClick}
        style={{
            width: "22px",
            minWidth: "22px",
            height: "22px",
            minHeight: "22px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px",
            color,
            border: "none",
            background: "transparent",
            boxShadow: "none",
            cursor: available ? "pointer" : "not-allowed",
            opacity: available ? 1 : 0.55,
        }}
    >
        {action.id === "save"
            ? <svg {...commonSvgProps}>
                <path fill="currentColor" d="M2 2h11l3 3v11H2V2Zm2 1.5V8h8V3.5H4Zm1.5 8V15h7v-3.5h-7ZM10 4.5h1v2h-1v-2Z" />
            </svg>
            : <svg {...commonSvgProps}>
                <circle cx="9" cy="9" r="1.8" fill="currentColor" />
                <path d="M5.9 5.9a4.4 4.4 0 0 0 0 6.2M12.1 5.9a4.4 4.4 0 0 1 0 6.2M3.5 3.5a7.8 7.8 0 0 0 0 11M14.5 3.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
            </svg>}
    </button>;
}

function WidgetHeaderContributionIcon({ action, onNavigate }) {
    const badgeValue = Number.isFinite(action?.badgeValue) ? action.badgeValue : null;
    const label = badgeValue == null
        ? action.label
        : `${action.label}: ${badgeValue} unread`;
    return <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => onNavigate?.(action.navigateToServiceId)}
        style={{
            minWidth: "22px",
            height: "22px",
            minHeight: "22px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            padding: "2px",
            color: "#ffd17a",
            border: "none",
            background: "transparent",
            boxShadow: "none",
            cursor: "pointer",
        }}
    >
        {action.icon === "mail" ? <svg
            viewBox="0 0 18 18"
            width="15"
            height="15"
            focusable="false"
            aria-hidden="true"
            style={{ display: "block", pointerEvents: "none" }}
        >
            <path d="M2.25 4h13.5v10H2.25V4Zm.9 1.1L9 9.35l5.85-4.25M3.15 12.9l4.1-3.7m7.6 3.7-4.1-3.7" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round" />
        </svg> : null}
        {badgeValue == null ? null : <span
            aria-hidden="true"
            style={{
                color: "currentColor",
                fontSize: "9px",
                fontWeight: 700,
                lineHeight: 1,
                pointerEvents: "none",
            }}
        >[{badgeValue}]</span>}
    </button>;
}

let nativeOverviewActionStateCache = Object.fromEntries(NATIVE_OVERVIEW_ACTIONS.map((action) => [
    action.id,
    { available: true, color: action.fallbackColor },
]));

export function PlayerStatusNativeOverviewControls({ contributedActions = [], onNavigate } = {}) {
    const react = getReact();
    if (!react) return null;
    const controlsRef = react.useRef(null);
    const [actionStates, setActionStates] = react.useState(() => nativeOverviewActionStateCache);
    const usePrePaintEffect = react.useLayoutEffect ?? react.useEffect;

    usePrePaintEffect(() => {
        const refresh = () => {
            const nextStates = Object.fromEntries(NATIVE_OVERVIEW_ACTIONS.map((action) => {
                const observedState = readNativeOverviewActionState(controlsRef.current, action);
                // The native Overview is normally always mounted. Retain the last confirmed state
                // across a transient query miss or dashboard-card remount instead of flashing the
                // disabled fallback icon during a telemetry refresh.
                return [action.id, observedState.available
                    ? observedState
                    : nativeOverviewActionStateCache[action.id]];
            }));
            nativeOverviewActionStateCache = nextStates;
            setActionStates((current) => NATIVE_OVERVIEW_ACTIONS.every((action) => {
                return current?.[action.id]?.available === nextStates[action.id].available
                    && current?.[action.id]?.color === nextStates[action.id].color;
            }) ? current : nextStates);
        };
        refresh();
        const interval = setInterval(refresh, 600);
        return () => clearInterval(interval);
    }, []);

    return <div ref={controlsRef} style={{ display: "flex", alignItems: "center", gap: "5px", transform: "translateY(2px)" }}>
        {NATIVE_OVERVIEW_ACTIONS.map((action) => <NativeOverviewActionIcon
            key={action.id}
            action={action}
            state={actionStates[action.id]}
            onClick={(event) => {
                // The native handlers perform the real save/connect/disconnect/settings behavior.
                // Neither handler applies the trusted-event restrictions used by Bitburner's minigames.
                runNativeOverviewAction(event.currentTarget, action);
            }}
        />)}
        {(Array.isArray(contributedActions) ? contributedActions : []).map((action) => <WidgetHeaderContributionIcon
            key={`${action.contributionServiceId}:${action.id}`}
            action={action}
            onNavigate={onNavigate}
        />)}
    </div>;
}

export function PluginRuntimeWarning({ statuses = [] }) {
    const react = getReact();
    if (!react) return null;
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

export function HomeMetricCard({ metric }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const state = metric?.state ?? "live";
    const muted = state !== "live";
    // A stale/missing stat is muted to the neutral palette rather than a new one - see the same
    // reasoning at TonePill's own freshness handling in dashboard-metrics.jsx.
    const palette = muted ? getHomeTonePalette("neutral") : getHomeTonePalette(metric?.tone);
    const subtext = metric?.sourceLabel || "";
    const freshnessTooltip = getTelemetryFreshnessTooltip(state, { sourceLabel: metric?.sourceLabel, ageText: metric?.ageText });
    const title = freshnessTooltip
        ? `${metric?.label ?? "Metric"}: ${metric?.value ?? "n/a"} (${freshnessTooltip})`
        : `${metric?.label ?? "Metric"}: ${metric?.value ?? "n/a"}`;
    return (
        <div title={title} style={{ ...styles.homeMetric, borderColor: palette.border, background: `linear-gradient(140deg, ${palette.glow}, rgba(5, 9, 8, 0.82) 58%)`, boxShadow: `inset 0 -2px 0 ${palette.accent}`, opacity: muted ? 0.68 : 1 }}>
            <div style={styles.homeMetricLabel}>{metric?.label ?? "Metric"}</div>
            <div data-dashboard-theme-role="stat-value" style={{ ...styles.homeMetricValue, color: palette.accent }}>{metric?.value ?? "n/a"}</div>
            {subtext ? <div style={styles.homeMetricSource}>{subtext}</div> : null}
        </div>
    );
}

export function HomeHealthRing({ counts }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
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
        <div style={styles.homeHealthLayout}>
            <div style={{ position: "relative", width: "108px", height: "108px" }}>
                <svg viewBox="0 0 108 108" width="108" height="108" aria-label={`${total} monitored services`}>
                    <circle cx="54" cy="54" r={radius} fill="rgba(4, 8, 7, 0.86)" stroke="rgba(125, 160, 212, 0.14)" strokeWidth="10" />
                    {ringSegments.filter((segment) => segment.length > 0).map((segment) => <circle key={segment.id} cx="54" cy="54" r={radius} fill="none" stroke={segment.color} strokeWidth="10" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 54 54)" />)}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ color: "#e7fff0", fontSize: "20px", fontWeight: 800 }}>{total}</div>
                    <div style={{ color: "#6c8b78", fontSize: "7px", letterSpacing: "0.12em" }}>SERVICES</div>
                </div>
            </div>
            <div style={styles.homeHealthLegend}>{segments.map((segment) => <div key={segment.id} style={styles.homeHealthLegendRow}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: segment.color }} />
                <span>{segment.label}</span><span style={{ color: segment.color, fontWeight: 800 }}>{segment.count}</span>
            </div>)}</div>
        </div>
    );
}

export function HomeGaugeCard({ gauge, size = 84 }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    const used = Math.max(0, Number(gauge?.used) || 0);
    const total = Math.max(0, Number(gauge?.total) || 0);
    const valueFormat = gauge?.valueFormat ?? "number";
    // homeGaugeCard is just flex centering now (the card frame - border/background/padding - was
    // removed). This minHeight reserves room for the value + source lines below the circle so
    // they don't get clipped or crowd the next row, scaling with size rather than a static constant.
    // marginTop on both lines below is a local override, half of homeGaugeValue's/homeMetricSource's
    // own default (4px) - tightened for this tighter, denser widget specifically, not globally.
    return <div style={{ ...styles.homeGaugeCard, minHeight: `${size + (gauge?.sourceLabel ? 40 : 28)}px` }}>
        <RamGauge {...gauge} size={size} />
        <div style={{ ...styles.homeGaugeValue, marginTop: "0px" }}>{gauge?.offline ? "Offline" : `${formatResourceValue(used, valueFormat)} / ${formatResourceValue(total, valueFormat)}`}</div>
        {gauge?.sourceLabel ? <div style={{ ...styles.homeMetricSource, marginTop: "0px" }}>{gauge.sourceLabel}</div> : null}
    </div>;
}

export function HomeServiceLandscape({ groups, healthById }) {
    const react = getReact();
    const styles = getWidgetStyles();
    if (!react) return null;
    return <div style={styles.homeServiceGrid}>{(Array.isArray(groups) ? groups : []).map((group) => {
        const counts = (group.services ?? []).reduce((result, service) => {
            const level = healthById?.[service.id]?.level ?? "neutral";
            if (level === "danger") result.danger += 1;
            else if (level === "warn") result.warn += 1;
            else result.healthy += 1;
            return result;
        }, { danger: 0, warn: 0, healthy: 0 });
        const total = group.services?.length ?? 0;
        const segments = [{ id: "danger", count: counts.danger, color: "#ff7a7a" }, { id: "warn", count: counts.warn, color: "#ffc65c" }, { id: "healthy", count: counts.healthy, color: "#6ee7a8" }];
        return <div key={group.id} style={styles.homeServiceRow}>
            <div style={styles.homeServiceLabel}><span>{group.title}</span><span>{total}</span></div>
            <div style={styles.homeServiceBar} title={`${group.title}: ${counts.healthy} healthy, ${counts.warn} warning, ${counts.danger} danger`}>
                {segments.filter((segment) => segment.count > 0).map((segment) => <span key={segment.id} style={{ width: `${total > 0 ? (segment.count / total) * 100 : 0}%`, background: segment.color, boxShadow: `0 0 8px ${segment.color}44` }} />)}
            </div>
        </div>;
    })}</div>;
}
