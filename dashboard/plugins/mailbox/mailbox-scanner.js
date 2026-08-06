import { discoverNetwork } from "dashboard/plugins/mailbox/topology.js";
import { MAILBOX_FEED_PORT } from "dashboard/plugins/mailbox/mailbox-reader.js";
import { stripLitMarkup } from "dashboard/plugins/mailbox/lit-text.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const MAILBOX_STATE_JSON = "data/mailbox_state.json";
const MAILBOX_COMMAND_PORT = 21;
const READER_SCRIPT = "dashboard/plugins/mailbox/mailbox-reader.js";
const DARKNET_AGENT_SCRIPT = "dashboard/plugins/mailbox/mailbox-darknet-agent.js";
const DARKNET_ACCESS_PROGRAM = "DarkscapeNavigator.exe";
const SCAN_INTERVAL_MS = 5000;
const READER_RETRY_MS = 30000;
const MESSAGE_EXTENSIONS = [".msg", ".lit", ".txt"];

function isMailboxCandidate(filename) {
    if (!MESSAGE_EXTENSIONS.some((extension) => filename.endsWith(extension))) return false;
    // "data/" is this codebase's convention for automation-owned state/report files
    // (see DATA_PATHS in libs/fs-paths.js) - never in-universe narrative pickups.
    if (filename.startsWith("data/")) return false;
    return true;
}

function makeId(source, filename) {
    return `${source}::${filename}`;
}

function classifyType(filename) {
    if (filename.endsWith(".msg")) return "message";
    if (filename.endsWith(".lit")) return "lore";
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
                return parsed.messages;
            }
        } catch (error) {
            // Fall through to a fresh state on any parse failure.
        }
    }
    return {};
}

function migrateStoredMessages(messages) {
    // One-time cleanup for state written before the data/-exclusion and lore HTML-stripping
    // fixes existed: drop automation-file records outright, and re-clean already-stored content.
    for (const id of Object.keys(messages)) {
        const record = messages[id];
        if (record.filename.startsWith("data/")) {
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

        const originHostType = source === "home" ? "home" : networkHosts.has(source) ? "network" : "darknet";
        const record = ensureRecord(messages, source, filename, originHostType);
        if (typeof content === "string") {
            record.content = content;
            record.subject = deriveSubject(content, filename);
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

        if (!ns.fileExists(READER_SCRIPT, host)) {
            ns.scp(READER_SCRIPT, host, "home");
        }
        ns.exec(READER_SCRIPT, host, 1);
        readerLaunchState.set(host, Date.now());
    }
}

function dedupeMessagesByFilename(messages) {
    // The same filename (e.g. lore drops named "<origin>:<title>.lit") can legitimately turn
    // up on more than one host; collapse those into a single canonical record instead of
    // showing one row per host it happened to be discovered on.
    const canonicalIdByFilename = new Map();
    for (const id of Object.keys(messages)) {
        const record = messages[id];
        const canonicalId = canonicalIdByFilename.get(record.filename);
        if (!canonicalId) {
            canonicalIdByFilename.set(record.filename, id);
            continue;
        }
        if (canonicalId === id) continue;

        const canonical = messages[canonicalId];
        const canonicalIsOlder = canonical.firstSeenAt <= record.firstSeenAt;
        const keep = canonicalIsOlder ? canonical : record;
        const keepId = canonicalIsOlder ? canonicalId : id;
        const drop = canonicalIsOlder ? record : canonical;
        const dropId = canonicalIsOlder ? id : canonicalId;

        if (drop.content != null && keep.content == null) {
            keep.content = drop.content;
            keep.subject = drop.subject;
        }
        if (drop.read && !keep.read) {
            keep.read = true;
            keep.readAt = drop.readAt ?? keep.readAt;
        }

        delete messages[dropId];
        canonicalIdByFilename.set(record.filename, keepId);
    }
}

function ensureDarknetAgentRunning(ns) {
    // The dnet API (ns.dnet.*) throws outright without DarkscapeNavigator.exe; don't even
    // attempt to launch the agent until the player has actually purchased it.
    if (!ns.fileExists(DARKNET_ACCESS_PROGRAM, "home")) return;
    if (ns.scriptRunning(DARKNET_AGENT_SCRIPT, "home")) return;
    if (!ns.fileExists(DARKNET_AGENT_SCRIPT, "home")) return;
    ns.exec(DARKNET_AGENT_SCRIPT, "home", 1);
}

function drainCommands(ns, messages) {
    let lastCommand = null;
    while (true) {
        const raw = ns.readPort(MAILBOX_COMMAND_PORT);
        if (raw === "NULL PORT DATA") break;
        const command = String(raw);

        if (command.startsWith("MarkRead:")) {
            const id = decodeURIComponent(command.slice("MarkRead:".length));
            const record = messages[id];
            if (record) {
                record.read = true;
                record.readAt = Date.now();
                lastCommand = { status: "success", message: `Marked as read: ${record.subject}`, timestamp: Date.now() };
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
            }
            continue;
        }
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
    ns.tprint("[MAILBOX] Mailbox Scanner started.");

    const messages = loadState(ns);
    migrateStoredMessages(messages);
    const readerLaunchState = new Map();
    let lastCommand = null;

    while (true) {
        const networkHosts = new Set(discoverNetwork(ns, "home").servers);

        scanHomeFiles(ns, messages);
        scanNetworkForPendingFiles(ns, messages, networkHosts, readerLaunchState);
        ensureDarknetAgentRunning(ns);
        drainFeed(ns, messages, networkHosts);
        dedupeMessagesByFilename(messages);

        const commandResult = drainCommands(ns, messages);
        if (commandResult) lastCommand = commandResult;

        await ns.write(MAILBOX_STATE_JSON, JSON.stringify(buildSnapshot(messages, lastCommand)), "w");
        await ns.sleep(SCAN_INTERVAL_MS);
    }
}
