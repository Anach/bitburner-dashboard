// Example: Meta-Orchestrator Startup Optimizer service allowlist.
//
// This file is documentation only - like example-monitor-integration.js, nothing in this dashboard
// ever loads anything from dashboard/examples/ (isDashboardPluginDescriptorFilename only matches
// dashboard/integrations/*.js and dashboard/plugins/<name>/<file>.js; EXCLUDED_RUNTIME_FOLDERS
// excludes everything under dashboard/ from the service launcher). It exists purely to show what to
// build if you're standing up your own companion "scripts" repo for this dashboard.
//
// dashboard/service-supervisor.js's Startup Optimizer nudge feature reads a small, checked-in
// (not runtime-generated) config listing every serviceId a proposal-driven adviser is allowed to
// move earlier in the service start order. It looks for this at exactly:
//
//   dashboard/service-startup-optimizer-services.json
//
// ...in whichever repo/folder is staged alongside this dashboard as "home" - NOT as a .js file, and
// NOT under data/ (this is static configuration you author once, not telemetry a script writes).
// If that file is missing, malformed, or empty, Service Supervisor simply treats nothing as eligible
// for startup optimization - the feature stays inert rather than the dashboard failing to load, so a
// standalone install of this dashboard works fine without ever creating this file at all.
//
// The real file is plain JSON, shaped exactly like this (the serviceIds you list here must be real
// serviceIds your own dashboard/integrations/*-integration.js descriptors declare):
//
// {
//     "serviceIds": [
//         "example.yourAdviserManagedServiceOne",
//         "example.yourAdviserManagedServiceTwo"
//     ]
// }
//
// This .js wrapper exists only so the example can carry the explanation above as real comments -
// JSON itself has no comment syntax. Copy the object below into your own
// dashboard/service-startup-optimizer-services.json, replacing the placeholder IDs with your real
// ones.
export const EXAMPLE_STARTUP_OPTIMIZER_SERVICES_CONFIG = {
    "serviceIds": [
        "example.yourAdviserManagedServiceOne",
        "example.yourAdviserManagedServiceTwo"
    ]
};
