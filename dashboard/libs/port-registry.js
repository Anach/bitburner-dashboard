// Single canonical source of truth for every Netscript port number used for control/telemetry IPC
// across BOTH repos (bitburner-scripts and bitburner-dashboard deploy into the same "home"
// filesystem, so their ports share one global namespace even though the two repos are developed
// independently). A script that needs a port imports its own constant from here rather than
// declaring a local literal - that's what makes a collision like GANG_COMMAND_PORT vs the old
// network-navigator.js COMMAND_PORT (both 20, confirmed to have silently discarded gang equipment
// spending-cap commands for a long time before being found) show up as a duplicate value in one
// file instead of two independent, invisible-to-each-other declarations.
//
// See docs/PORT_MAP.md (bitburner-scripts repo) for the human-readable version of this same table,
// including which descriptor(s) reference each port and why.
//
// bitburner-scripts/*
// EXCEPTION: automation/ipvgo-bot/ipvgo-bot.js cannot import this constant (or anything else) - it
// reads its own source via ns.getScriptName() and slices everything above a "//End Of Worker"
// marker into a Web Worker (new Worker(url)), a classic non-module worker that throws "Cannot use
// import statement outside a module" the instant it hits a top-level import. That file keeps its
// port number (15, matching this entry) as a plain inline literal - confirmed real, don't "fix" it.
export const IPVGO_LITE_COMMAND_PORT = 15; // automation/ipvgo-bot/ipvgo-bot.js
export const SERVER_BUYER_CLOUD_COMMAND_PORT = 16; // hardware/server-manager/server-manager-cloud.js
export const SERVER_BUYER_HACKNET_COMMAND_PORT = 17; // hardware/server-manager/server-manager-hacknet.js
export const CLOUD_PROFIT_EVENT_PORT = 18; // written by hacking/hacking-ops/profiles/hacking-ops-money.js, drained by reports/infrastructure-report/infrastructure-report.js
export const BATCHER_CONTROL_PORT = 19; // hacking/hacking-ops/hacking-ops.js
export const GANG_COMMAND_PORT = 20; // affiliations/faction-manager/faction-manager-gangs.js
export const HACKER_BUYER_COMMAND_PORT = 21; // hacking/hacking-engine/hacking-engine-buyer.js
export const SERVER_BUYER_CORE_COMMAND_PORT = 22; // hardware/server-manager/server-manager.js
export const FACTION_BOOST_COMMAND_PORT = 23; // affiliations/faction-manager/faction-manager-boost.js
export const BATCHER_BEGINNER_COMMAND_PORT = 24; // hacking/hacking-ops/profiles/hacking-ops-beginner.js
export const STOCK_TRADER_COMMAND_PORT = 30; // finances/trading-engine/trading-engine.js

// bitburner-dashboard/*
export const NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT = 25; // dashboard/plugins/network-map/network-navigator-singularity.js
export const NETWORK_NAVIGATOR_COMMAND_PORT = 26; // dashboard/plugins/network-map/network-navigator.js
export const MAILBOX_COMMAND_PORT = 27; // dashboard/plugins/mail-client/mail-client-scanner.js (moved from 21 - collided with hacking-engine-buyer.js)
export const MAILBOX_FEED_PORT = 28; // dashboard/plugins/mail-client/mail-client-reader.js (moved from 22 - collided with server-manager.js)
export const EXAMPLE_MONITOR_COMMAND_PORT = 29; // dashboard/examples/example-monitor-integration.js (documentation only, never deployed - moved from 23 for consistency)

// UI-facing metadata for the dashboard's Port Registry table. Port values deliberately reference
// the constants above rather than repeating numeric literals, keeping this view on the same source
// of truth as the scripts that actually read and write each port.
export const PORT_REGISTRY_ENTRIES = Object.freeze([
    { port: IPVGO_LITE_COMMAND_PORT, constant: "IPVGO_LITE_COMMAND_PORT", service: "IPvGO Bot", channel: "Command", repo: "scripts", owner: "automation/ipvgo-bot/ipvgo-bot.js" },
    { port: SERVER_BUYER_CLOUD_COMMAND_PORT, constant: "SERVER_BUYER_CLOUD_COMMAND_PORT", service: "Server Manager — Cloud", channel: "Command", repo: "scripts", owner: "hardware/server-manager/server-manager-cloud.js" },
    { port: SERVER_BUYER_HACKNET_COMMAND_PORT, constant: "SERVER_BUYER_HACKNET_COMMAND_PORT", service: "Server Manager — Hacknet", channel: "Command", repo: "scripts", owner: "hardware/server-manager/server-manager-hacknet.js" },
    { port: CLOUD_PROFIT_EVENT_PORT, constant: "CLOUD_PROFIT_EVENT_PORT", service: "Cloud Profit Events", channel: "Event feed", repo: "scripts", owner: "hacking/hacking-ops/profiles/hacking-ops-money.js → reports/infrastructure-report/infrastructure-report.js" },
    { port: BATCHER_CONTROL_PORT, constant: "BATCHER_CONTROL_PORT", service: "Hacking Operations", channel: "Control", repo: "scripts", owner: "hacking/hacking-ops/hacking-ops.js" },
    { port: GANG_COMMAND_PORT, constant: "GANG_COMMAND_PORT", service: "Faction Manager — Gang", channel: "Command", repo: "scripts", owner: "affiliations/faction-manager/faction-manager-gangs.js" },
    { port: HACKER_BUYER_COMMAND_PORT, constant: "HACKER_BUYER_COMMAND_PORT", service: "Hacking Engine — Buyer", channel: "Command", repo: "scripts", owner: "hacking/hacking-engine/hacking-engine-buyer.js" },
    { port: SERVER_BUYER_CORE_COMMAND_PORT, constant: "SERVER_BUYER_CORE_COMMAND_PORT", service: "Server Manager — Core", channel: "Command", repo: "scripts", owner: "hardware/server-manager/server-manager.js" },
    { port: FACTION_BOOST_COMMAND_PORT, constant: "FACTION_BOOST_COMMAND_PORT", service: "Faction Manager — Boost", channel: "Command", repo: "scripts", owner: "affiliations/faction-manager/faction-manager-boost.js" },
    { port: BATCHER_BEGINNER_COMMAND_PORT, constant: "BATCHER_BEGINNER_COMMAND_PORT", service: "Hacking Operations — Beginner", channel: "Command", repo: "scripts", owner: "hacking/hacking-ops/profiles/hacking-ops-beginner.js" },
    { port: NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT, constant: "NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT", service: "Network Navigator — Singularity", channel: "Command", repo: "dashboard", owner: "dashboard/plugins/network-map/network-navigator-singularity.js" },
    { port: NETWORK_NAVIGATOR_COMMAND_PORT, constant: "NETWORK_NAVIGATOR_COMMAND_PORT", service: "Network Navigator", channel: "Command", repo: "dashboard", owner: "dashboard/plugins/network-map/network-navigator.js" },
    { port: MAILBOX_COMMAND_PORT, constant: "MAILBOX_COMMAND_PORT", service: "Mail Client Scanner", channel: "Command", repo: "dashboard", owner: "dashboard/plugins/mail-client/mail-client-scanner.js" },
    { port: MAILBOX_FEED_PORT, constant: "MAILBOX_FEED_PORT", service: "Mail Client Reader", channel: "Internal feed", repo: "dashboard", owner: "mail-client-darknet-agent.js / mail-client-scanner.js → mail-client-reader.js" },
    { port: EXAMPLE_MONITOR_COMMAND_PORT, constant: "EXAMPLE_MONITOR_COMMAND_PORT", service: "Example Monitor", channel: "Example", repo: "dashboard", owner: "dashboard/examples/example-monitor-integration.js" },
    { port: STOCK_TRADER_COMMAND_PORT, constant: "STOCK_TRADER_COMMAND_PORT", service: "Trading Engine", channel: "Command", repo: "scripts", owner: "finances/trading-engine/trading-engine.js" },
]);

export const NEXT_FREE_PORT = Math.max(...PORT_REGISTRY_ENTRIES.map((entry) => entry.port)) + 1;
