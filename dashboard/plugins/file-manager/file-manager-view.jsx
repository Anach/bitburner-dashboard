import { formatRam } from "dashboard/libs/format-utils.js";
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
} from "dashboard/libs/frame-controls.js";
import {
    buildArchivePath,
    buildFilePaneEntries,
    classifyFileEntries,
    getFileDirectory,
    getFileExtension,
    getFileKind,
    getFileName,
    isDeletableFile,
    isEditableFile,
    isMovableFile,
    isPathInFolders,
    isProtectedFile,
    isReadableFile,
    joinFilePath,
    normalizeFileManifest,
    normalizeFilePath,
} from "dashboard/libs/file-utils.js";

let React = null;
let rawReact = null;
let activeFileManagerTheme = buildDashboardTheme(DASHBOARD_THEME_MODE_DASHBOARD);

const COLORS = {
    background: "#020504",
    panel: "rgba(4, 10, 8, 0.97)",
    panelBlue: "rgba(5, 9, 16, 0.97)",
    border: "rgba(108, 180, 255, 0.32)",
    borderStrong: "rgba(110, 231, 168, 0.68)",
    text: "#bed4c4",
    bright: "#e4f8e9",
    green: "#8ef0b5",
    blue: "#8fc5ff",
    muted: "#789589",
    dim: "#50665d",
    amber: "#ffd17a",
    red: "#ff9a9a",
    magenta: "#ff9de1",
};

const STYLES = {
    shell: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: "1 1 auto",
        overflow: "hidden",
        boxSizing: "border-box",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "8px",
        outline: "none",
        color: COLORS.text,
        backgroundColor: COLORS.background,
        backgroundImage: "linear-gradient(rgba(108, 180, 255, 0.025) 1px, transparent 1px), radial-gradient(circle at 8% 0%, rgba(47, 108, 80, 0.19), transparent 34%), radial-gradient(circle at 92% 5%, rgba(62, 89, 150, 0.17), transparent 38%)",
        backgroundSize: "100% 24px, auto, auto",
        userSelect: "none",
        WebkitUserSelect: "none",
    },
    topBar: {
        ...getDashboardFrameHeaderStyle(),
        borderBottom: `1px solid ${COLORS.border}`,
        background: "rgba(3, 8, 6, 0.94)",
    },
    title: {
        color: COLORS.bright,
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
    commandBar: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        flex: "0 0 auto",
        padding: "6px 8px",
        borderBottom: "1px solid rgba(108, 180, 255, 0.2)",
        background: "rgba(2, 6, 5, 0.9)",
    },
    commandLabel: {
        color: COLORS.green,
        fontSize: "9px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    },
    searchInput: {
        width: "220px",
        height: "25px",
        boxSizing: "border-box",
        border: "1px solid rgba(108, 180, 255, 0.28)",
        borderRadius: "3px",
        outline: "none",
        background: "rgba(2, 5, 4, 0.94)",
        color: COLORS.bright,
        padding: "3px 7px",
        fontFamily: "inherit",
        fontSize: "10px",
    },
    filterButton: {
        border: "1px solid rgba(108, 180, 255, 0.2)",
        borderRadius: "3px",
        background: "rgba(6, 12, 10, 0.88)",
        color: COLORS.muted,
        padding: "4px 7px",
        fontFamily: "inherit",
        fontSize: "9px",
        textTransform: "uppercase",
        cursor: "pointer",
    },
    filterButtonActive: {
        borderColor: "rgba(110, 231, 168, 0.55)",
        color: COLORS.green,
        background: "rgba(12, 31, 22, 0.94)",
        boxShadow: "inset 0 -2px 0 rgba(110, 231, 168, 0.35)",
    },
    manifestState: {
        marginLeft: "auto",
        color: COLORS.muted,
        fontSize: "9px",
        whiteSpace: "nowrap",
    },
    panes: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: "7px",
        flex: "1 1 auto",
        minHeight: 0,
        padding: "7px",
        boxSizing: "border-box",
    },
    pane: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "4px",
        background: `linear-gradient(145deg, ${COLORS.panel}, ${COLORS.panelBlue})`,
    },
    paneActive: {
        borderColor: COLORS.borderStrong,
        boxShadow: "0 0 14px rgba(110, 231, 168, 0.09), inset 0 0 0 1px rgba(110, 231, 168, 0.08)",
    },
    panePath: {
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        alignItems: "center",
        gap: "5px",
        minHeight: "28px",
        boxSizing: "border-box",
        padding: "4px 7px",
        borderBottom: "1px solid rgba(108, 180, 255, 0.24)",
        color: COLORS.blue,
        background: "rgba(3, 8, 7, 0.94)",
        fontSize: "10px",
    },
    panePathValue: {
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    columnHeader: {
        display: "grid",
        gridTemplateColumns: "minmax(150px, 1fr) 68px 72px 104px 78px",
        gap: "5px",
        alignItems: "center",
        minHeight: "23px",
        boxSizing: "border-box",
        padding: "3px 7px",
        borderBottom: "1px solid rgba(108, 180, 255, 0.18)",
        color: COLORS.dim,
        fontSize: "8px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
    },
    rows: {
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
        scrollbarColor: "rgba(108, 180, 255, 0.35) transparent",
        scrollbarWidth: "thin",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "minmax(150px, 1fr) 68px 72px 104px 78px",
        gap: "5px",
        alignItems: "center",
        minHeight: "23px",
        boxSizing: "border-box",
        padding: "3px 7px",
        border: "0",
        borderBottom: "1px solid rgba(125, 160, 212, 0.055)",
        color: COLORS.text,
        background: "transparent",
        fontFamily: "inherit",
        fontSize: "9px",
        textAlign: "left",
        cursor: "default",
    },
    rowSelected: {
        color: "#edfff2",
        background: "linear-gradient(90deg, rgba(35, 101, 70, 0.58), rgba(24, 70, 88, 0.44))",
        boxShadow: "inset 3px 0 0 #8ef0b5",
    },
    rowInactiveSelected: {
        background: "rgba(42, 66, 76, 0.35)",
        boxShadow: "inset 2px 0 0 rgba(143, 197, 255, 0.45)",
    },
    rowIgnored: {
        color: COLORS.dim,
        fontStyle: "italic",
    },
    cellEllipsis: {
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    footer: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "10px",
        alignItems: "center",
        flex: "0 0 auto",
        minHeight: "38px",
        boxSizing: "border-box",
        padding: "5px 8px",
        borderTop: "1px solid rgba(108, 180, 255, 0.23)",
        background: "rgba(3, 8, 6, 0.94)",
        fontSize: "9px",
    },
    footerPath: {
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: COLORS.bright,
    },
    footerMeta: {
        marginTop: "2px",
        color: COLORS.muted,
        whiteSpace: "nowrap",
    },
    notice: {
        maxWidth: "520px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: COLORS.green,
        textAlign: "right",
    },
    keyBar: {
        display: "grid",
        gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
        gap: "3px",
        flex: "0 0 auto",
        padding: "4px",
        borderTop: "1px solid rgba(108, 180, 255, 0.24)",
        background: "rgba(1, 4, 3, 0.98)",
    },
    keyButton: {
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 1fr)",
        alignItems: "center",
        minWidth: 0,
        height: "28px",
        padding: 0,
        border: "1px solid rgba(108, 180, 255, 0.22)",
        borderRadius: "2px",
        overflow: "hidden",
        background: "rgba(7, 14, 11, 0.92)",
        color: COLORS.text,
        fontFamily: "inherit",
        fontSize: "9px",
        cursor: "pointer",
    },
    keyCap: {
        alignSelf: "stretch",
        display: "grid",
        placeItems: "center",
        color: "#06100b",
        background: COLORS.green,
        fontWeight: 900,
    },
    keyLabel: {
        minWidth: 0,
        padding: "0 4px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        textAlign: "left",
    },
    disabled: {
        opacity: 0.34,
        cursor: "not-allowed",
        filter: "saturate(0.4)",
    },
    modalBackdrop: {
        position: "absolute",
        zIndex: 50,
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: "30px",
        boxSizing: "border-box",
        background: "rgba(0, 2, 1, 0.78)",
        backdropFilter: "blur(3px)",
    },
    modal: {
        display: "flex",
        flexDirection: "column",
        width: "min(780px, 88%)",
        maxHeight: "82%",
        overflow: "hidden",
        boxSizing: "border-box",
        border: "1px solid rgba(110, 231, 168, 0.62)",
        borderRadius: "5px",
        color: COLORS.text,
        background: "linear-gradient(145deg, rgba(4, 12, 8, 0.99), rgba(5, 9, 17, 0.99))",
        boxShadow: "0 18px 60px rgba(0, 0, 0, 0.72), 0 0 24px rgba(110, 231, 168, 0.08)",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "8px 10px",
        borderBottom: "1px solid rgba(108, 180, 255, 0.24)",
        color: COLORS.bright,
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
    },
    modalBody: {
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "auto",
        padding: "10px",
        boxSizing: "border-box",
        userSelect: "text",
        WebkitUserSelect: "text",
    },
    modalInput: {
        width: "100%",
        boxSizing: "border-box",
        marginTop: "8px",
        border: "1px solid rgba(108, 180, 255, 0.38)",
        borderRadius: "3px",
        outline: "none",
        padding: "7px 8px",
        background: "rgba(1, 5, 3, 0.96)",
        color: COLORS.bright,
        fontFamily: "inherit",
        fontSize: "11px",
    },
    modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "6px",
        padding: "8px 10px",
        borderTop: "1px solid rgba(108, 180, 255, 0.2)",
    },
    modalButton: {
        border: "1px solid rgba(108, 180, 255, 0.34)",
        borderRadius: "3px",
        padding: "5px 11px",
        color: COLORS.text,
        background: "rgba(8, 16, 13, 0.94)",
        fontFamily: "inherit",
        fontSize: "10px",
        cursor: "pointer",
    },
    preview: {
        margin: 0,
        color: "#cfe8d5",
        fontFamily: "inherit",
        fontSize: "10px",
        lineHeight: 1.35,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        tabSize: 4,
    },
};

function formatFileTime(timestamp) {
    const value = Number(timestamp) || 0;
    if (value <= 0) return "--";
    const date = new Date(value);
    return `${date.toLocaleDateString(undefined, { month: "short", day: "2-digit" })} ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

function formatStatus(entry) {
    if (!entry || entry.entryType === "parent") return "";
    if (entry.entryType === "directory") {
        if (entry.staleCount > 0) return `STALE:${entry.staleCount}`;
        if (entry.missingCount > 0) return `MISS:${entry.missingCount}`;
        if (entry.runningCount > 0) return `RUN:${entry.runningCount}`;
        return "DIR";
    }
    const base = String(entry.syncStatus ?? "unmanaged").toUpperCase();
    return entry.running ? `${base}*` : base;
}

function getStatusColor(entry) {
    if (!entry) return COLORS.muted;
    if (entry.entryType === "directory") {
        if (entry.staleCount > 0) return COLORS.amber;
        if (entry.missingCount > 0) return COLORS.red;
        if (entry.runningCount > 0) return COLORS.green;
        return COLORS.blue;
    }
    if (entry.syncStatus === "stale") return COLORS.amber;
    if (entry.syncStatus === "missing") return COLORS.red;
    if (entry.syncStatus === "tracked") return COLORS.green;
    return COLORS.muted;
}

function makeCopyName(path) {
    const directory = getFileDirectory(path);
    const name = getFileName(path);
    const extension = getFileExtension(path);
    const stem = extension ? name.slice(0, -(extension.length + 1)) : name;
    return joinFilePath(directory, `${stem}.copy${extension ? `.${extension}` : ""}`);
}

function normalizeSelectedIds(selectedIds, fallbackId = "") {
    const uniqueIds = Array.isArray(selectedIds)
        ? [...new Set(selectedIds.map((id) => String(id ?? "")).filter(Boolean))]
        : [];
    if (uniqueIds.length > 0) return uniqueIds;
    const fallback = String(fallbackId ?? "");
    return fallback ? [fallback] : [];
}

function getDirectoryFileEntries(files, directoryPath) {
    const normalizedDirectory = normalizeFilePath(directoryPath);
    if (!normalizedDirectory) return [];
    return (Array.isArray(files) ? files : []).filter((entry) => entry?.entryType !== "directory"
        && entry?.entryType !== "parent"
        && entry?.exists
        && isPathInFolders(entry.path, [normalizedDirectory]));
}

function resolveDeleteEntries(selection, files) {
    const resolvedEntries = [];
    const seenPaths = new Set();
    for (const entry of Array.isArray(selection) ? selection : []) {
        if (!entry) continue;
        if (entry.entryType === "file") {
            const normalizedPath = normalizeFilePath(entry.path);
            if (!entry.exists || !normalizedPath || seenPaths.has(normalizedPath)) continue;
            seenPaths.add(normalizedPath);
            resolvedEntries.push(entry);
            continue;
        }
        if (entry.entryType === "directory") {
            for (const descendant of getDirectoryFileEntries(files, entry.path)) {
                const normalizedPath = normalizeFilePath(descendant.path);
                if (!normalizedPath || seenPaths.has(normalizedPath)) continue;
                seenPaths.add(normalizedPath);
                resolvedEntries.push(descendant);
            }
        }
    }
    return resolvedEntries;
}

function FilePane({ id, path, entries, selectedEntry, selectedIds, active, rowRefs, scrollRef, onScroll, onActivate, onSelect, onOpen, getSelectionModifiers }) {
    const selectedIdSet = selectedIds instanceof Set ? selectedIds : new Set();
    return (
        <section
            data-dashboard-theme-role="control-frame"
            style={{ ...STYLES.pane, ...(active ? STYLES.paneActive : {}) }}
            onMouseDown={() => onActivate(id)}
        >
            <div style={STYLES.panePath}>
                <span style={{ color: active ? COLORS.green : COLORS.dim }}>[{active ? "*" : " "}]</span>
                <span style={STYLES.panePathValue} title={`home:/${path}`}>home:/{path}</span>
                <span style={{ color: COLORS.dim }}>{entries.length}</span>
            </div>
            <div style={STYLES.columnHeader}>
                <span>Name</span><span>Type</span><span>RAM</span><span>Modified</span><span>State</span>
            </div>
            <div ref={scrollRef} style={STYLES.rows} onScroll={onScroll}>
                {entries.length > 0 ? entries.map((entry) => {
                    const selected = selectedIdSet.has(entry.id);
                    const isDirectory = entry.entryType === "directory" || entry.entryType === "parent";
                    const typeLabel = entry.entryType === "parent"
                        ? "UP"
                        : entry.entryType === "directory"
                            ? "DIR"
                            : String(entry.kind ?? getFileKind(entry.path)).toUpperCase();
                    const ramLabel = entry.entryType === "file" && Number(entry.ramPerThread) > 0
                        ? formatRam(entry.ramPerThread)
                        : "--";
                    return (
                        <div
                            role="option"
                            aria-selected={selected}
                            key={entry.id}
                            ref={(element) => {
                                if (element) rowRefs.current[`${id}:${entry.id}`] = element;
                            }}
                            title={entry.path}
                            style={{
                                ...STYLES.row,
                                ...(entry.ignored ? STYLES.rowIgnored : {}),
                                ...(selected ? (active ? STYLES.rowSelected : STYLES.rowInactiveSelected) : {}),
                                ...(!entry.exists && entry.entryType === "file" ? { opacity: 0.62 } : {}),
                            }}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                onActivate(id);
                                const selectionModifiers = typeof getSelectionModifiers === "function"
                                    ? getSelectionModifiers(event)
                                    : { toggle: Boolean(event.ctrlKey || event.metaKey), range: Boolean(event.shiftKey) };
                                onSelect(id, entry.id, {
                                    toggle: selectionModifiers.toggle,
                                    range: selectionModifiers.range,
                                });
                            }}
                            onDoubleClick={() => onOpen(id, entry)}
                        >
                            <span style={STYLES.cellEllipsis}>{isDirectory ? "[+] " : "    "}{entry.name}</span>
                            <span style={{ ...STYLES.cellEllipsis, color: isDirectory ? COLORS.blue : COLORS.muted }}>{typeLabel}</span>
                            <span style={{ ...STYLES.cellEllipsis, color: COLORS.muted }}>{ramLabel}</span>
                            <span style={{ ...STYLES.cellEllipsis, color: COLORS.muted }}>{entry.entryType === "file" ? formatFileTime(entry.modifiedAt) : "--"}</span>
                            <span style={{ ...STYLES.cellEllipsis, color: getStatusColor(entry) }}>{formatStatus(entry)}</span>
                        </div>
                    );
                }) : (
                    <div style={{ padding: "12px", color: COLORS.dim, fontSize: "9px" }}>No matching files.</div>
                )}
            </div>
        </section>
    );
}

function FileDialog({ dialog, onChangeTarget, onConfirm, onClose, onInputFocusChange }) {
    if (!dialog) return null;
    const isPreview = dialog.type === "preview";
    const isBatchTransfer = dialog.type === "copy-many" || dialog.type === "move-many";
    const isBatchDelete = dialog.type === "delete-many";
    const requiresTarget = dialog.type === "copy" || dialog.type === "move" || isBatchTransfer;
    const danger = dialog.type === "delete" || isBatchDelete;
    const activateModalAction = (event, action) => {
        event.preventDefault();
        event.stopPropagation();
        action?.();
    };
    const title = isPreview
        ? `View — ${dialog.entry?.path ?? "file"}`
        : dialog.type === "cleanup"
            ? "Archive stale managed files"
            : isBatchDelete
                ? "Delete selected files"
                : isBatchTransfer
                    ? `${dialog.type === "copy-many" ? "copy" : "move"} selected files`
            : `${dialog.type} — ${dialog.entry?.name ?? "file"}`;

    return (
        <div style={STYLES.modalBackdrop} onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section style={STYLES.modal} role="dialog" aria-modal="true" aria-label={title}>
                <div style={STYLES.modalHeader}>
                    <span>{title}</span>
                    <button
                        type="button"
                        style={STYLES.closeButton}
                        onMouseDown={(event) => activateModalAction(event, onClose)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") activateModalAction(event, onClose);
                        }}
                    >
                        Close
                    </button>
                </div>
                <div style={STYLES.modalBody}>
                    {isPreview ? (
                        <>
                            <pre style={STYLES.preview}>{dialog.content}</pre>
                            {dialog.truncated ? <div style={{ color: COLORS.amber, marginTop: "8px", fontSize: "9px" }}>[preview truncated]</div> : null}
                        </>
                    ) : dialog.type === "cleanup" ? (
                        <>
                            <div style={{ color: COLORS.amber }}>
                                Archive {dialog.entries.length} stale managed file{dialog.entries.length === 1 ? "" : "s"} into {dialog.archiveRoot}/.
                            </div>
                            {dialog.blockedCount > 0 ? (
                                <div style={{ color: COLORS.red, marginTop: "6px" }}>
                                    {dialog.blockedCount} stale file{dialog.blockedCount === 1 ? " is" : "s are"} running, protected, missing, or not movable and will be skipped.
                                </div>
                            ) : null}
                            <div style={{ marginTop: "9px", display: "grid", gap: "3px", color: COLORS.muted, fontSize: "9px" }}>
                                {dialog.entries.map((entry) => <span key={entry.path}>{entry.path}</span>)}
                            </div>
                        </>
                    ) : isBatchDelete ? (
                        <>
                            <div style={{ color: COLORS.red }}>
                                Permanently delete {dialog.entries.length} selected file{dialog.entries.length === 1 ? "" : "s"}? This cannot be undone.
                            </div>
                            {dialog.requiresSecondConfirm ? (
                                <div style={{ color: dialog.confirmedOnce ? COLORS.red : COLORS.amber, marginTop: "6px" }}>
                                    {dialog.confirmedOnce
                                        ? "Second confirmation armed. Press Confirm again to proceed."
                                        : "Safety check: press Confirm once to arm delete, then press Confirm again to execute."}
                                </div>
                            ) : null}
                            <div style={{ marginTop: "9px", display: "grid", gap: "3px", color: COLORS.muted, fontSize: "9px" }}>
                                {dialog.entries.map((entry) => <span key={entry.path}>{entry.path}</span>)}
                            </div>
                        </>
                    ) : isBatchTransfer ? (
                        <>
                            <div style={{ color: COLORS.text }}>
                                {dialog.type === "copy-many" ? "Copy" : "Move"} {dialog.entries.length} selected file{dialog.entries.length === 1 ? "" : "s"} to directory:
                            </div>
                            <input
                                autoFocus
                                type="text"
                                value={dialog.target}
                                spellCheck={false}
                                style={STYLES.modalInput}
                                onChange={(event) => onChangeTarget(event.target.value)}
                                onFocus={() => onInputFocusChange?.(true)}
                                onBlur={() => onInputFocusChange?.(false)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onConfirm();
                                    }
                                }}
                            />
                            <div style={{ marginTop: "9px", display: "grid", gap: "3px", color: COLORS.muted, fontSize: "9px" }}>
                                {dialog.entries.map((entry) => <span key={entry.path}>{entry.path}</span>)}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ color: danger ? COLORS.red : COLORS.text }}>
                                {dialog.type === "delete"
                                    ? `Permanently delete ${dialog.entry?.path}? This cannot be undone.`
                                    : dialog.type === "archive"
                                        ? `Move ${dialog.entry?.path} to ${dialog.target}?`
                                        : `${dialog.type === "copy" ? "Copy" : "Move"} ${dialog.entry?.path} to:`}
                            </div>
                            {requiresTarget ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={dialog.target}
                                    spellCheck={false}
                                    style={STYLES.modalInput}
                                    onChange={(event) => onChangeTarget(event.target.value)}
                                    onFocus={() => onInputFocusChange?.(true)}
                                    onBlur={() => onInputFocusChange?.(false)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            onConfirm();
                                        }
                                    }}
                                />
                            ) : null}
                        </>
                    )}
                </div>
                {!isPreview ? (
                    <div style={STYLES.modalActions}>
                        <button
                            type="button"
                            style={STYLES.modalButton}
                            onMouseDown={(event) => activateModalAction(event, onClose)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") activateModalAction(event, onClose);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            style={{
                                ...STYLES.modalButton,
                                borderColor: danger ? "rgba(255, 122, 122, 0.56)" : "rgba(110, 231, 168, 0.48)",
                                color: danger ? COLORS.red : COLORS.green,
                            }}
                            onMouseDown={(event) => activateModalAction(event, onConfirm)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") activateModalAction(event, onConfirm);
                            }}
                        >
                            {dialog?.requiresSecondConfirm && !dialog?.confirmedOnce ? "Arm delete" : "Confirm"}
                        </button>
                    </div>
                ) : null}
            </section>
        </div>
    );
}

export function FileManagerView({
    view,
    snapshot,
    dashboardTheme,
    ignoredFolders = [],
    initialState = {},
    lastActionResult,
    onStateChange,
    onFileAction,
    onReadFile,
    onInputFocusChange,
    onExit,
    headerActions,
}) {
    const nextRawReact = globalThis.React ?? globalThis.window?.React ?? rawReact;
    if (nextRawReact && nextRawReact !== rawReact) {
        rawReact = nextRawReact;
        React = createDashboardThemedReact(rawReact, () => activeFileManagerTheme);
    }
    activeFileManagerTheme = dashboardTheme ?? activeFileManagerTheme;
    const savedState = /** @type {any} */ (initialState);
    const layout = view?.layout ?? {};
    const manifestConfig = view?.manifest ?? {};
    const protection = view?.protection ?? {};
    const archiveRoot = normalizeFilePath(view?.archive?.root ?? "trashbin") || "trashbin";
    const normalizedManifest = React.useMemo(
        () => normalizeFileManifest(snapshot?.manifest, manifestConfig),
        [snapshot?.manifest, manifestConfig.currentFilesKey, manifestConfig.previousFilesKey, manifestConfig.staleFilesKey, manifestConfig.generatedAtKey]
    );
    const files = React.useMemo(() => classifyFileEntries(snapshot?.files ?? [], normalizedManifest).map((entry) => ({
        ...entry,
        protected: isProtectedFile(entry, protection),
    })), [snapshot?.files, normalizedManifest, protection.protectRunning, JSON.stringify(protection.paths ?? []), JSON.stringify(protection.prefixes ?? [])]);
    const [activePane, setActivePane] = React.useState(() => savedState.activePane === "right" ? "right" : "left");
    const [panes, setPanes] = React.useState(() => ({
        left: {
            path: normalizeFilePath(savedState.leftPath ?? layout.leftPath ?? ""),
            selectedId: String(savedState.leftSelectedId ?? ""),
            selectedIds: normalizeSelectedIds(savedState.leftSelectedIds, savedState.leftSelectedId),
            anchorId: String(savedState.leftAnchorId ?? savedState.leftSelectedId ?? ""),
        },
        right: {
            path: normalizeFilePath(savedState.rightPath ?? layout.rightPath ?? "dashboard"),
            selectedId: String(savedState.rightSelectedId ?? ""),
            selectedIds: normalizeSelectedIds(savedState.rightSelectedIds, savedState.rightSelectedId),
            anchorId: String(savedState.rightAnchorId ?? savedState.rightSelectedId ?? ""),
        },
    }));
    const [query, setQuery] = React.useState(() => String(savedState.query ?? ""));
    const [statusFilter, setStatusFilter] = React.useState(() => String(savedState.statusFilter ?? "all"));
    const [showIgnored, setShowIgnored] = React.useState(() => typeof savedState.showIgnored === "boolean"
        ? savedState.showIgnored
        : layout.showIgnoredDefault !== false);
    const [dialog, setDialog] = React.useState(null);
    const [notice, setNotice] = React.useState("");
    const [noticeTone, setNoticeTone] = React.useState("success");
    const shellRef = React.useRef(null);
    const rowRefs = React.useRef({});
    const paneScrollRefs = {
        left: React.useRef(null),
        right: React.useRef(null),
    };
    const [paneScrollTops, setPaneScrollTops] = React.useState(() => ({
        left: Math.max(0, Number(savedState.leftScrollTop) || 0),
        right: Math.max(0, Number(savedState.rightScrollTop) || 0),
    }));
    const selectionModifiersRef = React.useRef({ toggle: false, range: false });
    const seenActionResultRef = React.useRef(0);
    const ignoredFolderKey = ignoredFolders.join("|");
    const buildEntries = (pane) => buildFilePaneEntries(files, pane.path, {
        query,
        statusFilter,
        showIgnored,
        ignoredFolders,
    });
    const paneEntries = {
        left: buildEntries(panes.left),
        right: buildEntries(panes.right),
    };
    const getSelectedEntry = (paneId) => {
        const entries = paneEntries[paneId] ?? [];
        const selectedIds = normalizeSelectedIds(panes[paneId]?.selectedIds, panes[paneId]?.selectedId);
        return entries.find((entry) => entry.id === panes[paneId]?.selectedId)
            ?? entries.find((entry) => selectedIds.includes(entry.id))
            ?? entries[0]
            ?? null;
    };
    const getSelectedEntries = (paneId) => {
        const entries = paneEntries[paneId] ?? [];
        const selectedIds = new Set(normalizeSelectedIds(panes[paneId]?.selectedIds, panes[paneId]?.selectedId));
        const selectedEntries = entries.filter((entry) => selectedIds.has(entry.id));
        if (selectedEntries.length > 0) return selectedEntries;
        const fallback = getSelectedEntry(paneId);
        return fallback ? [fallback] : [];
    };
    const selectedByPane = {
        left: getSelectedEntry("left"),
        right: getSelectedEntry("right"),
    };
    const selectedEntriesByPane = {
        left: getSelectedEntries("left"),
        right: getSelectedEntries("right"),
    };
    const selectedEntry = selectedByPane[activePane];
    const selectedEntries = selectedEntriesByPane[activePane];
    const deletableEntries = resolveDeleteEntries(selectedEntries, files);

    React.useEffect(() => {
        onStateChange?.({
            activePane,
            leftPath: panes.left.path,
            leftSelectedId: panes.left.selectedId,
            leftSelectedIds: panes.left.selectedIds,
            leftAnchorId: panes.left.anchorId,
            rightPath: panes.right.path,
            rightSelectedId: panes.right.selectedId,
            rightSelectedIds: panes.right.selectedIds,
            rightAnchorId: panes.right.anchorId,
            showIgnored,
            query,
            statusFilter,
            leftScrollTop: paneScrollTops.left,
            rightScrollTop: paneScrollTops.right,
        });
    }, [activePane, panes.left.path, panes.left.selectedId, panes.left.selectedIds, panes.left.anchorId, panes.right.path, panes.right.selectedId, panes.right.selectedIds, panes.right.anchorId, showIgnored, query, statusFilter, paneScrollTops.left, paneScrollTops.right]);

    React.useEffect(() => {
        shellRef.current?.focus?.();
        return () => onInputFocusChange?.(false);
    }, []);

    React.useEffect(() => {
        const resetSelectionModifiers = () => {
            selectionModifiersRef.current = { toggle: false, range: false };
        };
        globalThis.addEventListener?.("blur", resetSelectionModifiers);
        return () => globalThis.removeEventListener?.("blur", resetSelectionModifiers);
    }, []);

    React.useEffect(() => {
        const resultTime = Number(lastActionResult?.timestamp) || 0;
        if (!resultTime || resultTime <= seenActionResultRef.current || lastActionResult?.viewId !== view?.id) return;
        seenActionResultRef.current = resultTime;
        setNotice(String(lastActionResult.message ?? "File operation complete."));
        setNoticeTone(lastActionResult.status === "error" ? "error" : "success");
    }, [lastActionResult?.timestamp, lastActionResult?.viewId, lastActionResult?.message, view?.id]);

    React.useEffect(() => {
        const entry = selectedByPane[activePane];
        if (!entry) return;
        rowRefs.current[`${activePane}:${entry.id}`]?.scrollIntoView?.({ block: "nearest" });
    }, [activePane, panes.left.selectedId, panes.right.selectedId]);

    React.useLayoutEffect(() => {
        for (const paneId of ["left", "right"]) {
            const element = paneScrollRefs[paneId].current;
            if (!element) continue;
            const targetScrollTop = paneScrollTops[paneId] ?? 0;
            if (Math.abs(element.scrollTop - targetScrollTop) > 1) element.scrollTop = targetScrollTop;
        }
    }, [panes.left.path, panes.right.path]);

    React.useEffect(() => {
        if (showIgnored) return;
        setPanes((current) => {
            const next = { ...current };
            let changed = false;
            for (const paneId of ["left", "right"]) {
                if (!isPathInFolders(current[paneId].path, ignoredFolders)) continue;
                next[paneId] = { path: "", selectedId: "", selectedIds: [], anchorId: "" };
                changed = true;
            }
            return changed ? next : current;
        });
    }, [showIgnored, ignoredFolderKey]);

    const selectEntry = (paneId, selectedId, options = {}) => {
        const entries = paneEntries[paneId] ?? [];
        if (!entries.some((entry) => entry.id === selectedId)) return;
        const { toggle = false, range = false } = options;
        setPanes((current) => {
            const pane = current[paneId];
            const indexById = new Map(entries.map((entry, index) => [entry.id, index]));
            const baseSelectedIds = normalizeSelectedIds(pane.selectedIds, pane.selectedId).filter((id) => indexById.has(id));
            const selectedIdIndex = indexById.get(selectedId);
            if (selectedIdIndex === undefined) return current;
            let nextSelectedIds = [selectedId];
            let nextAnchorId = selectedId;
            if (range) {
                const anchorId = indexById.has(pane.anchorId) ? pane.anchorId : (baseSelectedIds[0] ?? selectedId);
                const anchorIndex = indexById.get(anchorId) ?? selectedIdIndex;
                const start = Math.min(anchorIndex, selectedIdIndex);
                const end = Math.max(anchorIndex, selectedIdIndex);
                nextSelectedIds = entries.slice(start, end + 1).map((entry) => entry.id);
                nextAnchorId = anchorId;
            } else if (toggle) {
                const nextSelectedSet = new Set(baseSelectedIds);
                if (nextSelectedSet.has(selectedId) && nextSelectedSet.size > 1) nextSelectedSet.delete(selectedId);
                else nextSelectedSet.add(selectedId);
                nextSelectedIds = [...nextSelectedSet];
            }
            return {
                ...current,
                [paneId]: {
                    ...pane,
                    selectedId,
                    selectedIds: nextSelectedIds,
                    anchorId: nextAnchorId,
                },
            };
        });
    };

    const changeDirectory = (paneId, path) => {
        setPanes((current) => ({
            ...current,
            [paneId]: { path: normalizeFilePath(path), selectedId: "", selectedIds: [], anchorId: "" },
        }));
        setPaneScrollTops((current) => ({ ...current, [paneId]: 0 }));
    };

    const showPreview = (entry) => {
        if (!entry || entry.entryType !== "file" || !entry.exists || !isReadableFile(entry.path)) return;
        const maxChars = Math.max(1000, Number(view?.preview?.maxChars) || 80000);
        let content = "";
        try {
            content = String(onReadFile?.(entry.path) ?? "");
        } catch (error) {
            content = `[Unable to read file: ${String(error?.message ?? error)}]`;
        }
        setDialog({
            type: "preview",
            entry,
            content: content.slice(0, maxChars),
            truncated: content.length > maxChars,
        });
    };

    const openEntry = (paneId, entry) => {
        if (!entry) return;
        if (entry.entryType === "directory" || entry.entryType === "parent") {
            changeDirectory(paneId, entry.path);
            return;
        }
        showPreview(entry);
    };

    const copyText = (text, successMessage) => {
        try {
            const clipboard = globalThis?.navigator?.clipboard;
            if (clipboard && typeof clipboard.writeText === "function") {
                void Promise.resolve(clipboard.writeText(text))
                    .then(() => {
                        setNotice(successMessage);
                        setNoticeTone("success");
                    })
                    .catch(() => {
                        setNotice(`Clipboard unavailable: ${text}`);
                        setNoticeTone("error");
                    });
                return;
            }
        } catch (error) {
            // Fall through to the visible command hint.
        }
        setNotice(`Clipboard unavailable: ${text}`);
        setNoticeTone("error");
    };

    const copyEditCommand = () => {
        if (!selectedEntry || selectedEntry.entryType !== "file" || !selectedEntry.exists || !isEditableFile(selectedEntry.path)) return;
        const template = String(view?.commands?.edit ?? "nano {path}");
        const command = template.replaceAll("{path}", selectedEntry.path);
        copyText(command, `Copied editor command: ${command}`);
    };

    const getSelectionModifiers = (event) => ({
        toggle: Boolean(event?.ctrlKey || event?.metaKey || selectionModifiersRef.current.toggle),
        range: Boolean(event?.shiftKey || selectionModifiersRef.current.range),
    });

    const otherPane = activePane === "left" ? "right" : "left";
    const selectedFileEntries = selectedEntries.filter((entry) => entry.entryType === "file");
    const hasMultiSelection = selectedEntries.length > 1;
    const canBatchCopy = selectedEntries.length > 0 && selectedEntries.every((entry) => entry.entryType === "file" && entry.exists && isEditableFile(entry.path));
    const canBatchMove = selectedEntries.length > 0 && selectedEntries.every((entry) => entry.entryType === "file" && entry.exists && !entry.protected && isMovableFile(entry.path));
    const canBatchDelete = selectedEntries.length > 0
        && deletableEntries.length > 0
        && deletableEntries.every((entry) => !entry.protected && isDeletableFile(entry.path));
    const openTransferDialog = (type) => {
        if (hasMultiSelection) {
            const entries = type === "copy"
                ? (canBatchCopy ? selectedFileEntries : [])
                : (canBatchMove ? selectedFileEntries : []);
            if (entries.length === 0 || entries.length !== selectedEntries.length) return;
            setDialog({
                type: `${type}-many`,
                entries,
                target: panes[otherPane].path,
            });
            return;
        }
        if (!selectedEntry || selectedEntry.entryType !== "file" || !selectedEntry.exists || !isEditableFile(selectedEntry.path)) return;
        if (type === "move" && (selectedEntry.protected || !isMovableFile(selectedEntry.path))) return;
        const proposed = joinFilePath(panes[otherPane].path, selectedEntry.name);
        const target = type === "copy" && proposed === selectedEntry.path ? makeCopyName(proposed) : proposed;
        setDialog({ type, entry: selectedEntry, target });
    };

    const openArchiveDialog = () => {
        if (!selectedEntry || selectedEntry.entryType !== "file" || !selectedEntry.exists || selectedEntry.protected || !isMovableFile(selectedEntry.path)) return;
        if (isPathInFolders(selectedEntry.path, [archiveRoot])) return;
        setDialog({ type: "archive", entry: selectedEntry, target: buildArchivePath(selectedEntry.path, archiveRoot) });
    };

    const openDeleteDialog = () => {
        if (hasMultiSelection || selectedEntry?.entryType === "directory") {
            if (!canBatchDelete) return;
            const includesDirectorySelection = selectedEntries.some((entry) => entry?.entryType === "directory");
            const requiresSecondConfirm = includesDirectorySelection || deletableEntries.length >= 20;
            setDialog({
                type: "delete-many",
                entries: deletableEntries,
                requiresSecondConfirm,
                confirmedOnce: false,
            });
            return;
        }
        if (!selectedEntry || selectedEntry.entryType !== "file" || !selectedEntry.exists || selectedEntry.protected || !isDeletableFile(selectedEntry.path)) return;
        setDialog({ type: "delete", entry: selectedEntry });
    };

    const staleEntries = files.filter((entry) => entry.syncStatus === "stale");
    const cleanableStaleEntries = staleEntries.filter((entry) => entry.exists && !entry.protected && isMovableFile(entry.path) && !isPathInFolders(entry.path, [archiveRoot]));
    const openCleanupDialog = () => {
        if (!normalizedManifest.available || cleanableStaleEntries.length === 0) return;
        setDialog({
            type: "cleanup",
            entries: cleanableStaleEntries,
            blockedCount: staleEntries.length - cleanableStaleEntries.length,
            archiveRoot,
        });
    };

    const confirmDialog = () => {
        if (!dialog || dialog.type === "preview") return;
        if (dialog.type === "delete-many" && dialog.requiresSecondConfirm && !dialog.confirmedOnce) {
            setDialog((current) => current ? { ...current, confirmedOnce: true } : current);
            return;
        }
        if (dialog.type === "cleanup") {
            onFileAction?.({ actionId: "archive-many", paths: dialog.entries.map((entry) => entry.path) });
        } else if (dialog.type === "copy-many" || dialog.type === "move-many" || dialog.type === "delete-many") {
            onFileAction?.({
                actionId: dialog.type,
                paths: dialog.entries.map((entry) => entry.path),
                target: dialog.target,
            });
        } else {
            onFileAction?.({
                actionId: dialog.type,
                path: dialog.entry?.path,
                target: dialog.target,
            });
        }
        onInputFocusChange?.(false);
        setDialog(null);
    };

    const moveSelection = (delta, options = {}) => {
        const entries = paneEntries[activePane] ?? [];
        if (entries.length === 0) return;
        const currentId = selectedByPane[activePane]?.id;
        const currentIndex = Math.max(0, entries.findIndex((entry) => entry.id === currentId));
        const nextIndex = Math.max(0, Math.min(entries.length - 1, currentIndex + delta));
        selectEntry(activePane, entries[nextIndex].id, options);
    };

    const canView = Boolean(selectedEntry?.entryType === "file" && selectedEntry.exists && isReadableFile(selectedEntry.path));
    const canEdit = Boolean(selectedEntry?.entryType === "file" && selectedEntry.exists && isEditableFile(selectedEntry.path));
    const canCopy = hasMultiSelection ? canBatchCopy : Boolean(selectedEntry?.entryType === "file" && selectedEntry.exists && isEditableFile(selectedEntry.path));
    const canMove = hasMultiSelection ? canBatchMove : Boolean(selectedEntry?.entryType === "file" && selectedEntry.exists && !selectedEntry.protected && isMovableFile(selectedEntry.path));
    const canArchive = !hasMultiSelection && canMove && !isPathInFolders(selectedEntry?.path, [archiveRoot]);
    const canDelete = hasMultiSelection ? canBatchDelete : Boolean(selectedEntry?.entryType === "file" && selectedEntry.exists && !selectedEntry.protected && isDeletableFile(selectedEntry.path));
    const canCleanup = normalizedManifest.available && cleanableStaleEntries.length > 0;
    const deleteActionCount = hasMultiSelection || selectedEntry?.entryType === "directory"
        ? deletableEntries.length
        : (canDelete ? 1 : 0);
    const deleteActionLabel = deleteActionCount > 0 ? `Delete (${deleteActionCount})` : "Delete";

    const keyActions = [
        { key: "F2", label: "Rescan", enabled: true, run: () => onFileAction?.({ actionId: "refresh" }) },
        { key: "F3", label: "View", enabled: canView, run: () => showPreview(selectedEntry) },
        { key: "F4", label: "Edit", enabled: canEdit, run: copyEditCommand },
        { key: "F5", label: "Copy", enabled: canCopy, run: () => openTransferDialog("copy") },
        { key: "F6", label: "Move", enabled: canMove, run: () => openTransferDialog("move") },
        { key: "F7", label: "Archive", enabled: canArchive, run: openArchiveDialog },
        { key: "F8", label: deleteActionLabel, enabled: canDelete, run: openDeleteDialog },
        { key: "F9", label: "Cleanup", enabled: canCleanup, run: openCleanupDialog },
        { key: "F10", label: "Close", enabled: true, run: onExit },
    ];

    const handleKeyDown = (event) => {
        const eventTarget = /** @type {any} */ (event.target);
        const targetTag = String(eventTarget?.tagName ?? "").toUpperCase();
        if (targetTag === "INPUT" || targetTag === "TEXTAREA") {
            if (event.key === "Escape") {
                event.preventDefault();
                eventTarget.blur?.();
                if (dialog) setDialog(null);
            }
            return;
        }
        if (targetTag === "BUTTON" && (event.key === "Enter" || event.key === " ")) return;
        if (event.key === "Escape") {
            event.preventDefault();
            if (dialog) setDialog(null);
            else onExit?.();
            return;
        }
        selectionModifiersRef.current = {
            toggle: Boolean(event.ctrlKey || event.metaKey),
            range: Boolean(event.shiftKey),
        };
        if (dialog) return;
        if (event.key === "Tab") {
            event.preventDefault();
            setActivePane((current) => current === "left" ? "right" : "left");
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
            event.preventDefault();
            const entries = (paneEntries[activePane] ?? []).filter((entry) => entry.entryType !== "parent");
            if (entries.length === 0) return;
            setPanes((current) => ({
                ...current,
                [activePane]: {
                    ...current[activePane],
                    selectedId: entries[entries.length - 1].id,
                    selectedIds: entries.map((entry) => entry.id),
                    anchorId: entries[0].id,
                },
            }));
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1, { range: event.shiftKey });
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1, { range: event.shiftKey });
            return;
        }
        if (event.key === "PageDown") {
            event.preventDefault();
            moveSelection(12, { range: event.shiftKey });
            return;
        }
        if (event.key === "PageUp") {
            event.preventDefault();
            moveSelection(-12, { range: event.shiftKey });
            return;
        }
        if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            const entries = paneEntries[activePane] ?? [];
            const entry = event.key === "Home" ? entries[0] : entries[entries.length - 1];
            if (entry) selectEntry(activePane, entry.id, { range: event.shiftKey });
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            openEntry(activePane, selectedEntry);
            return;
        }
        if (event.key === "Backspace") {
            event.preventDefault();
            changeDirectory(activePane, getFileDirectory(panes[activePane].path));
            return;
        }
        const action = keyActions.find((candidate) => candidate.key === event.key);
        if (action) {
            event.preventDefault();
            if (action.enabled) action.run?.();
        }
    };

    const handleKeyUp = (event) => {
        selectionModifiersRef.current = {
            toggle: Boolean(event.ctrlKey || event.metaKey),
            range: Boolean(event.shiftKey),
        };
    };

    const selectedMeta = selectedEntries.length > 1
        ? `${selectedEntries.length} selected · ${deletableEntries.length} deletable files · ${deletableEntries.filter((entry) => entry.running).length} running · ${deletableEntries.filter((entry) => entry.protected).length} protected`
        : selectedEntry?.entryType === "file"
        ? [
            String(selectedEntry.kind ?? getFileKind(selectedEntry.path)).toUpperCase(),
            selectedEntry.ramPerThread > 0 ? `${formatRam(selectedEntry.ramPerThread)} / thread` : "no RAM cost",
            formatFileTime(selectedEntry.modifiedAt),
            String(selectedEntry.syncStatus ?? "unmanaged").toUpperCase(),
            selectedEntry.running ? `RUNNING ${selectedEntry.runningThreads ?? 0}t` : "stopped",
            selectedEntry.protected ? "PROTECTED" : "writable",
        ].join(" · ")
        : selectedEntry?.entryType === "directory"
            ? `${selectedEntry.fileCount} files · ${selectedEntry.runningCount} running · ${selectedEntry.staleCount} stale · ${selectedEntry.missingCount} missing`
            : "Select a file or directory.";
    const filterDefinitions = ["all", "tracked", "stale", "unmanaged", "running", "missing"];
    const manifestLabel = normalizedManifest.available
        ? `MANIFEST ${normalizedManifest.currentFiles.length} TRACKED${normalizedManifest.generatedAt ? ` · ${formatFileTime(normalizedManifest.generatedAt)}` : ""}`
        : "MANIFEST NOT LOADED";

    return (
        <main data-dashboard-theme-role="app-frame" ref={shellRef} style={STYLES.shell} tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onMouseDown={(event) => {
            const target = /** @type {any} */ (event.target);
            if (!target?.closest?.("input, button")) event.currentTarget.focus?.();
        }}>
            <header style={STYLES.topBar}>
                <div>
                    <div style={STYLES.title}>{view?.title ?? "Home File Manager"}</div>
                    <div style={STYLES.subtitle}>{view?.subtitle ?? "Two-pane home filesystem control"}</div>
                </div>
                <div style={getDashboardFrameControlGroupStyle()}>
                    {headerActions}
                    <button type="button" style={STYLES.closeButton} onClick={onExit}>{view?.closeLabel ?? DASHBOARD_FRAME_CONTROL_LABELS.close}</button>
                </div>
            </header>

            <div style={STYLES.commandBar}>
                <span style={STYLES.commandLabel}>Find</span>
                <input
                    type="text"
                    value={query}
                    placeholder={view?.searchPlaceholder ?? "Filter current directories…"}
                    spellCheck={false}
                    style={STYLES.searchInput}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => onInputFocusChange?.(true)}
                    onBlur={() => onInputFocusChange?.(false)}
                />
                {filterDefinitions.map((filterId) => (
                    <button
                        type="button"
                        key={filterId}
                        style={{ ...STYLES.filterButton, ...(statusFilter === filterId ? STYLES.filterButtonActive : {}) }}
                        onClick={() => setStatusFilter(filterId)}
                    >
                        {filterId}
                    </button>
                ))}
                <button
                    type="button"
                    style={{ ...STYLES.filterButton, ...(showIgnored ? STYLES.filterButtonActive : {}) }}
                    title={`${ignoredFolders.length} dashboard-ignored folder${ignoredFolders.length === 1 ? "" : "s"}`}
                    onClick={() => setShowIgnored((current) => !current)}
                >
                    Ignored {showIgnored ? "shown" : "hidden"}
                </button>
                <span style={{ ...STYLES.manifestState, color: normalizedManifest.available ? COLORS.green : COLORS.amber }}>{manifestLabel}</span>
            </div>

            <div style={STYLES.panes}>
                <FilePane
                    id="left"
                    path={panes.left.path}
                    entries={paneEntries.left}
                    selectedEntry={selectedByPane.left}
                    selectedIds={new Set(selectedEntriesByPane.left.map((entry) => entry.id))}
                    active={activePane === "left"}
                    rowRefs={rowRefs}
                    scrollRef={paneScrollRefs.left}
                    onScroll={(event) => setPaneScrollTops((current) => ({ ...current, left: event.currentTarget.scrollTop }))}
                    onActivate={setActivePane}
                    onSelect={selectEntry}
                    onOpen={openEntry}
                    getSelectionModifiers={getSelectionModifiers}
                />
                <FilePane
                    id="right"
                    path={panes.right.path}
                    entries={paneEntries.right}
                    selectedEntry={selectedByPane.right}
                    selectedIds={new Set(selectedEntriesByPane.right.map((entry) => entry.id))}
                    active={activePane === "right"}
                    rowRefs={rowRefs}
                    scrollRef={paneScrollRefs.right}
                    onScroll={(event) => setPaneScrollTops((current) => ({ ...current, right: event.currentTarget.scrollTop }))}
                    onActivate={setActivePane}
                    onSelect={selectEntry}
                    onOpen={openEntry}
                    getSelectionModifiers={getSelectionModifiers}
                />
            </div>

            <footer style={STYLES.footer}>
                <div style={{ minWidth: 0 }}>
                    <div style={STYLES.footerPath}>{selectedEntries.length > 1 ? `${selectedEntries.length} items selected` : selectedEntry?.path ? `home:/${selectedEntry.path}` : "home:/"}</div>
                    <div style={STYLES.footerMeta}>{selectedMeta}</div>
                </div>
                <div style={{ ...STYLES.notice, color: noticeTone === "error" ? COLORS.red : COLORS.green }} title={notice}>{notice}</div>
            </footer>

            <div style={STYLES.keyBar}>
                {keyActions.map((action) => (
                    <button
                        type="button"
                        key={action.key}
                        disabled={!action.enabled}
                        title={!action.enabled && action.key === "F9" && !normalizedManifest.available
                            ? "Cleanup requires a deployment manifest."
                            : `${action.key} ${action.label}`}
                        style={{ ...STYLES.keyButton, ...(!action.enabled ? STYLES.disabled : {}) }}
                        onClick={() => action.enabled && action.run?.()}
                    >
                        <span style={STYLES.keyCap}>{action.key.slice(1)}</span>
                        <span style={STYLES.keyLabel}>{action.label}</span>
                    </button>
                ))}
            </div>

            <FileDialog
                dialog={dialog}
                onChangeTarget={(target) => setDialog((current) => current ? { ...current, target } : current)}
                onConfirm={confirmDialog}
                onClose={() => {
                    onInputFocusChange?.(false);
                    setDialog(null);
                }}
                onInputFocusChange={onInputFocusChange}
            />
        </main>
    );
}
