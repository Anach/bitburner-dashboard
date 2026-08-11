// Canonical runtime constants for Netscript ports owned by bitburner-dashboard.
//
// Script-owned ports live separately in bitburner-scripts/libs/port-registry.js. Installed
// integration descriptors contribute both sets to the metadata-only Port Registry panel, and the
// scripts repository's validator checks both files as one global port namespace. This keeps the
// dashboard standalone: it never imports runtime constants from the scripts repository.
export const NETWORK_NAVIGATOR_SINGULARITY_COMMAND_PORT = 25; // dashboard/plugins/network-map/network-navigator-singularity.js
export const NETWORK_NAVIGATOR_COMMAND_PORT = 26; // dashboard/plugins/network-map/network-navigator.js
export const MAILBOX_COMMAND_PORT = 27; // dashboard/plugins/mail-client/mail-client-scanner.js (moved from 21 - collided with hacking-engine-buyer.js)
export const MAILBOX_FEED_PORT = 28; // dashboard/plugins/mail-client/mail-client-reader.js (moved from 22 - collided with server-manager.js)
export const EXAMPLE_MONITOR_COMMAND_PORT = 29; // dashboard/examples/example-monitor-integration.js (documentation only, never deployed - moved from 23 for consistency)
