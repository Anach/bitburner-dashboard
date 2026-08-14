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

function calculateSkillLevel(experience, multiplier) {
    const mult = Math.max(0.000001, Number(multiplier) || 1);
    return Math.max(1, Math.floor(mult * (32 * Math.log(Math.max(0, Number(experience) || 0) + 534.6) - 200)));
}

function calculateSkillExperience(level, multiplier) {
    const skill = Math.max(1, Math.floor(Number(level) || 1));
    const mult = Math.max(0.000001, Number(multiplier) || 1);
    const baseExperience = Math.exp((skill / mult + 200) / 32) - 534.6;
    if (!Number.isFinite(baseExperience)) return 0;
    let experience = Math.max(0, baseExperience);
    let increment = Math.abs(experience * Number.EPSILON);
    while (calculateSkillLevel(experience, mult) < skill) {
        experience = Math.max(0, baseExperience + increment);
        increment *= 2;
    }
    return experience;
}

// The game computes the real skill level from exp using player.mults[skill] * the BitNode's own
// level multiplier for that skill (Person.ts's gainHackingExp and friends, mirrored by the game's
// own StatsProgressBar.tsx). Omitting the BitNode factor here was the bug: in any BitNode where a
// skill's multiplier isn't 1 (e.g. BN2's HackingLevelMultiplier: 0.8), the level boundaries this
// recomputes land in the wrong place, and the ratio can reach 1 well before the real in-game level
// change - the bar pins at 100% and stays there through part of every level, even though the
// underlying level count (read straight from player.skills, always correct) keeps climbing.
function readSkillProgress(ns, player, skill, bitNodeSkillMultiplier) {
    const level = Math.max(1, Math.floor(Number(player?.skills?.[skill]) || 1));
    const experience = Math.max(0, Number(player?.exp?.[skill]) || 0);
    const multiplier = Math.max(0.000001, (Number(player?.mults?.[skill]) || 1) * (Number(bitNodeSkillMultiplier) || 1));
    const levelStart = calculateSkillExperience(level, multiplier);
    const nextLevel = calculateSkillExperience(level + 1, multiplier);
    const required = Math.max(0, nextLevel - levelStart);
    const earned = Math.max(0, experience - levelStart);
    return {
        ratio: required > 0 ? Math.max(0, Math.min(1, earned / required)) : 1,
        current: Math.floor(earned),
        required: Math.ceil(required),
        nextLevel: level + 1,
    };
}

// The live way to read this is ns.getBitNodeMultipliers() - but that needs Source-File 5, which a
// player in their first BitNode (exactly who most needs an accurate early-game XP bar) will not
// have. So instead of gating this plugin's correctness behind an SF the target audience doesn't
// have yet, the table is reproduced here: it's small, static per-BitNode game-balance data (source:
// bitburner-src/src/BitNode/BitNode.tsx, getBitNodeMultipliers()) that only changes on a deliberate
// game balance patch. BitNodes not listed (1, 4, 5, 8, and anything added in a future game version)
// leave every skill at the default 1x - the same as today's pre-fix behavior, so an unlisted/unknown
// BitNode degrades gracefully rather than guessing. BitNode 12 is excluded and handled specially
// below; its multiplier isn't a fixed constant, it decays with replay count.
const BITNODE_SKILL_MULTIPLIERS = {
    2: { hacking: 0.8 },
    3: { hacking: 0.8 },
    6: { hacking: 0.35 },
    7: { hacking: 0.35 },
    9: { hacking: 0.5, strength: 0.45, defense: 0.45, dexterity: 0.45, agility: 0.45, charisma: 0.45 },
    10: { hacking: 0.35, strength: 0.4, defense: 0.4, dexterity: 0.4, agility: 0.4, charisma: 0.4 },
    11: { hacking: 0.6 },
    13: { hacking: 0.25, strength: 0.7, defense: 0.7, dexterity: 0.7, agility: 0.7, charisma: 0.7 },
    14: { hacking: 0.4, strength: 0.5, defense: 0.5, dexterity: 0.5, agility: 0.5 },
    15: { hacking: 0.6, strength: 0.7, defense: 0.7, dexterity: 0.7, agility: 0.7, charisma: 1.1 },
};

// BitNode 12 ("The Recursion") scales every skill multiplier down by 1.02^lvl on each replay, where
// lvl is that BitNode's own owned Source-File level + 1 (BitNode.tsx: `dec = 1 / Math.pow(1.02,
// lvl)`). ownedSF is available unconditionally from ns.getResetInfo(), so this needs no extra access.
function resolveBitNode12SkillMultiplier(ownedSF) {
    const level = (Number(ownedSF?.get?.(12)) || 0) + 1;
    return 1 / Math.pow(1.02, level);
}

// ns.getResetInfo() is a flat 1GB with no SF gate, unlike ns.getBitNodeMultipliers()'s flat 4GB
// behind Source-File 5 - resolved once since a BitNode's multipliers cannot change mid-run, and this
// daemon restarts on every reset anyway.
function resolveBitNodeSkillMultipliers(ns) {
    try {
        const resetInfo = ns.getResetInfo();
        const bitNodeN = Number(resetInfo?.currentNode);
        if (bitNodeN === 12) {
            const mult = resolveBitNode12SkillMultiplier(resetInfo?.ownedSF);
            return { hacking: mult, strength: mult, defense: mult, dexterity: mult, agility: mult, charisma: mult };
        }
        return { ...BITNODE_SKILL_MULTIPLIERS[bitNodeN] };
    } catch (error) {
        return {};
    }
}

export function buildPlayerStatus(ns, bitNodeSkillMultipliers = {}) {
    const player = ns.getPlayer();
    const work = readCurrentWork(ns);
    const skills = player?.skills ?? {};
    const hp = player?.hp ?? {};
    const hackingProgress = readSkillProgress(ns, player, "hacking", bitNodeSkillMultipliers.hacking);
    const strengthProgress = readSkillProgress(ns, player, "strength", bitNodeSkillMultipliers.strength);
    const defenseProgress = readSkillProgress(ns, player, "defense", bitNodeSkillMultipliers.defense);
    const dexterityProgress = readSkillProgress(ns, player, "dexterity", bitNodeSkillMultipliers.dexterity);
    const agilityProgress = readSkillProgress(ns, player, "agility", bitNodeSkillMultipliers.agility);
    const charismaProgress = readSkillProgress(ns, player, "charisma", bitNodeSkillMultipliers.charisma);
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
    const bitNodeSkillMultipliers = resolveBitNodeSkillMultipliers(ns);
    let lastStatusSignature = "";
    while (true) {
        const status = buildPlayerStatus(ns, bitNodeSkillMultipliers);
        // Excludes generatedAt from the comparison - it always differs, which would defeat the
        // point. HP/money/XP genuinely change almost every tick during active play, so this
        // mostly helps during idle/AFK stretches, but it's the same signature-gating pattern
        // applied to network-navigator.js and keeps this daemon from forcing a dashboard-wide
        // remount (see the Network Map remount-race note above) when nothing actually moved.
        const statusSignature = JSON.stringify(status, (key, value) => key === "generatedAt" ? undefined : value);
        if (statusSignature !== lastStatusSignature) {
            await ns.write(PLAYER_STATUS_PATH, JSON.stringify(status), "w");
            lastStatusSignature = statusSignature;
        }
        await ns.sleep(REFRESH_MS);
    }
}
