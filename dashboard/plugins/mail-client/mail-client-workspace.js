import { MailClientView } from "dashboard/renderers/mail-client-view.jsx";
import { MAIL_CLIENT_VIEW_CONFIG } from "dashboard/plugins/mail-client/mail-client-config.js";

function decodeCommandArgument(command, prefix) {
    if (!prefix || !command.startsWith(prefix)) return null;
    try {
        return decodeURIComponent(command.slice(prefix.length));
    }
    catch (error) {
        return null;
    }
}

function buildOptimisticSnapshot(currentSnapshot, command) {
    if (!currentSnapshot || !Array.isArray(currentSnapshot.messages)) return currentSnapshot;

    const commands = MAIL_CLIENT_VIEW_CONFIG.commands ?? {};
    const messages = currentSnapshot.messages.map((message) => ({ ...message }));
    let changed = false;
    let statusMessage = "";
    const timestamp = Date.now();

    const markReadId = decodeCommandArgument(command, commands.markReadPrefix);
    const markUnreadId = decodeCommandArgument(command, commands.markUnreadPrefix);
    const deleteId = decodeCommandArgument(command, commands.deletePrefix);
    const markAllFolder = decodeCommandArgument(command, commands.markAllReadPrefix);

    if (markReadId !== null || markUnreadId !== null) {
        const targetId = markReadId ?? markUnreadId;
        const target = messages.find((message) => String(message.id ?? "") === targetId);
        if (target) {
            const nextReadState = markReadId !== null;
            if (target["read"] !== nextReadState) {
                target["read"] = nextReadState;
                target.readAt = nextReadState ? timestamp : null;
                changed = true;
            }
            statusMessage = `${nextReadState ? "Marked as read" : "Marked as unread"}: ${target.subject ?? "message"}`;
        }
    }
    else if (deleteId !== null) {
        const targetIndex = messages.findIndex((message) => String(message.id ?? "") === deleteId);
        if (targetIndex >= 0) {
            const [deleted] = messages.splice(targetIndex, 1);
            changed = true;
            statusMessage = `Deleted: ${deleted.subject ?? "message"}`;
        }
    }
    else if (markAllFolder !== null) {
        let count = 0;
        for (const message of messages) {
            if (markAllFolder !== "Inbox" && message.folder !== markAllFolder) continue;
            if (message["read"]) continue;
            message["read"] = true;
            message.readAt = timestamp;
            count += 1;
        }
        changed = count > 0;
        statusMessage = `Marked ${count} message(s) as read in ${markAllFolder}.`;
    }

    if (!changed) return currentSnapshot;

    const folderCounts = { Inbox: 0, Messages: 0, Lore: 0, Other: 0 };
    const totalCounts = { Messages: 0, Lore: 0, Other: 0 };
    for (const message of messages) {
        if (Object.hasOwn(totalCounts, message.folder)) totalCounts[message.folder] += 1;
        if (message["read"]) continue;
        folderCounts.Inbox += 1;
        if (Object.hasOwn(folderCounts, message.folder)) folderCounts[message.folder] += 1;
    }

    return {
        ...currentSnapshot,
        generatedAt: timestamp,
        totalUnread: folderCounts.Inbox,
        folderCounts,
        totalCounts,
        messages,
        lastCommand: { status: "pending", message: statusMessage, timestamp },
    };
}

export function createMailClientWorkspaceController(initialSnapshot = null) {
    const listeners = new Set();
    const pendingCommands = [];
    let snapshot = initialSnapshot;
    let stopped = false;

    return {
        drainCommands() {
            if (stopped || pendingCommands.length === 0) return [];
            return pendingCommands.splice(0, pendingCommands.length);
        },
        enqueueCommand(command) {
            const normalized = String(command ?? "").trim();
            if (stopped || !normalized) return false;
            pendingCommands.push(normalized);
            // Keep the workspace responsive without giving React a Netscript capability. The
            // scanner still drains this same command and publishes the durable result next cycle.
            const optimisticSnapshot = buildOptimisticSnapshot(snapshot, normalized);
            if (optimisticSnapshot !== snapshot) this.publish(optimisticSnapshot);
            return true;
        },
        getSnapshot: () => snapshot,
        publish(nextSnapshot) {
            if (stopped || !nextSnapshot || typeof nextSnapshot !== "object") return false;
            snapshot = nextSnapshot;
            for (const listener of [...listeners]) {
                try {
                    listener(snapshot);
                }
                catch (error) {
                    // A detached view observer must not interfere with mailbox collection.
                }
            }
            return true;
        },
        shutdown() {
            if (stopped) return false;
            stopped = true;
            pendingCommands.length = 0;
            listeners["clear"]();
            return true;
        },
        subscribe(listener) {
            if (stopped || typeof listener !== "function") return () => {};
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export function MailClientWorkspace({ controller, dashboardTheme, onInputFocusChange, manual }) {
    const React = globalThis.React;
    const [telemetry, setTelemetry] = React.useState(controller.getSnapshot);
    React.useEffect(() => controller.subscribe(setTelemetry), [controller]);

    return React.createElement(MailClientView, {
        view: MAIL_CLIENT_VIEW_CONFIG,
        telemetry,
        dashboardTheme,
        embedded: true,
        onCommand: (_serviceId, command) => controller.enqueueCommand(command),
        onInputFocusChange,
        manual,
    });
}
