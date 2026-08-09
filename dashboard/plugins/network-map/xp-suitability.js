// Pure formatting helper shared between network-navigator.js (cheap ns.getWeakenTime-based
// estimate) and network-navigator-formulas.js (precise ns.formulas.hacking score, published as a
// raw number for the base script to format via this same function). No ns.* calls of its own, so
// importing it adds no RAM cost to either script - only the actual scoring math differs per tier.
export function formatXpSuitability(server, player, selected, xpPerSecond, suffix = "") {
    const requiredSkill = Number(server.requiredHackingSkill) || 0;
    if (!server.hasAdminRights) return "Blocked · no root";
    if (requiredSkill > (Number(player?.skills?.hacking) || 0)) return `Blocked · requires ${requiredSkill.toLocaleString()} skill`;
    if (!Number.isFinite(xpPerSecond) || xpPerSecond <= 0) return "Eligible · score unavailable";
    const score = xpPerSecond >= 10 ? xpPerSecond.toFixed(1) : xpPerSecond.toFixed(3);
    return `${selected ? "Selected" : "Eligible"} · ${score} XP/s/thread${suffix}`;
}
