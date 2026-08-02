import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import {
    DASHBOARD_FRAME_CONTROL_LABELS,
    getDashboardFrameControlGroupStyle,
    getDashboardFrameControlStyle,
} from "dashboard/libs/frame-controls.js";

let React = null;
let rawReact = null;
let activeLogTheme = buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);

const COLORS = {
    background: "#020403",
    panel: "rgba(4, 8, 6, 0.98)",
    border: "rgba(108, 180, 255, 0.28)",
    text: "#b8cabb",
    bright: "#e4f8e9",
    green: "#8ef0b5",
    blue: "#8fc5ff",
    muted: "#789589",
    amber: "#ffd17a",
};

const STYLES = {
    shell: {
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        border: `1px solid ${COLORS.border}`,
        background: COLORS.background,
        color: COLORS.text,
    },
    header: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: "12px",
        padding: "8px 10px",
        borderBottom: `1px solid ${COLORS.border}`,
        flex: "0 0 auto",
    },
    title: {
        color: COLORS.green,
        fontSize: "14px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    },
    subtitle: {
        color: COLORS.muted,
        fontSize: "9px",
        marginTop: "2px",
    },
    closeButton: getDashboardFrameControlStyle("neutral"),
    body: {
        display: "grid",
        gridTemplateColumns: "minmax(260px, 330px) minmax(0, 1fr)",
        gap: "8px",
        minHeight: 0,
        flex: "1 1 auto",
        padding: "8px",
        boxSizing: "border-box",
    },
    sidebar: {
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        background: COLORS.panel,
    },
    toolbar: {
        display: "flex",
        gap: "5px",
        flexWrap: "wrap",
        padding: "7px",
        borderBottom: `1px solid ${COLORS.border}`,
    },
    search: {
        width: "100%",
        minHeight: "30px",
        boxSizing: "border-box",
        border: `1px solid ${COLORS.border}`,
        background: COLORS.background,
        color: COLORS.bright,
        padding: "5px 7px",
        fontFamily: "inherit",
        fontSize: "11px",
    },
    filterButton: {
        flex: "1 1 70px",
        minHeight: "30px",
        border: `1px solid ${COLORS.border}`,
        background: "rgba(8, 12, 10, 0.94)",
        color: COLORS.muted,
        padding: "5px 7px",
        fontFamily: "inherit",
        fontSize: "10px",
        cursor: "pointer",
        textTransform: "uppercase",
    },
    filterActive: {
        color: COLORS.green,
        borderColor: "rgba(110, 231, 168, 0.58)",
        boxShadow: "inset 3px 0 0 #6ee7a8",
    },
    scriptList: {
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
    },
    scriptButton: {
        display: "grid",
        gap: "2px",
        width: "100%",
        padding: "7px 8px",
        border: "none",
        borderBottom: "1px solid rgba(125, 160, 212, 0.12)",
        background: COLORS.background,
        color: COLORS.text,
        textAlign: "left",
        fontFamily: "inherit",
        cursor: "pointer",
    },
    scriptActive: {
        color: COLORS.bright,
        background: "rgba(12, 31, 22, 0.94)",
        boxShadow: "inset 3px 0 0 #6ee7a8",
    },
    scriptName: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: "11px",
    },
    scriptMeta: {
        color: COLORS.muted,
        fontSize: "9px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    logPanel: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        background: "#000000",
    },
    logHeader: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: "10px",
        padding: "7px 9px",
        borderBottom: `1px solid ${COLORS.border}`,
        flex: "0 0 auto",
    },
    logTitle: {
        color: COLORS.green,
        fontSize: "11px",
        fontWeight: 800,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    logControls: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    logViewport: {
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "auto",
        padding: "8px 10px",
        boxSizing: "border-box",
        color: COLORS.text,
        background: "#000000",
        userSelect: "text",
        WebkitUserSelect: "text",
    },
    logLine: {
        minHeight: "1.25em",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontSize: "11px",
    },
    empty: {
        color: COLORS.muted,
        padding: "12px",
    },
};

function entryMatches(entry, query, filter) {
    if (filter !== "all" && entry.status !== filter) return false;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    return `${entry.filename} ${entry.argsText} ${entry.pid}`.toLowerCase().includes(normalizedQuery);
}

export function ScriptLogView({
    view,
    snapshot,
    dashboardTheme,
    initialState = {},
    headerActions,
    onStateChange,
    onInputFocusChange,
    onExit,
}) {
    const nextRawReact = globalThis.React ?? globalThis.window?.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, () => activeLogTheme);
    }
    activeLogTheme = dashboardTheme ?? activeLogTheme;
    const savedState = /** @type {Record<string, any>} */ (
        initialState && typeof initialState === "object" ? initialState : {}
    );
    const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
    const [selectedId, setSelectedId] = React.useState(() => String(savedState.selectedId ?? ""));
    const [query, setQuery] = React.useState(() => String(savedState.query ?? ""));
    const [filter, setFilter] = React.useState(() => ["all", "running", "recent"].includes(savedState.filter) ? savedState.filter : "all");
    const [autoFollow, setAutoFollow] = React.useState(() => typeof savedState.autoFollow === "boolean"
        ? savedState.autoFollow
        : view?.layout?.autoFollowDefault !== false);
    const [scrollTop, setScrollTop] = React.useState(() => Math.max(0, Number(savedState.scrollTop) || 0));
    const [listScrollTop, setListScrollTop] = React.useState(() => Math.max(0, Number(savedState.listScrollTop) || 0));
    const logRef = React.useRef(null);
    const listRef = React.useRef(null);
    const visibleEntries = entries.filter((entry) => entryMatches(entry, query, filter));
    const selectedEntry = visibleEntries.find((entry) => entry.id === selectedId) ?? visibleEntries[0] ?? null;

    React.useEffect(() => {
        if (selectedEntry && selectedEntry.id !== selectedId) setSelectedId(selectedEntry.id);
    }, [selectedEntry?.id, selectedId]);

    React.useEffect(() => {
        onStateChange?.({ selectedId: selectedEntry?.id ?? "", query, filter, autoFollow, scrollTop, listScrollTop });
    }, [selectedEntry?.id, query, filter, autoFollow, scrollTop, listScrollTop]);

    React.useLayoutEffect(() => {
        const element = logRef.current;
        if (!element) return;
        if (autoFollow) element.scrollTop = element.scrollHeight;
        else if (Math.abs(element.scrollTop - scrollTop) > 1) element.scrollTop = scrollTop;
    }, [selectedEntry?.id, selectedEntry?.logs?.length, selectedEntry?.lastLine, autoFollow]);

    React.useLayoutEffect(() => {
        const element = listRef.current;
        if (element && Math.abs(element.scrollTop - listScrollTop) > 1) element.scrollTop = listScrollTop;
    }, [visibleEntries.length, query, filter, listScrollTop]);

    React.useEffect(() => () => onInputFocusChange?.(false), []);

    const handleLogScroll = (event) => {
        const element = event.currentTarget;
        const nextTop = Math.max(0, element.scrollTop);
        setScrollTop(nextTop);
        if (autoFollow && element.scrollHeight - element.clientHeight - nextTop > 18) setAutoFollow(false);
    };

    const copyLogs = () => {
        const text = (selectedEntry?.logs ?? []).join("\n");
        if (!text) return;
        try {
            void globalThis.navigator?.clipboard?.writeText?.(text);
        } catch (error) {
            // Clipboard availability is optional.
        }
    };
    const selectedEntryMeta = selectedEntry
        ? [
            selectedEntry.status === "running"
                ? "running"
                : `stopped${selectedEntry.timestamp ? ` ${new Date(selectedEntry.timestamp).toLocaleTimeString()}` : ""}`,
            selectedEntry.host,
            `PID ${selectedEntry.pid}`,
            `${selectedEntry.threads} thread${selectedEntry.threads === 1 ? "" : "s"}`,
            `${selectedEntry.logs.length} retained line${selectedEntry.logs.length === 1 ? "" : "s"}`,
        ].join(" · ")
        : "Select a script to inspect its output.";

    return (
        <main data-dashboard-theme-role="app-frame" style={STYLES.shell}>
            <header style={STYLES.header}>
                <div>
                    <div style={STYLES.title}>{view?.title ?? "Script Log Viewer"}</div>
                    <div style={STYLES.subtitle}>{view?.subtitle ?? "Live output from home scripts"}</div>
                </div>
                <div style={getDashboardFrameControlGroupStyle()}>
                    {headerActions}
                    <button type="button" style={STYLES.closeButton} onClick={onExit}>{view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}</button>
                </div>
            </header>

            <div style={STYLES.body}>
                <aside data-dashboard-theme-role="control-frame" style={STYLES.sidebar}>
                    <div style={STYLES.toolbar}>
                        <input
                            type="text"
                            value={query}
                            placeholder="Filter scripts…"
                            style={STYLES.search}
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={() => onInputFocusChange?.(true)}
                            onBlur={() => onInputFocusChange?.(false)}
                        />
                        {["all", "running", "recent"].map((filterId) => (
                            <button
                                type="button"
                                key={filterId}
                                style={{ ...STYLES.filterButton, ...(filter === filterId ? STYLES.filterActive : {}) }}
                                onClick={() => setFilter(filterId)}
                            >
                                {filterId}
                            </button>
                        ))}
                    </div>
                    <div
                        ref={listRef}
                        style={STYLES.scriptList}
                        onScroll={(event) => setListScrollTop(Math.max(0, event.currentTarget.scrollTop))}
                    >
                        {visibleEntries.map((entry) => (
                            <button
                                type="button"
                                data-dashboard-theme-role="navigation-item"
                                key={entry.id}
                                title={`${entry.filename} ${entry.argsText}`}
                                style={{ ...STYLES.scriptButton, ...(selectedEntry?.id === entry.id ? STYLES.scriptActive : {}) }}
                                onClick={() => {
                                    setSelectedId(entry.id);
                                    setScrollTop(0);
                                }}
                            >
                                <span style={STYLES.scriptName}>{entry.filename}</span>
                                <span style={{ ...STYLES.scriptMeta, color: entry.status === "running" ? COLORS.green : COLORS.amber }}>
                                    {entry.status.toUpperCase()} · PID {entry.pid} · {entry.threads}t{entry.argsText ? ` · ${entry.argsText}` : ""}
                                </span>
                            </button>
                        ))}
                        {visibleEntries.length === 0 ? <div style={STYLES.empty}>No scripts match this filter.</div> : null}
                    </div>
                </aside>

                <section data-dashboard-theme-role="control-frame" style={STYLES.logPanel}>
                    <div style={STYLES.logHeader}>
                        <div>
                            <div style={STYLES.logTitle}>{selectedEntry?.filename ?? "No script selected"}</div>
                            <div style={STYLES.subtitle}>{selectedEntryMeta}</div>
                        </div>
                        <div style={STYLES.logControls}>
                            <button
                                type="button"
                                style={{ ...STYLES.filterButton, ...(autoFollow ? STYLES.filterActive : {}), flex: "0 0 auto" }}
                                onClick={() => setAutoFollow((current) => !current)}
                            >
                                Follow {autoFollow ? "On" : "Off"}
                            </button>
                            <button type="button" style={{ ...STYLES.filterButton, flex: "0 0 auto" }} onClick={copyLogs}>Copy</button>
                        </div>
                    </div>
                    <div ref={logRef} style={STYLES.logViewport} onScroll={handleLogScroll}>
                        {selectedEntry?.logs?.length ? selectedEntry.logs.map((line, index) => (
                            <div key={`${index}:${line}`} style={STYLES.logLine}>{line || " "}</div>
                        )) : <div style={STYLES.empty}>No text output is currently retained for this script.</div>}
                    </div>
                </section>
            </div>
        </main>
    );
}
