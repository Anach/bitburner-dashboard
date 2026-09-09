import { getReact, h } from "dashboard/plugins/bbs-connect/lib/react";
import {
    QUICK_SERVE_WIDTH,
    QUICK_SERVE_HEIGHT,
} from "dashboard/plugins/bbs-connect/bbs-connect-worker";
import { NETRONICS_PALETTE } from "dashboard/plugins/bbs-connect/bbs-connect-palette";
import { normalizeManualSections } from "dashboard/libs/manual-strings";

const MONO = '"Lucida Console", "Consolas", monospace';
const DISPLAY_ASPECT_RATIO = (QUICK_SERVE_WIDTH * 9) / (QUICK_SERVE_HEIGHT * 12);
const BBS_ASCII_TITLE = [
    "██████╗ ██████╗ ███████╗     ██████╗ ██████╗ ███╗   ██╗███╗   ██╗███████╗ ██████╗████████╗",
    "██╔══██╗██╔══██╗██╔════╝    ██╔════╝██╔═══██╗████╗  ██║████╗  ██║██╔════╝██╔════╝╚══██╔══╝",
    "██████╔╝██████╔╝███████╗    ██║     ██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██║        ██║   ",
    "██╔══██╗██╔══██╗╚════██║    ██║     ██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║        ██║   ",
    "██████╔╝██████╔╝███████║    ╚██████╗╚██████╔╝██║ ╚████║██║ ╚████║███████╗╚██████╗   ██║   ",
    "╚═════╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝ ╚═════╝   ╚═╝   ",
].join("\n");
const BBS_ASCII_COLUMNS = Math.max(...BBS_ASCII_TITLE.split("\n").map((line) => Array.from(line).length));

function normalizeLayout(layout = {}) {
    const fontSize = Number(layout.fontSize);
    const lineHeight = Number(layout.lineHeight);
    return {
        width: Math.max(0, Number(layout.width) || 0),
        height: Math.max(0, Number(layout.height) || 0),
        fontFamily: String(layout.fontFamily || MONO),
        fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16,
        lineHeight: Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 1.5,
    };
}

function layoutChanged(left, right) {
    return ["width", "height", "fontFamily", "fontSize", "lineHeight"]
        .some((key) => left[key] !== right[key]);
}

function useLiveLayout(layoutRef) {
    const react = getReact();
    const [layout, setLayout] = react.useState(() => normalizeLayout(layoutRef?.current));
    react.useEffect(() => {
        const timer = globalThis.setInterval(() => {
            const next = normalizeLayout(layoutRef?.current);
            setLayout((current) => layoutChanged(current, next) ? next : current);
        }, 150);
        return () => globalThis.clearInterval(timer);
    }, [layoutRef]);
    return layout;
}

function normalizeTheme(theme = {}) {
    return {
        primary: String(theme.primary || "#00ff00"),
        primarydark: String(theme.primarydark || "#007700"),
        secondary: String(theme.secondary || "#cccccc"),
        info: String(theme.info || "#66aaff"),
        error: String(theme.error || "#ff4444"),
        disabled: String(theme.disabled || theme.secondary || "#777777"),
        background: String(theme.background || "#000000"),
        surface: String(theme.surface || theme.background || "#000000"),
        button: String(theme.button || theme.surface || "transparent"),
    };
}

function themeChanged(left, right) {
    return ["primary", "primarydark", "secondary", "info", "error", "disabled", "background", "surface", "button"]
        .some((key) => left[key] !== right[key]);
}

function useLiveTheme(themeRef) {
    const react = getReact();
    const [theme, setTheme] = react.useState(() => normalizeTheme(themeRef?.current));
    react.useEffect(() => {
        const timer = globalThis.setInterval(() => {
            const next = normalizeTheme(themeRef?.current);
            setTheme((current) => themeChanged(current, next) ? next : current);
        }, 150);
        return () => globalThis.clearInterval(timer);
    }, [themeRef]);
    return theme;
}

function fullWindowStyle(layout, extra = {}) {
    return {
        boxSizing: "border-box",
        width: "100%",
        height: `${layout.height}px`,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        fontFamily: layout.fontFamily,
        fontSize: `${layout.fontSize}px`,
        lineHeight: layout.lineHeight,
        ...extra,
    };
}

function framedWindowStyle(layout, colors, embedded = false, extra = {}) {
    return fullWindowStyle(layout, {
        border: embedded ? "none" : `1px solid ${colors.primary}`,
        ...extra,
    });
}

function textControlStyle(layout, colors, disabled = false) {
    return {
        background: "transparent",
        color: disabled ? colors.disabled : colors.primary,
        border: "none",
        borderRadius: 0,
        padding: "2px 6px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontFamily: layout.fontFamily,
        fontSize: "0.85em",
        lineHeight: layout.lineHeight,
    };
}

function connectionTooltip(connection) {
    return [connection.description, connection.sourceUrl, connection.license ? `License: ${connection.license}` : ""]
        .filter(Boolean)
        .join("\n");
}

// Small local render helper, not a shared component - each full-window/workspace view wires its own
// Manual button into its own existing chrome (placement varies per view); only the plain-data
// normalizer (normalizeManualSections) is shared. Built with h(...) rather than JSX to match this
// file's own convention (see dashboard/plugins/bbs-connect/lib/react.js).
function renderManualSections(manual, colors, label) {
    const sections = normalizeManualSections(manual);
    if (sections.length === 0) {
        return h("div", { style: { color: colors.secondary, padding: "12px" } }, `A written manual for ${label} hasn't been authored yet.`);
    }
    return h(
        "div",
        { style: { padding: "12px", overflowY: "auto", textAlign: "left" } },
        ...sections.map((section, index) => h(
            "div",
            { key: index, style: { marginBottom: "14px" } },
            section.title ? h("div", { style: { color: colors.primary, fontWeight: "bold", marginBottom: "6px" } }, section.title) : null,
            h("div", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5, color: colors.secondary } }, section.body)
        ))
    );
}

function CatalogManagerView({ allConnections, colors, getScrollTop, layout, onInstallImport, onPrepareImport, onRemove, onScroll, onSetVisible }) {
    const react = getReact();
    const listRef = react.useRef(null);
    const [url, setUrl] = react.useState("");
    const [busy, setBusy] = react.useState(false);
    const [message, setMessage] = react.useState("");
    const [error, setError] = react.useState("");
    const [confirmRemoveId, setConfirmRemoveId] = react.useState("");
    const [preparedImport, setPreparedImport] = react.useState(null);

    react.useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const savedScrollTop = Math.max(0, Number(getScrollTop?.()) || 0);
        if (Math.abs(list.scrollTop - savedScrollTop) > 0.5) list.scrollTop = savedScrollTop;
    });

    const runAction = async (action, successMessage) => {
        if (busy) return null;
        setBusy(true);
        setError("");
        setMessage("");
        try {
            const result = await action();
            setMessage(typeof successMessage === "function" ? successMessage(result) : successMessage);
            return result;
        }
        catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : String(actionError));
            return null;
        }
        finally {
            setBusy(false);
        }
    };

    const importGame = async (event) => {
        event.preventDefault();
        const sourceUrl = url.trim();
        if (!sourceUrl) {
            setError("Enter an HTTPS QuickServe source-file URL.");
            return;
        }
        const prepared = await runAction(
            () => onPrepareImport(sourceUrl),
            (validated) => `Validated ${validated.name}. Confirm installation below.`,
        );
        if (prepared) setPreparedImport(prepared);
    };

    const gridColumns = "minmax(14ch, 1fr) 10ch 8ch minmax(20ch, auto)";
    return h("div", {
        style: {
            boxSizing: "border-box",
            flex: "1 1 auto",
            width: "72ch",
            maxWidth: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${colors.primarydark}`,
        },
    }, h("form", {
        onSubmit: importGame,
        style: {
            display: "flex",
            gap: "1ch",
            padding: "8px 1ch",
            borderBottom: `1px solid ${colors.primarydark}`,
        },
    }, h("input", {
        type: "url",
        value: url,
        disabled: busy,
        placeholder: "Paste QuickServe source-file link to validate",
        "aria-label": "QuickServe source-file URL",
        onChange: (event) => {
            setUrl(event.currentTarget.value);
            setPreparedImport(null);
        },
        style: {
            flex: "1 1 auto",
            minWidth: 0,
            padding: "3px 1ch",
            border: `1px solid ${colors.primarydark}`,
            borderRadius: 0,
            outline: "none",
            background: colors.background,
            color: colors.primary,
            font: "inherit",
        },
    }), h("button", {
        type: "submit",
        disabled: busy || !url.trim(),
        style: textControlStyle(layout, colors, busy || !url.trim()),
    }, busy ? "VALIDATING..." : "VALIDATE")), preparedImport ? h("div", {
        style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1ch",
            padding: "5px 1ch",
            borderBottom: `1px solid ${colors.primarydark}`,
            color: colors.info,
        },
    }, h("span", {
        style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        title: preparedImport.sourceUrl,
    }, `READY: ${preparedImport.name}`), h("span", {
        style: { display: "flex", gap: "0.5ch", whiteSpace: "nowrap" },
    }, h("button", {
        type: "button",
        disabled: busy,
        style: textControlStyle(layout, colors, busy),
        onClick: async () => {
            const connection = await runAction(
                () => onInstallImport(preparedImport),
                (installed) => installed ? `Imported ${installed.label}.` : "Import completed.",
            );
            if (connection) {
                setPreparedImport(null);
                setUrl("");
            }
        },
    }, "INSTALL"), h("button", {
        type: "button",
        disabled: busy,
        style: textControlStyle(layout, colors, busy),
        onClick: () => setPreparedImport(null),
    }, "CANCEL"))) : null, message ? h("div", {
        style: { padding: "4px 1ch", color: colors.info, overflowWrap: "anywhere" },
    }, message) : null, error ? h("div", {
        style: { padding: "4px 1ch", color: colors.error, overflowWrap: "anywhere" },
    }, error) : null, h("div", {
        ref: listRef,
        onScroll: (event) => onScroll?.(event.currentTarget.scrollTop),
        style: { flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden" },
    }, h("div", {
        style: {
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: "1ch",
            padding: "3px 1ch",
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: colors.background,
            color: colors.primary,
            borderBottom: `1px solid ${colors.primarydark}`,
            fontWeight: "bold",
        },
    }, h("span", null, "SYSTEM"), h("span", { style: { textAlign: "right" } }, "SOURCE"), h("span", { style: { textAlign: "right" } }, "STATE"), h("span", { style: { textAlign: "right" } }, "ACTIONS")),
        ...allConnections.map((connection) => {
            const removable = connection.origin === "player";
            const confirming = confirmRemoveId === connection.id;
            return h("div", {
                key: connection.id,
                style: {
                    display: "grid",
                    gridTemplateColumns: gridColumns,
                    gap: "1ch",
                    alignItems: "center",
                    padding: "3px 1ch",
                    color: connection.visible ? colors.primary : colors.secondary,
                    borderBottom: `1px solid ${colors.primarydark}`,
                },
            }, h("span", {
                title: connectionTooltip(connection),
                style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            }, connection.label), h("span", {
                style: { textAlign: "right" },
            }, connection.origin === "application" ? "NATIVE" : connection.origin === "local" ? "LOCAL" : "CATALOG"),
                h("span", {
                    style: { textAlign: "right" },
                }, connection.visible ? "SHOWN" : "HIDDEN"), h("span", {
                    style: { display: "flex", justifyContent: "flex-end", gap: "0.5ch", whiteSpace: "nowrap" },
                }, h("button", {
                    type: "button",
                    disabled: busy,
                    style: textControlStyle(layout, colors, busy),
                    onClick: () => runAction(
                        () => onSetVisible(connection, !connection.visible),
                        `${connection.label} ${connection.visible ? "hidden" : "shown"}.`,
                    ),
                }, connection.visible ? "HIDE" : "SHOW"), h("button", {
                    type: "button",
                    disabled: busy || !removable,
                    title: removable ? "Remove this catalog entry; cached source and save data are retained." : "Only player-catalog entries can be removed.",
                    style: textControlStyle(layout, colors, busy || !removable),
                    onClick: async () => {
                        if (!removable) return;
                        if (!confirming) {
                            setConfirmRemoveId(connection.id);
                            setMessage(`Select CONFIRM to remove ${connection.label}; saves are retained.`);
                            setError("");
                            return;
                        }
                        setConfirmRemoveId("");
                        await runAction(() => onRemove(connection), `${connection.label} removed.`);
                    },
                }, confirming ? "CONFIRM" : "REMOVE")));
        })));
}

function DirectoryView({ allConnections, colors, connections, embedded, getCatalogScrollTop, getScrollTop, layout, onCatalogScroll, onConnect, onInstallImport, onPrepareImport, onRemove, onScroll, onSelect, onSetVisible, selectedId, manual }) {
    const react = getReact();
    const focusRef = react.useRef(null);
    const listRef = react.useRef(null);
    const rowRefs = react.useRef(new Map());
    const selectedIndex = Math.max(0, connections.findIndex((connection) => connection.id === selectedId));
    const selectedConnection = connections[selectedIndex] ?? null;
    const asciiFontSize = Math.min(layout.fontSize, Math.max(6, (layout.width - 64) / (BBS_ASCII_COLUMNS * 0.62)));
    const hasManual = normalizeManualSections(manual).length > 0;
    // Plain useState is safe here (unlike the DASHBOARD_VIEW_METADATA views - Script Log, Network
    // Map, File Manager): BBS Connect is a persistent: true workspace provider with its own
    // long-lived React root that survives dashboard refreshes, so this never gets silently reset the
    // way a remounted tree's state would.
    const [showManual, setShowManual] = react.useState(false);
    const [showCatalog, setShowCatalog] = react.useState(false);

    react.useEffect(() => focusRef.current?.focus(), []);
    react.useLayoutEffect(() => {
        rowRefs.current.get(selectedConnection?.id)?.scrollIntoView?.({ block: "nearest" });
    }, [selectedConnection?.id]);
    react.useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const savedScrollTop = Math.max(0, Number(getScrollTop?.()) || 0);
        if (Math.abs(list.scrollTop - savedScrollTop) > 0.5) list.scrollTop = savedScrollTop;
    });

    const selectIndex = (index) => {
        const count = connections.length;
        if (count === 0) return;
        const wrappedIndex = ((index % count) + count) % count;
        onSelect(connections[wrappedIndex]);
    };
    const onKeyDown = (event) => {
        if (showCatalog) {
            if (event.key === "Escape" && !event.repeat) {
                event.preventDefault();
                event.stopPropagation();
                setShowCatalog(false);
            }
            return;
        }
        let nextIndex = null;
        if (event.key === "ArrowUp") nextIndex = selectedIndex - 1;
        else if (event.key === "ArrowDown") nextIndex = selectedIndex + 1;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = connections.length - 1;
        else if (event.key === "PageUp") nextIndex = selectedIndex - 5;
        else if (event.key === "PageDown") nextIndex = selectedIndex + 5;
        else if (event.key === "Enter" && selectedConnection && !event.repeat) {
            event.preventDefault();
            event.stopPropagation();
            onConnect(selectedConnection);
            return;
        }
        else if (hasManual && (event.key === "m" || event.key === "M") && !event.repeat) {
            event.preventDefault();
            event.stopPropagation();
            setShowManual((current) => !current);
            return;
        }
        else if ((event.key === "c" || event.key === "C") && !event.repeat) {
            event.preventDefault();
            event.stopPropagation();
            setShowManual(false);
            setShowCatalog(true);
            return;
        }
        if (nextIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        selectIndex(nextIndex);
    };

    const gridColumns = "2ch 3ch minmax(12ch, 1fr) 11ch 7ch";
    return h("div", {
        ref: focusRef,
        tabIndex: 0,
        role: "listbox",
        "aria-label": "Remote system directory",
        "aria-activedescendant": selectedConnection ? `bbs-connection-${selectedConnection.id}` : undefined,
        onKeyDown,
        style: framedWindowStyle(layout, colors, embedded, {
            color: colors.primary,
            background: colors.background,
            padding: "12px",
            overflowY: "hidden",
            overflowX: "auto",
            outline: "none",
        }),
    }, h("div", {
        style: {
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            minHeight: 0,
        },
    }, h("pre", {
        style: {
            flex: "0 0 auto",
            alignSelf: "center",
            maxWidth: "100%",
            margin: "0 0 8px",
            color: colors.primary,
            fontFamily: layout.fontFamily,
            fontSize: `${asciiFontSize}px`,
            lineHeight: 1.1,
            textAlign: "left",
            whiteSpace: "pre",
            overflow: "hidden",
        },
    }, BBS_ASCII_TITLE), h("div", {
        style: { margin: "0 0 12px", color: colors.secondary, textAlign: "center" },
    }, showCatalog ? "CONNECTION CATALOG" : "REMOTE SYSTEM DIRECTORY"), showManual
        ? renderManualSections(manual, colors, "BBS Connect")
        : showCatalog
            ? h(CatalogManagerView, {
                allConnections,
                colors,
                getScrollTop: getCatalogScrollTop,
                layout,
                onInstallImport,
                onPrepareImport,
                onRemove,
                onScroll: onCatalogScroll,
                onSetVisible,
            })
            : connections.length > 0
                ? h("div", {
                    ref: listRef,
                    onScroll: (event) => onScroll?.(event.currentTarget.scrollTop),
                    style: {
                        boxSizing: "border-box",
                        flex: "0 1 auto",
                        width: "64ch",
                        maxWidth: "100%",
                        minHeight: "8em",
                        border: `1px solid ${colors.primarydark}`,
                        background: colors.background,
                        overflowX: "hidden",
                        overflowY: "auto",
                    },
                }, h("div", {
                    role: "presentation",
                    style: {
                        display: "grid",
                        gridTemplateColumns: gridColumns,
                        columnGap: "1ch",
                        padding: "3px 1ch",
                        color: colors.primary,
                        borderBottom: `1px solid ${colors.primarydark}`,
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        background: colors.background,
                        fontWeight: "bold",
                        lineHeight: 1.15,
                        whiteSpace: "nowrap",
                    },
                }, h("span", null, ""), h("span", null, "ID"), h("span", null, "SYSTEM"), h("span", null, "PROTOCOL"), h("span", null, "STATUS")), ...connections.map((connection, index) => {
                    const selected = connection.id === selectedConnection?.id;
                    return h("div", {
                        id: `bbs-connection-${connection.id}`,
                        key: connection.id,
                        ref: (element) => {
                            if (element) rowRefs.current.set(connection.id, element);
                            else rowRefs.current.delete(connection.id);
                        },
                        role: "option",
                        "aria-selected": selected,
                        title: `${connectionTooltip(connection)}\nClick to select; double-click to connect.`,
                        onClick: () => onSelect(connection),
                        onDoubleClick: () => onConnect(connection),
                        style: {
                            display: "grid",
                            gridTemplateColumns: gridColumns,
                            columnGap: "1ch",
                            padding: "2px 1ch",
                            color: selected ? colors.primary : colors.secondary,
                            background: selected ? colors.surface : "transparent",
                            cursor: "default",
                            lineHeight: 1.15,
                            whiteSpace: "nowrap",
                            userSelect: "none",
                        },
                    }, h("span", { "aria-hidden": true }, selected ? ">" : ""), h("span", null, String(index + 1).padStart(2, "0")), h("span", {
                        style: { overflow: "hidden", textOverflow: "ellipsis" },
                    }, connection.label), h("span", null, String(connection.protocol || "quickserve").toUpperCase()), h("span", null, connection.status || (connection.path ? "LOCAL" : "REMOTE")));
                }))
                : h("div", { style: { color: colors.secondary } }, "No connections configured. Open CATALOG to import a QuickServe source."), h("div", {
                    style: {
                        flex: "0 0 auto",
                        marginTop: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4ch",
                    },
                }, showCatalog ? null : h("span", {
                    style: {
                        color: colors.primary,
                        whiteSpace: "pre",
                    },
                }, "↑↓: SELECT"), showCatalog ? null : h("button", {
                    type: "button",
                    // Deliberately not textControlStyle(): that's sized for buttons living in otherwise-plain
                    // dialog rows (Cancel, Hang Up, Pause, ...), but its 0.85em font reads as visibly smaller/
                    // dimmer than the plain, ambient-sized "↑↓: SELECT" text it sits directly beside here -
                    // matching that neighbor's own size/weight instead. font/lineHeight explicitly set to
                    // "inherit" - unlike a <span>, a <button> element does not inherit font styling from its
                    // parent by default (browsers give it a distinct UI-control font), so without this it
                    // silently fell back to that default font instead of matching the surrounding monospace
                    // text. Real <button> (not just a text hint) so mouse users have a click equivalent of the
                    // Enter keyboard shortcut, not only double-clicking a row. Disabled (dimmed, not clickable)
                    // when nothing is selected, mirroring the onKeyDown Enter branch's own
                    // `selectedConnection &&` guard.
                    disabled: !selectedConnection,
                    style: {
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        color: selectedConnection ? colors.primary : colors.secondary,
                        whiteSpace: "pre",
                        cursor: selectedConnection ? "pointer" : "default",
                        font: "inherit",
                        lineHeight: "inherit",
                    },
                    // preventDefault() on mousedown stops the click from moving DOM focus onto this button
                    // (native <button> default) - see the identical comment on the "M: MANUAL" button below
                    // for why that matters (it would otherwise eat the very next Enter/arrow keypress).
                    onMouseDown: (event) => event.preventDefault(),
                    onClick: () => onConnect(selectedConnection),
                }, "ENTER: CONNECT"), h("button", {
                    type: "button",
                    style: {
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        color: colors.primary,
                        whiteSpace: "pre",
                        cursor: "pointer",
                        font: "inherit",
                        lineHeight: "inherit",
                    },
                    onMouseDown: (event) => event.preventDefault(),
                    onClick: () => {
                        setShowManual(false);
                        setShowCatalog((current) => !current);
                    },
                }, showCatalog ? "C: BACK" : "C: CATALOG"), hasManual ? h("button", {
                    type: "button",
                    // Label format "<key>: MANUAL" matches the "KEY: ACTION" convention of its neighbors,
                    // rather than the earlier "[ MANUAL ]" bracket style.
                    style: {
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        color: colors.primary,
                        whiteSpace: "pre",
                        cursor: "pointer",
                        font: "inherit",
                        lineHeight: "inherit",
                    },
                    // Without this, clicking the button moves DOM focus onto it (native <button> default),
                    // so the *next* Enter keypress activates this button instead of reaching the listbox's
                    // onKeyDown handler - which only auto-focuses once on mount and never reclaims focus
                    // afterward. preventDefault() on mousedown suppresses that focus shift while still
                    // letting the click's onClick fire normally.
                    onMouseDown: (event) => event.preventDefault(),
                    onClick: () => {
                        setShowCatalog(false);
                        setShowManual((current) => !current);
                    },
                }, showManual ? "M: BACK" : "M: MANUAL") : null)));
}

function DialView({ colors, connection, embedded, layout, lines, onCancel, onSkip }) {
    const react = getReact();
    const focusRef = react.useRef(null);
    react.useEffect(() => focusRef.current?.focus(), []);
    return h("div", {
        ref: focusRef,
        tabIndex: 0,
        onKeyDown: (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onCancel();
            }
            else if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                onSkip();
            }
        },
        style: framedWindowStyle(layout, colors, embedded, {
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            color: colors.primary,
            background: colors.background,
            outline: "none",
        }),
    }, h("div", {
        style: {
            display: "flex",
            flex: "1 1 auto",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
        },
    }, h("pre", {
        style: {
            boxSizing: "border-box",
            width: "620px",
            maxWidth: "100%",
            minHeight: "18em",
            margin: 0,
            padding: "16px",
            color: colors.primary,
            border: `1px solid ${colors.primarydark}`,
            background: colors.surface,
            fontFamily: layout.fontFamily,
            fontSize: "1em",
            lineHeight: layout.lineHeight,
            whiteSpace: "pre-wrap",
        },
    }, lines.join("\n"))), h("div", {
        style: {
            display: "flex",
            flex: "0 0 auto",
            alignItems: "center",
            gap: "8px",
            paddingTop: "8px",
            borderTop: `1px solid ${colors.primarydark}`,
        },
    }, h("button", { onClick: onCancel, style: textControlStyle(layout, colors) }, "Cancel"), h("span", {
        style: { flex: "1 1 auto", color: colors.secondary, fontSize: "0.8em", textAlign: "right" },
    }, `ENTER: Complete dial  ·  ESC: Cancel  ·  ${connection.label}`)));
}

function CanvasDisplay({ frame, frameVersion, layout }) {
    const react = getReact();
    const canvasRef = react.useRef(null);
    const controlsHeight = Math.max(44, layout.fontSize * layout.lineHeight + 18);
    const availableWidth = Math.max(1, layout.width - 36);
    const availableHeight = Math.max(1, layout.height - controlsHeight - 36);
    const cssWidth = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight * DISPLAY_ASPECT_RATIO)));
    const cssHeight = Math.max(1, Math.floor(cssWidth / DISPLAY_ASPECT_RATIO));

    react.useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext?.("2d");
        if (!canvas || !context) return;
        const pixelRatio = Math.max(1, Number(globalThis.devicePixelRatio) || 1);
        canvas.width = Math.max(1, Math.floor(cssWidth * pixelRatio));
        canvas.height = Math.max(1, Math.floor(cssHeight * pixelRatio));
        const cellWidth = canvas.width / QUICK_SERVE_WIDTH;
        const cellHeight = canvas.height / QUICK_SERVE_HEIGHT;
        context.fillStyle = NETRONICS_PALETTE[0];
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `${Math.max(1, cellHeight * 0.82)}px ${layout.fontFamily}`;
        for (let y = 0; y < QUICK_SERVE_HEIGHT; y++) {
            for (let x = 0; x < QUICK_SERVE_WIDTH; x++) {
                const index = y * QUICK_SERVE_WIDTH + x;
                const glyph = frame.cells[index];
                if (!glyph || glyph === " ") continue;
                context.fillStyle = NETRONICS_PALETTE[frame.colors[index]] ?? NETRONICS_PALETTE[0];
                context.fillText(glyph, (x + 0.5) * cellWidth, (y + 0.53) * cellHeight);
            }
        }
    }, [frame, frameVersion, layout.fontFamily, cssWidth, cssHeight]);

    return h("canvas", {
        ref: canvasRef,
        width: cssWidth,
        height: cssHeight,
        "aria-label": "NETronics remote terminal",
        style: {
            display: "block",
            flex: "0 0 auto",
            width: `${cssWidth}px`,
            height: `${cssHeight}px`,
            maxWidth: "100%",
            maxHeight: "100%",
            border: `1px solid ${NETRONICS_PALETTE[17]}`,
            background: NETRONICS_PALETTE[0],
        },
    });
}

function SessionControls({ colors, layout, paused, onHangUp, onPause, onStep, onReload }) {
    return h("div", {
        style: {
            boxSizing: "border-box",
            display: "flex",
            flex: "0 0 auto",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "7px 8px",
            borderTop: `1px solid ${colors.primarydark}`,
        },
    }, h("button", { onClick: onHangUp, style: textControlStyle(layout, colors) }, "Hang Up / Menu"), h("span", {
        style: { flex: "1 1 auto" },
    }), h("button", { onClick: onPause, style: textControlStyle(layout, colors) }, paused ? "Resume" : "Pause"), h("button", {
        disabled: !paused,
        onClick: onStep,
        style: textControlStyle(layout, colors, !paused),
    }, "Step"), h("button", { onClick: onReload, style: textControlStyle(layout, colors) }, "Reload"));
}

function SessionView(props) {
    const react = getReact();
    const [focused, setFocused] = react.useState(false);
    const focusRef = react.useRef(null);
    react.useEffect(() => focusRef.current?.focus(), []);
    const keyMap = {
        Backspace: 8,
        Tab: 9,
        Enter: 10,
        Escape: 27,
        ArrowLeft: 19,
        ArrowUp: 17,
        ArrowRight: 20,
        ArrowDown: 18,
        Delete: 127,
    };
    const onKeyDown = (event) => {
        if (event.key === "F1") {
            event.preventDefault();
            event.stopPropagation();
            props.onReload();
            return;
        }
        if (event.ctrlKey || event.altKey || event.metaKey) return;
        let key = keyMap[event.key];
        if (key === undefined && event.key.length === 1) {
            const code = event.key.charCodeAt(0);
            if (code >= 0 && code <= 255) key = code;
        }
        if (key === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        props.onInput(key);
    };
    return h("div", {
        ref: focusRef,
        tabIndex: 0,
        onClick: () => focusRef.current?.focus(),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onKeyDown,
        style: framedWindowStyle(props.layout, props.colors, props.embedded, {
            display: "flex",
            flexDirection: "column",
            padding: "8px",
            color: props.colors.primary,
            background: props.colors.background,
            outline: "none",
            boxShadow: focused ? `inset 0 0 0 1px ${props.colors.primarydark}` : "none",
        }),
    }, h("div", {
        style: {
            display: "flex",
            flex: "1 1 auto",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            background: NETRONICS_PALETTE[0],
        },
    }, h(CanvasDisplay, {
        frame: props.frame,
        frameVersion: props.frameVersion,
        layout: props.layout,
    })), h(SessionControls, props));
}

function ErrorView({ colors, connection, embedded, layout, message, onMenu }) {
    return h("div", {
        style: framedWindowStyle(layout, colors, embedded, { display: "flex", padding: "8px", background: colors.background }),
    }, h("div", {
        style: {
            boxSizing: "border-box",
            display: "flex",
            flex: "1 1 auto",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            border: `1px solid ${colors.error}`,
            background: colors.surface,
        },
    }, h("pre", {
        style: {
            flex: "1 1 auto",
            margin: 0,
            padding: "16px",
            color: colors.error,
            fontFamily: layout.fontFamily,
            fontSize: "1em",
            lineHeight: layout.lineHeight,
            whiteSpace: "pre-wrap",
        },
    }, `NETRONICS CONNECT v2.4\n\nCONNECT : ${connection?.label ?? "UNKNOWN"}\n\nCONNECTION FAILED\n\n${message}`), h("div", {
        style: { padding: "7px 8px", borderTop: `1px solid ${colors.primarydark}` },
    }, h("button", { onClick: onMenu, style: textControlStyle(layout, colors) }, "Return to Directory"))));
}

export function BbsConnectCabinet(props) {
    const react = getReact();
    const colors = useLiveTheme(props.themeRef);
    const layout = useLiveLayout(props.layoutRef);
    const controller = props.controller;
    const embedded = props.embedded === true;
    const [snapshot, setSnapshot] = react.useState(controller.getSnapshot);
    react.useEffect(() => controller.subscribe(setSnapshot), [controller]);

    if (snapshot.mode === "directory") {
        return h(DirectoryView, {
            allConnections: controller.allConnections,
            colors,
            connections: controller.connections,
            embedded,
            getCatalogScrollTop: controller.getCatalogScrollTop,
            getScrollTop: controller.getDirectoryScrollTop,
            layout,
            onConnect: controller.openConnection,
            onInstallImport: controller.installConnectionImport,
            onPrepareImport: controller.prepareConnectionImport,
            onRemove: controller.removeConnection,
            onCatalogScroll: controller.setCatalogScrollTop,
            onScroll: controller.setDirectoryScrollTop,
            onSelect: controller.selectConnection,
            onSetVisible: controller.setConnectionVisible,
            selectedId: snapshot.selectedConnectionId,
            manual: props.manual,
        });
    }
    if (snapshot.mode === "dialing") {
        return h(DialView, {
            colors,
            connection: snapshot.connection,
            embedded,
            layout,
            lines: snapshot.dialLines,
            onCancel: controller.returnToDirectory,
            onSkip: controller.skipDial,
        });
    }
    if (snapshot.mode === "error") {
        return h(ErrorView, {
            colors,
            connection: snapshot.connection,
            embedded,
            layout,
            message: snapshot.errorMessage,
            onMenu: controller.returnToDirectory,
        });
    }
    if (snapshot.mode === "application") {
        const Application = snapshot.application?.component;
        if (typeof Application !== "function") {
            return h(ErrorView, {
                colors,
                connection: snapshot.connection,
                embedded,
                layout,
                message: "The connected application did not provide a usable cabinet.",
                onMenu: controller.returnToDirectory,
            });
        }
        return h(Application, {
            ...(snapshot.application.props ?? {}),
            embedded,
            layoutRef: props.layoutRef,
            themeRef: props.themeRef,
            onExit: controller.returnToDirectory,
        });
    }
    return h(SessionView, {
        colors,
        connection: snapshot.connection,
        embedded,
        frame: snapshot.frame,
        frameVersion: snapshot.frameVersion,
        layout,
        paused: snapshot.paused,
        onHangUp: controller.returnToDirectory,
        onInput: controller.input,
        onPause: controller.togglePause,
        onStep: controller.step,
        onReload: controller.reload,
    });
}
