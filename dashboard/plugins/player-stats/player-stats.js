export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": true
};

const REFRESH_MS = 1000;
const PLAYER_STATUS_PATH = "data/player_status.json";

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

function readCurrentWork(ns) {
    try {
        return formatWork(ns.singularity.getCurrentWork());
    } catch (error) {
        return { label: "Unavailable", detail: "Singularity req." };
    }
}

function readSkillProgress(ns, player, skill) {
    const level = Math.max(1, Math.floor(Number(player?.skills?.[skill]) || 1));
    const experience = Math.max(0, Number(player?.exp?.[skill]) || 0);
    const multiplier = Math.max(0.000001, Number(player?.mults?.[skill]) || 1);
    try {
        const levelStart = Number(ns.formulas.skills.calculateExp(level, multiplier));
        const nextLevel = Number(ns.formulas.skills.calculateExp(level + 1, multiplier));
        const required = Math.max(0, nextLevel - levelStart);
        const earned = Math.max(0, experience - levelStart);
        return {
            ratio: required > 0 ? Math.max(0, Math.min(1, earned / required)) : 1,
            current: Math.floor(earned),
            required: Math.ceil(required),
            nextLevel: level + 1,
        };
    } catch (error) {
        return null;
    }
}

export function buildPlayerStatus(ns) {
    const player = ns.getPlayer();
    const work = readCurrentWork(ns);
    const skills = player?.skills ?? {};
    const hp = player?.hp ?? {};
    const hackingProgress = readSkillProgress(ns, player, "hacking");
    const strengthProgress = readSkillProgress(ns, player, "strength");
    const defenseProgress = readSkillProgress(ns, player, "defense");
    const dexterityProgress = readSkillProgress(ns, player, "dexterity");
    const agilityProgress = readSkillProgress(ns, player, "agility");
    const charismaProgress = readSkillProgress(ns, player, "charisma");
    const intelligenceProgress = readSkillProgress(ns, player, "intelligence");
    return {
        generatedAt: Date.now(),
        hp: `${Math.floor(Number(hp.current) || 0)} / ${Math.floor(Number(hp.max) || 0)}`,
        money: Number(player?.money) || 0,
        hacking: Math.floor(Number(skills.hacking) || 0),
        ...(hackingProgress ? { hackingProgress } : {}),
        strength: Math.floor(Number(skills.strength) || 0),
        ...(strengthProgress ? { strengthProgress } : {}),
        defense: Math.floor(Number(skills.defense) || 0),
        ...(defenseProgress ? { defenseProgress } : {}),
        dexterity: Math.floor(Number(skills.dexterity) || 0),
        ...(dexterityProgress ? { dexterityProgress } : {}),
        agility: Math.floor(Number(skills.agility) || 0),
        ...(agilityProgress ? { agilityProgress } : {}),
        charisma: Math.floor(Number(skills.charisma) || 0),
        ...(charismaProgress ? { charismaProgress } : {}),
        intelligence: Math.floor(Number(skills.intelligence) || 0),
        ...(intelligenceProgress ? { intelligenceProgress } : {}),
        city: String(player?.city ?? "Unknown"),
        location: String(player?.location ?? "Unknown"),
        work: work.label,
        workDetail: work.detail,
        karma: Number(player?.karma) || 0,
        kills: Math.floor(Number(player?.numPeopleKilled) || 0),
        factions: Array.isArray(player?.factions) ? player.factions.length : 0,
        jobs: player?.jobs && typeof player.jobs === "object" ? Object.keys(player.jobs).length : 0,
    };
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tprint("[PLAYER] Player status telemetry started.");
    ns.print("[LIFECYCLE] Player status telemetry started.");
    while (true) {
        await ns.write(PLAYER_STATUS_PATH, JSON.stringify(buildPlayerStatus(ns)), "w");
        await ns.sleep(REFRESH_MS);
    }
}
