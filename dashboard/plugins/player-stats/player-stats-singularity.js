const REFRESH_MS = 1000;
const OUTPUT_PATH = "data/player_status_singularity.json";

function formatWork(task) {
    if (!task || typeof task !== "object") return { label: "Idle", detail: "No focused work" };
    const durationSeconds = Math.max(0, Math.floor((Number(task.cyclesWorked) || 0) / 5));
    const duration = durationSeconds < 60
        ? `${durationSeconds}s`
        : `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
    if (task.type === "COMPANY") return { label: `Company: ${task.companyName}`, detail: `Working ${duration}` };
    if (task.type === "FACTION") return { label: `Faction: ${task.factionName}`, detail: `${task.factionWorkType} · ${duration}` };
    if (task.type === "CLASS") return { label: task.classType, detail: `${task.location} · ${duration}` };
    if (task.type === "CRIME") return { label: `Crime: ${task.crimeType}`, detail: `Active ${duration}` };
    if (task.type === "CREATE_PROGRAM") return { label: `Program: ${task.programName}`, detail: `Creating ${duration}` };
    if (task.type === "GRAFTING") return { label: `Grafting: ${task.augmentation}`, detail: `Active ${duration}` };
    return { label: String(task.type ?? "Working"), detail: duration };
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    while (true) {
        let work;
        try {
            work = formatWork(ns.singularity.getCurrentWork());
        } catch (error) {
            work = { label: "Unavailable", detail: "Singularity req." };
        }
        // Keep generatedAt fresh even while idle. The cheap parent signature-gates its merged
        // output, so this heartbeat does not cause dashboard remounts when the visible work state
        // itself is unchanged.
        await ns.write(OUTPUT_PATH, JSON.stringify({ generatedAt: Date.now(), ...work }), "w");
        await ns.sleep(REFRESH_MS);
    }
}
