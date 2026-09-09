import { loadResetFileManifestContributions } from "dashboard/plugins/file-shredder/reset-file-manifest.js";
import { sweepFileShredderResetData } from "dashboard/plugins/file-shredder/file-shredder-sweep.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const sweep = await sweepFileShredderResetData(ns, loadResetFileManifestContributions(ns));
    if (sweep.clearedCount > 0) {
        ns.tprint(`[FILE SHREDDER] Cleared ${sweep.clearedCount} file(s).`);
        ns.toast(`File Shredder: cleared ${sweep.clearedCount} file(s)`, "info", 6000);
    }
}
