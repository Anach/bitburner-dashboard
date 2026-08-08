import {
    DASHBOARD_THEME_MODE_DASHBOARD,
    buildDashboardTheme,
    createDashboardThemedReact,
} from "dashboard/libs/theme-adapter.js";
import {
    DASHBOARD_FRAME_CONTROL_LABELS,
    getDashboardFrameControlGroupStyle,
    getDashboardFrameHeaderStyle,
    getDashboardFrameControlStyle,
    runDashboardFrameControlClick,
    runDashboardFrameControlMouseDown,
} from "dashboard/libs/frame-controls.js";
import {
    getDashboardViewInteractionState,
    getDashboardViewValue,
    saveDashboardViewInteractionState,
} from "dashboard/libs/dashboard-view-state.js";

let React = null;
let rawReact = null;
let activeMailboxTheme = buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);

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
    bar: "#123322",
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
        outline: "none",
    },
    header: {
        ...getDashboardFrameHeaderStyle(),
        borderBottom: `1px solid ${COLORS.border}`,
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
    shortcutBar: {
        display: "flex",
        flexWrap: "wrap",
        gap: "1px 14px",
        padding: "5px 9px",
        background: COLORS.bar,
        borderBottom: `1px solid ${COLORS.border}`,
    },
    shortcutItem: {
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: COLORS.bright,
        fontFamily: "inherit",
        fontSize: "10px",
        fontWeight: 400,
        padding: "2px 3px",
    },
    shortcutItemHover: {
        fontWeight: 800,
    },
    shortcutKey: {
        color: COLORS.green,
    },
    body: {
        display: "grid",
        gridTemplateColumns: "160px minmax(0, 1fr)",
        gap: "8px",
        minHeight: 0,
        flex: "1 1 auto",
        padding: "8px",
        boxSizing: "border-box",
    },
    folderPane: {
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
        border: `1px solid ${COLORS.border}`,
        background: COLORS.panel,
        padding: "6px",
        boxSizing: "border-box",
    },
    folderList: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    folderButton: {
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "6px 7px",
        border: "none",
        background: "transparent",
        color: COLORS.text,
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "11px",
        cursor: "pointer",
    },
    folderButtonActive: {
        color: COLORS.bright,
        background: "rgba(12, 31, 22, 0.94)",
        boxShadow: "inset 3px 0 0 #6ee7a8",
    },
    folderDivider: {
        borderTop: `1px dashed ${COLORS.border}`,
        margin: "8px 2px",
    },
    folderSummary: {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        padding: "0 7px",
    },
    folderSummaryRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: "8px",
        fontSize: "10px",
        color: COLORS.muted,
    },
    mainPane: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        background: "#000000",
    },
    indexToolbar: {
        padding: "6px 9px",
        borderBottom: `1px solid ${COLORS.border}`,
        color: COLORS.muted,
        fontSize: "10px",
        flex: "0 0 auto",
    },
    indexList: {
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
    },
    indexRow: {
        display: "grid",
        gridTemplateColumns: "16px 26px 60px 150px 46px minmax(0, 1fr)",
        alignItems: "baseline",
        gap: "0 8px",
        width: "100%",
        padding: "4px 9px",
        border: "none",
        borderBottom: "1px solid rgba(125, 160, 212, 0.1)",
        background: "transparent",
        color: COLORS.text,
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "11px",
        cursor: "pointer",
    },
    indexRowCursor: {
        background: "rgba(12, 31, 22, 0.94)",
        boxShadow: "inset 3px 0 0 #6ee7a8",
    },
    indexRowUnread: {
        color: COLORS.bright,
        fontWeight: 700,
    },
    indexDot: {
        color: COLORS.green,
    },
    indexDotRead: {
        color: COLORS.muted,
    },
    indexNum: {
        color: COLORS.muted,
        textAlign: "right",
        fontWeight: 400,
    },
    indexDate: {
        color: COLORS.muted,
        fontWeight: 400,
        overflow: "hidden",
        whiteSpace: "nowrap",
    },
    indexSender: {
        color: COLORS.blue,
        fontWeight: 400,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    indexSize: {
        color: COLORS.muted,
        fontWeight: 400,
        textAlign: "right",
        overflow: "hidden",
        whiteSpace: "nowrap",
    },
    indexSubject: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    readerScroll: {
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "auto",
        padding: "10px 14px",
        boxSizing: "border-box",
        color: COLORS.text,
        fontSize: "11px",
    },
    readerRule: {
        borderTop: `1px dashed ${COLORS.border}`,
        margin: "6px 0",
    },
    readerSubjectLine: {
        color: COLORS.bright,
        fontSize: "13px",
        fontWeight: 800,
        margin: "8px 0",
    },
    readerCaret: {
        color: COLORS.amber,
        fontWeight: 800,
        marginRight: "4px",
    },
    readerMetaGrid: {
        display: "grid",
        gridTemplateColumns: "110px minmax(0, 1fr)",
        rowGap: "3px",
        columnGap: "10px",
        fontSize: "11px",
        margin: "10px 0",
    },
    readerMetaLabel: {
        color: COLORS.muted,
    },
    readerMetaValue: {
        color: COLORS.text,
    },
    readerBody: {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        userSelect: "text",
        WebkitUserSelect: "text",
        marginTop: "10px",
    },
    searchBar: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 9px",
        borderTop: `1px solid ${COLORS.border}`,
        background: COLORS.panel,
    },
    searchPrompt: {
        color: COLORS.amber,
        fontWeight: 800,
        fontSize: "11px",
    },
    searchInput: {
        flex: "1 1 auto",
        background: "transparent",
        border: "none",
        outline: "none",
        color: COLORS.bright,
        fontFamily: "inherit",
        fontSize: "11px",
    },
    statusBar: {
        borderTop: `1px solid ${COLORS.border}`,
        padding: "5px 9px",
        color: COLORS.blue,
        fontSize: "10px",
        flex: "0 0 auto",
    },
    empty: {
        color: COLORS.muted,
        padding: "12px",
        fontSize: "11px",
    },
};

function formatIndexDate(value) {
    const date = new Date(Number(value));
    if (!Number.isFinite(date.getTime())) return "";
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = String(date.getDate()).padStart(2, "0");
    return `${month} ${day}`;
}

function formatReceivedTimestamp(value) {
    const date = new Date(Number(value));
    if (!Number.isFinite(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}`;
}

function formatSize(charCount) {
    const bytes = Math.max(0, Number(charCount) || 0);
    if (bytes < 1024) return `${bytes}B`;
    const kb = bytes / 1024;
    return kb >= 10 ? `${Math.round(kb)}K` : `${kb.toFixed(1)}K`;
}

function capitalize(value) {
    const text = String(value ?? "");
    return text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function MailboxView({ view, telemetry, dashboardTheme, onCommand, onInputFocusChange, onExit, headerActions }) {
    const nextRawReact = globalThis.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, () => activeMailboxTheme);
    }
    activeMailboxTheme = dashboardTheme ?? activeMailboxTheme;
    if (!React) return null;

    const dataConfig = view?.data ?? {};
    const fields = view?.fields ?? {};
    const commandsConfig = view?.commands ?? {};
    const folders = Array.isArray(view?.folders) ? view.folders : [];
    const serviceId = String(dataConfig.serviceId ?? commandsConfig.serviceId ?? "");

    const idField = fields.id ?? "id";
    const sourceField = fields.source ?? "source";
    const subjectField = fields.subject ?? "subject";
    const contentField = fields.content ?? "content";
    const readField = fields.read ?? "read";
    const folderField = fields.folder ?? "folder";
    const firstSeenField = fields.firstSeenAt ?? "firstSeenAt";
    const typeField = fields.type ?? "type";

    const rawMessages = getDashboardViewValue(telemetry, dataConfig.messagesKey ?? "messages");
    const allMessages = Array.isArray(rawMessages) ? rawMessages : [];
    // Only show mail whose content has actually been captured - a message still waiting on
    // root access/RAM on its origin server isn't "obtained" yet, so it shouldn't appear at all.
    const messages = allMessages.filter((message) => getDashboardViewValue(message, contentField) != null);
    const folderCounts = getDashboardViewValue(telemetry, dataConfig.folderCountsKey ?? "folderCounts") ?? {};
    const totalCounts = getDashboardViewValue(telemetry, dataConfig.totalCountsKey ?? "totalCounts") ?? {};
    const lastResult = getDashboardViewValue(telemetry, dataConfig.lastResultKey ?? "lastCommand");

    const idOf = (message) => String(getDashboardViewValue(message, idField) ?? "");
    const findMessageById = (id) => messages.find((message) => idOf(message) === id) ?? null;

    const savedInteraction = getDashboardViewInteractionState(view?.id ?? "");
    const [selectedFolder, setSelectedFolder] = React.useState(() => String(savedInteraction?.selectedFolder ?? folders[0]?.id ?? "Inbox"));
    const [selectedMessageId, setSelectedMessageId] = React.useState(() => String(savedInteraction?.selectedMessageId ?? ""));
    const [cursorId, setCursorId] = React.useState(() => String(savedInteraction?.cursorId ?? ""));
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);
    const [hoveredShortcut, setHoveredShortcut] = React.useState("");

    const shellRef = React.useRef(null);
    const detailBodyElRef = React.useRef(null);
    const messageListElRef = React.useRef(null);
    const rowRefs = React.useRef({});
    const searchInputRef = React.useRef(null);

    React.useEffect(() => {
        saveDashboardViewInteractionState(view?.id ?? "", {
            ...getDashboardViewInteractionState(view?.id ?? ""),
            selectedFolder,
            selectedMessageId,
            cursorId,
        });
    }, [view?.id, selectedFolder, selectedMessageId, cursorId]);

    // The tail redraws (and rebuilds its DOM) on every dashboard refresh tick, which drops focus
    // back to the terminal. This used to reclaim it after every render by checking
    // document.activeElement, but that's a bare document reference, which
    // DASHBOARD_DESIGN_PRINCIPLES.md's Platform Boundaries forbids outright - removed rather than
    // worked around. Accepted regression: focus may occasionally drift back to the terminal after
    // a remount instead of being automatically reclaimed.

    React.useEffect(() => {
        return () => onInputFocusChange?.(false);
    }, []);

    React.useEffect(() => {
        if (searchOpen) searchInputRef.current?.focus?.();
    }, [searchOpen]);

    const setMessageListRef = (node) => {
        messageListElRef.current = node;
        if (node) node.scrollTop = Number(savedInteraction?.messageListScrollTop) || 0;
    };
    const setDetailBodyRef = (node) => {
        detailBodyElRef.current = node;
        if (node) node.scrollTop = Number(savedInteraction?.detailScrollTop) || 0;
    };
    const onMessageListScroll = (event) => {
        saveDashboardViewInteractionState(view?.id ?? "", {
            ...getDashboardViewInteractionState(view?.id ?? ""),
            messageListScrollTop: event.currentTarget.scrollTop,
        });
    };
    const onDetailScroll = (event) => {
        saveDashboardViewInteractionState(view?.id ?? "", {
            ...getDashboardViewInteractionState(view?.id ?? ""),
            detailScrollTop: event.currentTarget.scrollTop,
        });
    };

    const searchNormalized = searchQuery.trim().toLowerCase();
    const visibleMessages = messages
        .filter((message) => {
            return selectedFolder === "Inbox"
                ? !getDashboardViewValue(message, readField)
                : getDashboardViewValue(message, folderField) === selectedFolder;
        })
        .filter((message) => {
            if (!searchNormalized) return true;
            const haystack = `${getDashboardViewValue(message, subjectField) ?? ""} ${getDashboardViewValue(message, sourceField) ?? ""}`.toLowerCase();
            return haystack.includes(searchNormalized);
        })
        .slice()
        .sort((a, b) => (Number(getDashboardViewValue(a, firstSeenField)) || 0) - (Number(getDashboardViewValue(b, firstSeenField)) || 0));

    const visibleIdsKey = visibleMessages.map(idOf).join("|");
    React.useEffect(() => {
        if (visibleMessages.length === 0) {
            if (cursorId) setCursorId("");
            return;
        }
        if (!visibleMessages.some((message) => idOf(message) === cursorId)) {
            setCursorId(idOf(visibleMessages[0]));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleIdsKey, cursorId]);

    React.useEffect(() => {
        if (!cursorId) return;
        rowRefs.current[cursorId]?.scrollIntoView?.({ block: "nearest" });
    }, [cursorId]);

    const selectedMessage = findMessageById(selectedMessageId);

    const sendCommand = (command) => {
        if (!serviceId || !command) return;
        onCommand?.(serviceId, command);
    };

    const selectFolder = (folderId) => {
        setSelectedFolder(folderId);
        setSelectedMessageId("");
    };

    const openMessage = (message) => {
        if (!message) return;
        const id = idOf(message);
        setSelectedMessageId(id);
        setCursorId(id);
        if (!getDashboardViewValue(message, readField)) {
            const prefix = commandsConfig.markReadPrefix ?? "MarkRead:";
            sendCommand(`${prefix}${encodeURIComponent(id)}`);
        }
    };

    const closeReader = () => {
        if (selectedMessageId) setSelectedMessageId("");
    };

    const markAllRead = () => {
        const prefix = commandsConfig.markAllReadPrefix ?? "MarkAllRead:";
        sendCommand(`${prefix}${encodeURIComponent(selectedFolder)}`);
    };

    const deleteMessage = (id) => {
        const message = findMessageById(id);
        if (!message) return;
        const prefix = commandsConfig.deletePrefix ?? "Delete:";
        sendCommand(`${prefix}${encodeURIComponent(id)}`);
        if (selectedMessageId === id) setSelectedMessageId("");
    };

    const toggleReadMessage = (id) => {
        const message = findMessageById(id);
        if (!message) return;
        const isRead = Boolean(getDashboardViewValue(message, readField));
        const prefix = isRead
            ? (commandsConfig.markUnreadPrefix ?? "MarkUnread:")
            : (commandsConfig.markReadPrefix ?? "MarkRead:");
        sendCommand(`${prefix}${encodeURIComponent(id)}`);
    };

    const activeTargetId = () => selectedMessageId || cursorId;

    const moveCursor = (delta) => {
        if (selectedMessageId || visibleMessages.length === 0) return;
        const ids = visibleMessages.map(idOf);
        const currentIndex = Math.max(0, ids.indexOf(cursorId));
        const nextIndex = Math.min(ids.length - 1, Math.max(0, currentIndex + delta));
        setCursorId(ids[nextIndex]);
    };

    const jumpCursor = (edge) => {
        if (selectedMessageId || visibleMessages.length === 0) return;
        setCursorId(idOf(edge === "start" ? visibleMessages[0] : visibleMessages[visibleMessages.length - 1]));
    };

    const scrollReaderBy = (deltaPx) => {
        const node = detailBodyElRef.current;
        if (!node) return;
        node.scrollTop = Math.max(0, Math.min(node.scrollHeight, node.scrollTop + deltaPx));
    };

    const scrollReaderTo = (edge) => {
        const node = detailBodyElRef.current;
        if (!node) return;
        node.scrollTop = edge === "start" ? 0 : node.scrollHeight;
    };

    const closeSearch = () => {
        setSearchOpen(false);
        setSearchQuery("");
        shellRef.current?.focus?.();
    };

    const handleKeyDown = (event) => {
        if (isSearchFocused) return;
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                selectedMessageId ? scrollReaderBy(24) : moveCursor(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                selectedMessageId ? scrollReaderBy(-24) : moveCursor(-1);
                break;
            case "PageDown":
                event.preventDefault();
                selectedMessageId ? scrollReaderBy(240) : moveCursor(10);
                break;
            case "PageUp":
                event.preventDefault();
                selectedMessageId ? scrollReaderBy(-240) : moveCursor(-10);
                break;
            case "Home":
                event.preventDefault();
                selectedMessageId ? scrollReaderTo("start") : jumpCursor("start");
                break;
            case "End":
                event.preventDefault();
                selectedMessageId ? scrollReaderTo("end") : jumpCursor("end");
                break;
            case "Enter":
                event.preventDefault();
                if (!selectedMessageId && cursorId) openMessage(findMessageById(cursorId));
                break;
            case "Escape":
                event.preventDefault();
                closeReader();
                break;
            case "/":
                event.preventDefault();
                setSearchOpen(true);
                break;
            case "d":
            case "D":
                event.preventDefault();
                deleteMessage(activeTargetId());
                break;
            case "m":
            case "M":
                event.preventDefault();
                toggleReadMessage(activeTargetId());
                break;
            case "a":
            case "A":
                event.preventDefault();
                markAllRead();
                break;
            case "q":
            case "Q":
                event.preventDefault();
                onExit?.();
                break;
            default:
                break;
        }
    };

    // Label the toggle with the action it will perform, so the button also reports the
    // current read state of whatever message is open or highlighted.
    const activeTarget = findMessageById(activeTargetId());
    const readToggleLabel = getDashboardViewValue(activeTarget, readField) ? "Mark-Unread" : "Mark-Read";

    const shortcuts = [
        { id: "nav", key: "↑↓", label: "Nav", onClick: () => (selectedMessageId ? scrollReaderBy(24) : moveCursor(1)) },
        { id: "open", key: "Enter", label: "Open", onClick: () => { if (!selectedMessageId && cursorId) openMessage(findMessageById(cursorId)); } },
        { id: "back", key: "Esc", label: "Back", onClick: closeReader },
        { id: "page", key: "PgUp/PgDn", label: "Page", onClick: () => (selectedMessageId ? scrollReaderBy(240) : moveCursor(10)) },
        { id: "jump", key: "Home/End", label: "Jump", onClick: () => (selectedMessageId ? scrollReaderTo("end") : jumpCursor("end")) },
        { id: "search", key: "/", label: "Search", onClick: () => setSearchOpen(true) },
        { id: "delete", key: "d", label: "Delete", onClick: () => deleteMessage(activeTargetId()) },
        { id: "read-toggle", key: "m", label: readToggleLabel, onClick: () => toggleReadMessage(activeTargetId()) },
        { id: "mark-all", key: "a", label: "Mark all", onClick: markAllRead },
        { id: "close", key: "q", label: "Close", onClick: () => onExit?.() },
    ];

    const unreadTotal = Number(folderCounts?.Inbox) || 0;
    const totalResolved = Object.values(totalCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const readTotal = Math.max(0, totalResolved - unreadTotal);

    const statusSummary = `${selectedFolder} — ${visibleMessages.length} shown${searchQuery ? `, filtered by "${searchQuery}"` : ""}`;

    return (
        <main
            data-dashboard-theme-role="app-frame"
            ref={shellRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={STYLES.shell}
        >
            <header style={STYLES.header}>
                <div>
                    <div style={STYLES.title}>{view?.title ?? "Mailbox"}</div>
                    <div style={STYLES.subtitle}>{view?.subtitle ?? "In-game messages, lore, and text files"}</div>
                </div>
                <div style={getDashboardFrameControlGroupStyle()}>
                    {headerActions}
                    <button
                        type="button"
                        style={STYLES.closeButton}
                        onMouseDown={(event) => runDashboardFrameControlMouseDown(event, onExit)}
                        onClick={(event) => runDashboardFrameControlClick(event, onExit)}
                    >
                        {view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}
                    </button>
                </div>
            </header>

            <div style={STYLES.shortcutBar}>
                {shortcuts.map((shortcut) => (
                    <button
                        type="button"
                        key={shortcut.id}
                        style={{
                            ...STYLES.shortcutItem,
                            ...(hoveredShortcut === shortcut.id ? STYLES.shortcutItemHover : {}),
                        }}
                        onClick={shortcut.onClick}
                        onMouseEnter={() => setHoveredShortcut(shortcut.id)}
                        onMouseLeave={() => setHoveredShortcut("")}
                    >
                        <span style={STYLES.shortcutKey}>{shortcut.key}</span>
                        <span>:{shortcut.label}</span>
                    </button>
                ))}
            </div>

            <div style={STYLES.body}>
                <aside data-dashboard-theme-role="control-frame" style={STYLES.folderPane}>
                    <div style={STYLES.folderList}>
                        {folders.map((folder) => {
                            const isInbox = folder.id === "Inbox";
                            const count = isInbox ? unreadTotal : null;
                            return (
                                <button
                                    type="button"
                                    data-dashboard-theme-role="navigation-item"
                                    key={folder.id}
                                    style={{ ...STYLES.folderButton, ...(selectedFolder === folder.id ? STYLES.folderButtonActive : {}) }}
                                    onClick={() => selectFolder(folder.id)}
                                >
                                    {folder.label}{count !== null ? ` (${count})` : ""}
                                </button>
                            );
                        })}
                    </div>
                    <div style={STYLES.folderDivider} />
                    <div style={STYLES.folderSummary}>
                        <div style={STYLES.folderSummaryRow}><span>Unread</span><span>{unreadTotal}</span></div>
                        <div style={STYLES.folderSummaryRow}><span>Read</span><span>{readTotal}</span></div>
                    </div>
                </aside>

                <section data-dashboard-theme-role="control-frame" style={STYLES.mainPane}>
                    {selectedMessage ? (
                        <div ref={setDetailBodyRef} onScroll={onDetailScroll} style={STYLES.readerScroll}>
                            <div style={STYLES.readerRule} />
                            <div style={STYLES.readerSubjectLine}>
                                <span style={STYLES.readerCaret}>{"›"}</span>
                                {String(getDashboardViewValue(selectedMessage, subjectField) ?? "")}
                            </div>
                            <div style={STYLES.readerMetaGrid}>
                                <span style={STYLES.readerMetaLabel}>Sender</span>
                                <span style={STYLES.readerMetaValue}>{String(getDashboardViewValue(selectedMessage, sourceField) ?? "")}</span>
                                <span style={STYLES.readerMetaLabel}>Received</span>
                                <span style={STYLES.readerMetaValue}>{formatReceivedTimestamp(getDashboardViewValue(selectedMessage, firstSeenField))}</span>
                                <span style={STYLES.readerMetaLabel}>Location</span>
                                <span style={STYLES.readerMetaValue}>{String(getDashboardViewValue(selectedMessage, sourceField) ?? "")}</span>
                                <span style={STYLES.readerMetaLabel}>Type</span>
                                <span style={STYLES.readerMetaValue}>{capitalize(getDashboardViewValue(selectedMessage, typeField))}</span>
                            </div>
                            <div style={STYLES.readerRule} />
                            <div style={STYLES.readerBody}>
                                {getDashboardViewValue(selectedMessage, contentField) ?? ""}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={STYLES.indexToolbar}>{selectedFolder}</div>
                            <div ref={setMessageListRef} onScroll={onMessageListScroll} style={STYLES.indexList}>
                                {visibleMessages.map((message, index) => {
                                    const id = idOf(message);
                                    const isRead = Boolean(getDashboardViewValue(message, readField));
                                    const isCursor = cursorId === id;
                                    return (
                                        <button
                                            type="button"
                                            data-dashboard-theme-role="navigation-item"
                                            key={id}
                                            ref={(node) => {
                                                if (node) rowRefs.current[id] = node;
                                                else delete rowRefs.current[id];
                                            }}
                                            style={{
                                                ...STYLES.indexRow,
                                                ...(isRead ? {} : STYLES.indexRowUnread),
                                                ...(isCursor ? STYLES.indexRowCursor : {}),
                                            }}
                                            onClick={() => openMessage(message)}
                                        >
                                            <span style={{ ...STYLES.indexDot, ...(isRead ? STYLES.indexDotRead : {}) }}>
                                                {isRead ? "○" : "●"}
                                            </span>
                                            <span style={STYLES.indexNum}>{index + 1}</span>
                                            <span style={STYLES.indexDate}>{formatIndexDate(getDashboardViewValue(message, firstSeenField))}</span>
                                            <span style={STYLES.indexSender}>{String(getDashboardViewValue(message, sourceField) ?? "")}</span>
                                            <span style={STYLES.indexSize}>{formatSize(String(getDashboardViewValue(message, contentField) ?? "").length)}</span>
                                            <span style={STYLES.indexSubject}>
                                                {String(getDashboardViewValue(message, subjectField) ?? "")}
                                            </span>
                                        </button>
                                    );
                                })}
                                {visibleMessages.length === 0 ? <div style={STYLES.empty}>No messages in this folder.</div> : null}
                            </div>
                        </>
                    )}
                </section>
            </div>

            {searchOpen ? (
                <div style={STYLES.searchBar}>
                    <span style={STYLES.searchPrompt}>/</span>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        placeholder="Search subject or sender..."
                        style={STYLES.searchInput}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onFocus={() => {
                            setIsSearchFocused(true);
                            onInputFocusChange?.(true);
                        }}
                        onBlur={() => {
                            setIsSearchFocused(false);
                            onInputFocusChange?.(false);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                event.preventDefault();
                                closeSearch();
                            } else if (event.key === "Enter") {
                                event.preventDefault();
                                shellRef.current?.focus?.();
                            }
                        }}
                    />
                </div>
            ) : null}

            <div style={STYLES.statusBar}>
                {statusSummary}{lastResult?.message ? ` · ${lastResult.message}` : ""}
            </div>
        </main>
    );
}
