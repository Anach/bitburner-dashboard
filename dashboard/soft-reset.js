// Kept separate from the permanent dashboard so the optional Soft Reset control does not add
// Singularity RAM to the UI process. Singularity runs this callback only after the reset finishes.
import { hasApiAccess } from "dashboard/libs/capabilities.js";

const BOOTSTRAP_SCRIPT = "init/init.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    if (!ns.fileExists(BOOTSTRAP_SCRIPT, "home")) {
        ns.toast(`Cannot soft reset: ${BOOTSTRAP_SCRIPT} is missing.`, "error", 6000);
        return;
    }
    if (!hasApiAccess(ns, "singularity")) {
        ns.toast("Cannot soft reset: Source-File 4 (Singularity) is required.", "error", 6000);
        return;
    }
    ns.singularity.softReset(BOOTSTRAP_SCRIPT);
}
