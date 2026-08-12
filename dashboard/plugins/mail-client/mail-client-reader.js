import { stripLitMarkup } from "dashboard/plugins/mail-client/mail-client-lit-text.js";
import { isMailboxCandidate } from "dashboard/plugins/mail-client/mail-client-files.js";
import { MAILBOX_FEED_PORT } from "dashboard/libs/port-registry.js";

/** @param {NS} ns */
export async function main(ns) {
    const host = ns.getHostname();
    const files = ns.ls(host).filter(isMailboxCandidate);

    for (const filename of files) {
        const comparable = filename.toLowerCase();
        const type = comparable.endsWith(".msg") ? "message" : comparable.endsWith(".lit") ? "lore" : "other";
        ns.tryWritePort(MAILBOX_FEED_PORT, {
            source: host,
            filename,
            type,
            content: stripLitMarkup(ns.read(filename)),
            discoveredAt: Date.now(),
        });
    }
}
