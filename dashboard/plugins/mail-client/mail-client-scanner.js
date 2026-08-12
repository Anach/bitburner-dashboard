import { discoverNetwork } from "dashboard/plugins/mail-client/mail-client-topology.js";
import { stripLitMarkup } from "dashboard/plugins/mail-client/mail-client-lit-text.js";
import { isMailboxCandidate } from "dashboard/plugins/mail-client/mail-client-files.js";
import { MAILBOX_COMMAND_PORT, MAILBOX_FEED_PORT } from "dashboard/libs/port-registry.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const MAILBOX_STATE_JSON = "data/mail_client_state.json";
const READER_SCRIPT = "dashboard/plugins/mail-client/mail-client-reader.js";
const READER_FILES = [
    READER_SCRIPT,
    "dashboard/plugins/mail-client/mail-client-files.js",
    "dashboard/plugins/mail-client/mail-client-lit-text.js",
    "dashboard/libs/port-registry.js",
];
const DARKNET_AGENT_SCRIPT = "dashboard/plugins/mail-client/mail-client-darknet-agent.js";
const DARKNET_ACCESS_PROGRAM = "DarkscapeNavigator.exe";
const SCAN_INTERVAL_MS = 5000;
const READER_RETRY_MS = 30000;
function makeId(source, filename) {
    return `${source}::${filename}`;
}

function classifyType(filename) {
    const comparable = filename.toLowerCase();
    if (comparable.endsWith(".msg")) return "message";
    if (comparable.endsWith(".lit")) return "lore";
    return "other";
}

function folderForType(type) {
    if (type === "message") return "Messages";
    if (type === "lore") return "Lore";
    return "Other";
}

function humanizeFilename(filename) {
    const base = filename.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    const withSpaces = base
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
    const words = withSpaces.split(/\s+/).filter(Boolean);
    if (words.length === 0) return base;
    return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function deriveSubject(content, filename) {
    if (typeof content === "string" && content.length > 0) {
        const firstLine = content.split("\n").map((line) => line.trim()).find((line) => line.length > 0);
        if (firstLine) {
            const collapsed = firstLine.replace(/\s+/g, " ");
            return collapsed.length > 60 ? `${collapsed.slice(0, 59)}…` : collapsed;
        }
    }
    return humanizeFilename(filename);
}

function loadState(ns) {
    if (ns.fileExists(MAILBOX_STATE_JSON, "home")) {
        try {
            const parsed = JSON.parse(ns.read(MAILBOX_STATE_JSON));
            if (parsed && typeof parsed === "object" && parsed.messages && typeof parsed.messages === "object") {
                // Snapshots expose messages as an array for the UI. Internally, commands address
                // them by id, so rebuild the id-keyed map instead of treating array indexes as ids
                // after every scanner restart.
                if (Array.isArray(parsed.messages)) {
                    const messagesById = {};
                    for (const record of parsed.messages) {
                        if (!record || typeof record !== "object" || typeof record.id !== "string") continue;
                        messagesById[record.id] = record;
                    }
                    return messagesById;
                }
                return parsed.messages;
            }
        } catch (error) {
            // Fall through to a fresh state on any parse failure.
        }
    }
    return {};
}

function migrateStoredMessages(messages) {
    // Clean state written before application-owned paths were excluded, and re-clean already-
    // stored lore content. This also removes files that ceased to be mailbox candidates later.
    for (const id of Object.keys(messages)) {
        const record = messages[id];
        if (!isMailboxCandidate(record?.filename)) {
            delete messages[id];
            continue;
        }
        if (typeof record.content === "string" && record.content.includes("<")) {
            const cleaned = stripLitMarkup(record.content);
            if (cleaned !== record.content) {
                record.content = cleaned;
                record.subject = deriveSubject(cleaned, record.filename);
            }
        }
    }
}

function ensureRecord(messages, source, filename, originHostType) {
    const id = makeId(source, filename);
    if (messages[id]) return messages[id];
    const type = classifyType(filename);
    const record = {
        id,
        source,
        originHostType,
        filename,
        type,
        folder: folderForType(type),
        subject: humanizeFilename(filename),
        content: null,
        firstSeenAt: Date.now(),
        read: false,
        readAt: null,
    };
    messages[id] = record;
    return record;
}

function drainFeed(ns, messages, networkHosts) {
    while (true) {
        const raw = ns.readPort(MAILBOX_FEED_PORT);
        if (raw === "NULL PORT DATA") break;
        if (!raw || typeof raw !== "object") continue;

        const { source, filename, content } = raw;
        if (typeof source !== "string" || typeof filename !== "string") continue;
        // Older reader copies can remain on remote hosts, so enforce the current filter again at
        // the scanner boundary instead of trusting every feed producer to be up to date.
        if (!isMailboxCandidate(filename)) continue;

        const originHostType = source === "home" ? "home" : networkHosts.has(source) ? "network" : "darknet";
        const record = ensureRecord(messages, source, filename, originHostType);
        if (typeof content === "string") {
            // Strip here as well as in the reader/darknet agent: remote hosts can be running an
            // older copy of the reader, so the scanner never trusts feed content to be clean.
            const cleaned = stripLitMarkup(content);
            record.content = cleaned;
            record.subject = deriveSubject(cleaned, filename);
        }
    }
}

function scanHomeFiles(ns, messages) {
    for (const filename of ns.ls("home")) {
        if (!isMailboxCandidate(filename)) continue;
        const record = ensureRecord(messages, "home", filename, "home");
        if (record.content === null) {
            try {
                const content = stripLitMarkup(ns.read(filename));
                record.content = content;
                record.subject = deriveSubject(content, filename);
            } catch (error) {
                // Leave content pending; retried next cycle.
            }
        }
    }
}

function scanNetworkForPendingFiles(ns, messages, hosts, readerLaunchState) {
    for (const host of hosts) {
        if (host === "home") continue;

        let hasQualifyingFile = false;
        for (const filename of ns.ls(host)) {
            if (!isMailboxCandidate(filename)) continue;
            hasQualifyingFile = true;
            ensureRecord(messages, host, filename, "network");
        }
        if (!hasQualifyingFile) continue;

        const hasPendingContent = Object.values(messages).some((record) => {
            return record.source === host && record.content === null;
        });
        if (!hasPendingContent) continue;

        if (!ns.hasRootAccess(host)) continue;

        const lastAttempt = readerLaunchState.get(host) ?? 0;
        if (Date.now() - lastAttempt < READER_RETRY_MS) continue;
        if (ns.scriptRunning(READER_SCRIPT, host)) continue;

        const readerCost = ns.getScriptRam(READER_SCRIPT, "home");
        const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
        if (readerCost <= 0 || freeRam < readerCost) continue;

        // Always re-copy the reader and its imports rather than only when missing: a host that
        // still holds older code would otherwise keep running stale capture logic forever, while
        // a fresh host cannot compile the reader without the imported modules beside it.
        ns.scp(READER_FILES, host, "home");
        ns.exec(READER_SCRIPT, host, { threads: 1, temporary: true });
        readerLaunchState.set(host, Date.now());
    }
}

function dedupeMessagesByFilenameAndContent(messages) {
    // Lore drops named "<origin>:<title>.lit" legitimately turn up on more than one host with
    // identical content - collapse those into a single canonical record. But .msg filenames
    // (e.g. "j2.msg") can be short/generic and coincidentally match across genuinely different
    // messages, so filename alone isn't proof of duplication - require matching content too.
    // Records with unresolved content are skipped entirely until they have something to compare.
    const canonicalIdByKey = new Map();
    for (const id of Object.keys(messages)) {
        const record = messages[id];
        if (record.content == null) continue;
        const key = `${record.filename}::${record.content}`;
        const canonicalId = canonicalIdByKey.get(key);
        if (!canonicalId) {
            canonicalIdByKey.set(key, id);
            continue;
        }
        if (canonicalId === id) continue;

        const canonical = messages[canonicalId];
        // Duplicate copies of the same content often resolve at different times (home reads
        // instantly, remote copies lag behind RAM/root access), so a fresh duplicate can turn up
        // well after an earlier copy was already read. Once either copy has been read, that id
        // must stay canonical permanently - otherwise a still-unread twin keeps "winning" the
        // firstSeenAt tie-break and silently undoes the read state the user already set.
        const preferCanonical = canonical.read === record.read
            ? canonical.firstSeenAt <= record.firstSeenAt
            : canonical.read;
        const keep = preferCanonical ? canonical : record;
        const keepId = preferCanonical ? canonicalId : id;
        const drop = preferCanonical ? record : canonical;
        const dropId = preferCanonical ? id : canonicalId;

        if (drop.read && !keep.read) {
            keep.read = true;
            keep.readAt = drop.readAt ?? keep.readAt;
        }

        delete messages[dropId];
        canonicalIdByKey.set(key, keepId);
    }
}

function ensureDarknetAgentRunning(ns) {
    // The dnet API (ns.dnet.*) throws outright without DarkscapeNavigator.exe; don't even
    // attempt to launch the agent until the player has actually purchased it.
    if (!ns.fileExists(DARKNET_ACCESS_PROGRAM, "home")) return;
    if (ns.scriptRunning(DARKNET_AGENT_SCRIPT, "home")) return;
    if (!ns.fileExists(DARKNET_AGENT_SCRIPT, "home")) return;
    ns.exec(DARKNET_AGENT_SCRIPT, "home", { threads: 1, temporary: true });
}

function drainCommands(ns, messages) {
    let lastCommand = null;
    while (true) {
        const raw = ns.readPort(MAILBOX_COMMAND_PORT);
        if (raw === "NULL PORT DATA") break;
        const command = String(raw);
        ns.print(`[MAILBOX] Command received: ${command}`);

        if (command.startsWith("MarkRead:")) {
            const id = decodeURIComponent(command.slice("MarkRead:".length));
            const record = messages[id];
            if (record) {
                record.read = true;
                record.readAt = Date.now();
                lastCommand = { status: "success", message: `Marked as read: ${record.subject}`, timestamp: Date.now() };
            } else {
                ns.print(`[MAILBOX] MarkRead target not found: ${id}`);
                lastCommand = { status: "error", message: `Mark read failed - message not found (${id}).`, timestamp: Date.now() };
            }
            continue;
        }

        if (command.startsWith("MarkUnread:")) {
            const id = decodeURIComponent(command.slice("MarkUnread:".length));
            const record = messages[id];
            if (record) {
                record.read = false;
                record.readAt = null;
                lastCommand = { status: "success", message: `Marked as unread: ${record.subject}`, timestamp: Date.now() };
            } else {
                ns.print(`[MAILBOX] MarkUnread target not found: ${id}`);
                lastCommand = { status: "error", message: `Mark unread failed - message not found (${id}).`, timestamp: Date.now() };
            }
            continue;
        }

        if (command.startsWith("MarkAllRead:")) {
            const folder = decodeURIComponent(command.slice("MarkAllRead:".length));
            let count = 0;
            for (const record of Object.values(messages)) {
                if (folder !== "Inbox" && record.folder !== folder) continue;
                if (record.read) continue;
                if (record.content === null) continue;
                record.read = true;
                record.readAt = Date.now();
                count += 1;
            }
            lastCommand = { status: "success", message: `Marked ${count} message(s) as read in ${folder}.`, timestamp: Date.now() };
            continue;
        }

        if (command.startsWith("Delete:")) {
            const id = decodeURIComponent(command.slice("Delete:".length));
            if (messages[id]) {
                const subject = messages[id].subject;
                delete messages[id];
                lastCommand = { status: "success", message: `Deleted: ${subject}`, timestamp: Date.now() };
            } else {
                ns.print(`[MAILBOX] Delete target not found: ${id}`);
                lastCommand = { status: "error", message: `Delete failed - message not found (${id}).`, timestamp: Date.now() };
            }
            continue;
        }

        ns.print(`[MAILBOX] Unrecognized command: ${command}`);
    }
    return lastCommand;
}

function buildSnapshot(messages, lastCommand) {
    // Mail whose content hasn't been captured yet isn't "obtained" - keep it out of counts
    // and off the wire entirely until a reader/darknet agent actually resolves its content.
    const records = Object.values(messages).filter((record) => record.content !== null);
    const folderCounts = { Inbox: 0, Messages: 0, Lore: 0, Other: 0 };
    const totalCounts = { Messages: 0, Lore: 0, Other: 0 };

    for (const record of records) {
        totalCounts[record.folder] += 1;
        if (!record.read) {
            folderCounts.Inbox += 1;
            folderCounts[record.folder] += 1;
        }
    }

    return {
        generatedAt: Date.now(),
        totalUnread: folderCounts.Inbox,
        folderCounts,
        totalCounts,
        messages: records,
        lastCommand,
    };
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[MAIL CLIENT] Mail Client Scanner started.");

    const messages = loadState(ns);
    migrateStoredMessages(messages);
    const readerLaunchState = new Map();
    let lastCommand = null;
    let lastStateSignature = "";

    while (true) {
        const networkHosts = new Set(discoverNetwork(ns, "home").servers);

        scanHomeFiles(ns, messages);
        scanNetworkForPendingFiles(ns, messages, networkHosts, readerLaunchState);
        ensureDarknetAgentRunning(ns);
        drainFeed(ns, messages, networkHosts);
        dedupeMessagesByFilenameAndContent(messages);

        const commandResult = drainCommands(ns, messages);
        if (commandResult) lastCommand = commandResult;

        const snapshot = buildSnapshot(messages, lastCommand);
        // Excludes generatedAt from the comparison - it always differs, which would defeat the
        // point. A genuinely new command result still triggers a write, since lastCommand's own
        // timestamp isn't excluded. Same signature-gating pattern as network-navigator.js/
        // player-stats.js - avoids a redundant write (and the dashboard-wide remount that a
        // changed telemetry file forces - see the Network Map remount-race note) between the
        // relatively rare moments a message actually arrives or gets read/deleted.
        const stateSignature = JSON.stringify(snapshot, (key, value) => key === "generatedAt" ? undefined : value);
        if (stateSignature !== lastStateSignature) {
            await ns.write(MAILBOX_STATE_JSON, JSON.stringify(snapshot), "w");
            lastStateSignature = stateSignature;
        }
        await ns.sleep(SCAN_INTERVAL_MS);
    }
}
