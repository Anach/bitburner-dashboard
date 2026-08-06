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
    body: {
        display: "grid",
        gridTemplateColumns: "160px minmax(220px, 300px) minmax(0, 1fr)",
        gap: "8px",
        minHeight: 0,
        flex: "1 1 auto",
        padding: "8px",
        boxSizing: "border-box",
    },
    folderPane: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minHeight: 0,
        overflow: "auto",
        border: `1px solid ${COLORS.border}`,
        background: COLORS.panel,
        padding: "6px",
        boxSizing: "border-box",
    },
    folderButton: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "6px",
        width: "100%",
        padding: "7px 8px",
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
    folderBadge: {
        color: COLORS.muted,
        fontSize: "10px",
    },
    folderBadgeUnread: {
        color: COLORS.amber,
    },
    messageListPane: {
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
    toolbarButton: {
        minHeight: "28px",
        border: `1px solid ${COLORS.border}`,
        background: "rgba(8, 12, 10, 0.94)",
        color: COLORS.muted,
        padding: "5px 9px",
        fontFamily: "inherit",
        fontSize: "10px",
        cursor: "pointer",
        textTransform: "uppercase",
    },
    messageList: {
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
    },
    messageRow: {
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr)",
        gap: "2px 8px",
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
    messageRowActive: {
        color: COLORS.bright,
        background: "rgba(12, 31, 22, 0.94)",
        boxShadow: "inset 3px 0 0 #6ee7a8",
    },
    messageSource: {
        gridColumn: "2",
        color: COLORS.muted,
        fontSize: "9px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    messageSubject: {
        gridColumn: "2",
        fontSize: "11px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    messageSubjectUnread: {
        color: COLORS.bright,
        fontWeight: 700,
    },
    messageStatusDot: {
        gridRow: "1 / span 2",
        color: COLORS.green,
        fontSize: "11px",
    },
    messageStatusDotRead: {
        color: COLORS.muted,
    },
    detailPane: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        background: "#000000",
    },
    detailHeader: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "10px",
        padding: "7px 9px",
        borderBottom: `1px solid ${COLORS.border}`,
        flex: "0 0 auto",
    },
    detailSubject: {
        color: COLORS.green,
        fontSize: "12px",
        fontWeight: 800,
    },
    detailBody: {
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "auto",
        padding: "10px",
        boxSizing: "border-box",
        color: COLORS.text,
        background: "#000000",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontSize: "11px",
        userSelect: "text",
        WebkitUserSelect: "text",
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

function formatTimestamp(value) {
    const ms = Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "";
    return new Date(ms).toLocaleString();
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

    const rawMessages = getDashboardViewValue(telemetry, dataConfig.messagesKey ?? "messages");
    const allMessages = Array.isArray(rawMessages) ? rawMessages : [];
    // Only show mail whose content has actually been captured - a message still waiting on
    // root access/RAM on its origin server isn't "obtained" yet, so it shouldn't appear at all.
    const messages = allMessages.filter((message) => getDashboardViewValue(message, contentField) != null);
    const folderCounts = getDashboardViewValue(telemetry, dataConfig.folderCountsKey ?? "folderCounts") ?? {};
    const lastResult = getDashboardViewValue(telemetry, dataConfig.lastResultKey ?? "lastCommand");

    const savedInteraction = getDashboardViewInteractionState(view?.id ?? "");
    const [selectedFolder, setSelectedFolder] = React.useState(() => String(savedInteraction?.selectedFolder ?? folders[0]?.id ?? "Inbox"));
    const [selectedMessageId, setSelectedMessageId] = React.useState(() => String(savedInteraction?.selectedMessageId ?? ""));

    React.useEffect(() => {
        saveDashboardViewInteractionState(view?.id ?? "", {
            ...getDashboardViewInteractionState(view?.id ?? ""),
            selectedFolder,
            selectedMessageId,
        });
    }, [view?.id, selectedFolder, selectedMessageId]);

    const messageListRef = (node) => {
        if (node) node.scrollTop = Number(savedInteraction?.messageListScrollTop) || 0;
    };
    const detailBodyRef = (node) => {
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

    const visibleMessages = messages
        .filter((message) => {
            return selectedFolder === "Inbox"
                ? !getDashboardViewValue(message, readField)
                : getDashboardViewValue(message, folderField) === selectedFolder;
        })
        .slice()
        .sort((a, b) => (Number(getDashboardViewValue(b, firstSeenField)) || 0) - (Number(getDashboardViewValue(a, firstSeenField)) || 0));

    const selectedMessage = messages.find((message) => String(getDashboardViewValue(message, idField)) === selectedMessageId) ?? null;

    const sendCommand = (command) => {
        if (!serviceId || !command) return;
        onCommand?.(serviceId, command);
    };

    const selectFolder = (folderId) => {
        setSelectedFolder(folderId);
        setSelectedMessageId("");
    };

    const selectMessage = (message) => {
        const id = String(getDashboardViewValue(message, idField) ?? "");
        setSelectedMessageId(id);
        const hasContent = getDashboardViewValue(message, contentField) != null;
        if (hasContent && !getDashboardViewValue(message, readField)) {
            const prefix = commandsConfig.markReadPrefix ?? "MarkRead:";
            sendCommand(`${prefix}${encodeURIComponent(id)}`);
        }
    };

    const markAllRead = () => {
        const prefix = commandsConfig.markAllReadPrefix ?? "MarkAllRead:";
        sendCommand(`${prefix}${encodeURIComponent(selectedFolder)}`);
    };

    const deleteSelected = () => {
        if (!selectedMessage) return;
        const id = String(getDashboardViewValue(selectedMessage, idField) ?? "");
        const prefix = commandsConfig.deletePrefix ?? "Delete:";
        sendCommand(`${prefix}${encodeURIComponent(id)}`);
        setSelectedMessageId("");
    };

    const toggleReadSelected = () => {
        if (!selectedMessage) return;
        const id = String(getDashboardViewValue(selectedMessage, idField) ?? "");
        const isRead = Boolean(getDashboardViewValue(selectedMessage, readField));
        const prefix = isRead
            ? (commandsConfig.markUnreadPrefix ?? "MarkUnread:")
            : (commandsConfig.markReadPrefix ?? "MarkRead:");
        sendCommand(`${prefix}${encodeURIComponent(id)}`);
    };

    return (
        <main data-dashboard-theme-role="app-frame" style={STYLES.shell}>
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

            <div style={STYLES.body}>
                <aside data-dashboard-theme-role="control-frame" style={STYLES.folderPane}>
                    {folders.map((folder) => {
                        const count = Number(folderCounts?.[folder.id]) || 0;
                        return (
                            <button
                                type="button"
                                data-dashboard-theme-role="navigation-item"
                                key={folder.id}
                                style={{ ...STYLES.folderButton, ...(selectedFolder === folder.id ? STYLES.folderButtonActive : {}) }}
                                onClick={() => selectFolder(folder.id)}
                            >
                                <span>{folder.label}</span>
                                <span style={{ ...STYLES.folderBadge, ...(folder.id === "Inbox" && count > 0 ? STYLES.folderBadgeUnread : {}) }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                <section data-dashboard-theme-role="control-frame" style={STYLES.messageListPane}>
                    <div style={STYLES.toolbar}>
                        <button type="button" style={STYLES.toolbarButton} onClick={markAllRead}>Mark all read</button>
                    </div>
                    <div ref={messageListRef} onScroll={onMessageListScroll} style={STYLES.messageList}>
                        {visibleMessages.map((message) => {
                            const id = String(getDashboardViewValue(message, idField) ?? "");
                            const isRead = Boolean(getDashboardViewValue(message, readField));
                            return (
                                <button
                                    type="button"
                                    data-dashboard-theme-role="navigation-item"
                                    key={id}
                                    style={{ ...STYLES.messageRow, ...(selectedMessageId === id ? STYLES.messageRowActive : {}) }}
                                    onClick={() => selectMessage(message)}
                                >
                                    <span style={{ ...STYLES.messageStatusDot, ...(isRead ? STYLES.messageStatusDotRead : {}) }}>
                                        {isRead ? "○" : "●"}
                                    </span>
                                    <span style={STYLES.messageSource}>{String(getDashboardViewValue(message, sourceField) ?? "")}</span>
                                    <span style={{ ...STYLES.messageSubject, ...(isRead ? {} : STYLES.messageSubjectUnread) }}>
                                        {String(getDashboardViewValue(message, subjectField) ?? "")}
                                    </span>
                                </button>
                            );
                        })}
                        {visibleMessages.length === 0 ? <div style={STYLES.empty}>No messages in this folder.</div> : null}
                    </div>
                </section>

                <section data-dashboard-theme-role="control-frame" style={STYLES.detailPane}>
                    {selectedMessage ? (
                        <>
                            <div style={STYLES.detailHeader}>
                                <div>
                                    <div style={STYLES.detailSubject}>{String(getDashboardViewValue(selectedMessage, subjectField) ?? "")}</div>
                                    <div style={STYLES.subtitle}>
                                        {String(getDashboardViewValue(selectedMessage, sourceField) ?? "")} · {formatTimestamp(getDashboardViewValue(selectedMessage, firstSeenField))}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "5px", flex: "0 0 auto" }}>
                                    <button type="button" style={STYLES.toolbarButton} onClick={toggleReadSelected}>
                                        {getDashboardViewValue(selectedMessage, readField) ? "Mark unread" : "Mark read"}
                                    </button>
                                    <button type="button" style={STYLES.toolbarButton} onClick={deleteSelected}>Delete</button>
                                </div>
                            </div>
                            <div ref={detailBodyRef} onScroll={onDetailScroll} style={STYLES.detailBody}>
                                {getDashboardViewValue(selectedMessage, contentField) ?? ""}
                            </div>
                        </>
                    ) : (
                        <div style={STYLES.empty}>Select a message to read it.</div>
                    )}
                </section>
            </div>

            {lastResult?.message ? <div style={STYLES.statusBar}>{lastResult.message}</div> : null}
        </main>
    );
}
