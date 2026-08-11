import { stripLitMarkup } from "dashboard/plugins/mail-client/mail-client-lit-text.js";
import { MAILBOX_FEED_PORT } from "dashboard/libs/port-registry.js";

/** @param {NS} ns */
export async function main(ns) {
    const host = ns.getHostname();
    const files = ns.ls(host).filter((file) => {
        if (file.startsWith("data/")) return false;
        return file.endsWith(".msg") || file.endsWith(".lit") || file.endsWith(".txt");
    });

    for (const filename of files) {
        const type = filename.endsWith(".msg") ? "message" : filename.endsWith(".lit") ? "lore" : "other";
        ns.tryWritePort(MAILBOX_FEED_PORT, {
            source: host,
            filename,
            type,
            content: stripLitMarkup(ns.read(filename)),
            discoveredAt: Date.now(),
        });
    }
}
