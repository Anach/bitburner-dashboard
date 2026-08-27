# Changelog

Notable changes to the Bitburner Automation Dashboard, newest first.

This project became publicly available on 2026-08-12, around 11:00. Commits before that point are
development history from before anyone could build against the framework, and are not listed here —
the log starts where compatibility starts mattering.

Entries marked **contract** change something a plugin descriptor or runtime depends on. Metadata and
view schemas are still beta contracts, so review those entries before updating an existing
integration.

## 2026-08-27

### Fixed

- **A fully-stopped daemon and a running service with a merely-blocked network child both showed the
  same yellow "!" and yellow highlight, even though the left-menu dot already colors them
  differently (red vs green+badge)** - once "warn" started meaning "a network child is stuck/blocked
  while the parent runs fine" (see below), reusing "warn" for "this daemon isn't running at all"
  became actively misleading, not just imprecise: a red-dot/yellow-badge service looked identical at
  the badge/border level to a green-dot/yellow-badge one. `script-plugin.js`'s and
  `plugin-integration.js`'s `getHealth` both had the same `level = running || !daemon ? "neutral" :
  "warn"` line - changed to `"danger"`, matching the dot's own red for this exact case. A service
  that's merely on-demand and currently idle (`!daemon`) is unaffected and stays `"neutral"`, as
  before - only "should be running but isn't" escalates.

- **A service whose sub-widget panels never declare `runtimeScript`/`runtimeScripts` never showed
  the network-child "!" badge on any of its own panels, only on the left-menu item** - reported
  against Augment Manager (`"status"`/`"buy"` panels, neither declares a runtime script; its sole
  child `augment-manager-shop.js` is only visible via `pluginMetadata.managedNetworkScripts`). The
  same gap affects Corp Manager, Contract Solver, and any panel on any service that doesn't declare
  its own specific mapping. Root cause: `getServiceHealth()` (`dashboard/automation-dashboard.jsx`)
  already merged the network-child contribution into the top-level `level`/`summary`, but never
  propagated it into `panels`/`panelSummaries` - those stayed exactly as the adapter factory computed
  them pre-merge, which for a panel with no runtime script is just the whole-service Home-only
  running check. Fixed by having the merge step also walk every panel key in `panels` and, for any
  panel whose descriptor entry has neither `runtimeScript` nor `runtimeScripts`, fold in the same
  contribution via `moreSevereHealthLevel()` - a panel that *does* declare its own mapping is left
  alone since it already has a more precise, specific answer. No descriptor changes needed anywhere;
  this activates correctly for every service already declaring `managedNetworkScripts` today.

### Added

- **A `*Worker.status`/`*WorkerStatus`-style telemetry field can now declare `"tone":
  "networkChildStatus"` to color itself by what its own value actually means, instead of a fixed
  static tone.** These fields mirror a `network-child-supervisor` status string verbatim (e.g.
  `"waiting-for-ram"`), and every one of them across both repos was previously declared with a fixed
  `"tone": "info"` regardless of value - a worker stuck waiting for RAM read in the exact same color
  as one running fine. `dashboard/libs/plugin-integration.js`'s `buildPluginIntegrationTelemetryLine`
  gained a new tone-keyword branch (alongside the existing `"warnWhenPositive"`/`"signed"` numeric
  ones) that resolves to `"success"` for `"running"`, `"neutral"` for the rest of the healthy
  allowlist (`"completed"`/`"cancelled"`/`"owner-stopped"`), and `"warn"` for anything else -
  reusing the same `NETWORK_CHILD_HEALTHY_STATUSES` set the panel/menu health checks already use, so
  there's exactly one place that defines what counts as a blocked worker.
  - **This surfaced a second, wider gap**: `BadgeLine` (`dashboard/renderers/dashboard-panels.jsx`),
    the shared component every status-line value in the dashboard renders through, only ever used
    `tone` to tint the row's *border* - the value text itself was always the same fixed green
    (`styles.itemDetail`'s `#9ddb9d`) no matter the tone, so even a `"warn"`-toned line never actually
    read as a warning in its own text. New `BADGE_LINE_VALUE_TONE_COLORS` map
    (`success`/`warn`/`danger`, matching the same hues this component already borders itself with and
    every other warn surface in the dashboard uses) now colors the value text too when its tone is
    one of those three; neutral-toned lines are unchanged. This affects every `BadgeLine` in the
    dashboard, not just the new `networkChildStatus` fields - any existing `"warn"`/`"danger"`-toned
    status line now reads as yellow/red text as well as a tinted border, which is the intended,
    consistent completion of a tone system that already meant "pay attention" everywhere else
    (badges, buttons) except here.
  - See the paired `bitburner-scripts` repo's changelog for which 12 fields across 6 integrations
    were switched to the new tone keyword.
  - No RAM change (confirmed via the estimator on all three edited files - pure control-flow/lookup
    and JSX styling, no new `ns.*` calls).

- **contract — Sub-widget panel buttons now show which specific network child is unhealthy, instead
  of every panel mirroring the whole service's badge identically.** Follow-up to the menu-level
  indicator below, after feedback that a service with multiple children (Server Manager: Cloud/
  Hacknet/Home; Faction Manager: Core/Gangs/Gang Bootstrap/Boost) showed the same "!" on every
  sub-widget button regardless of which specific child was the actual problem.
  - `dashboard/libs/plugin-integration.js` gained two exports:
    `getNetworkChildScriptStatus(scriptPath, networkChildStatus)` (single source of truth for "is
    this script path healthy," looked up by `entry.script` in `data/network_child_status.json` - no
    requestId-naming convention relied on) and `getScriptGroupHealth(scripts, homeScripts,
    networkChildStatus)`, which checks a list of script paths and returns `"warn"` only when at
    least one has positive evidence of a problem (found, on Home or via a network-child status
    entry, and not in the healthy allowlist `running`/`completed`/`cancelled`/`owner-stopped`) - an
    entry that's simply never been requested is treated as neutral, not warn, since that's the
    common case for a disabled optional feature, not evidence of failure.
  - A panel's descriptor entry can now declare `"runtimeScript": "path.js"` (existing, previously
    only implemented in the `"metadata"` adapter) or the new `"runtimeScripts": ["a.js", "b.js"]`
    for a panel that represents more than one child. `plugin-integration.js`'s
    `buildPluginIntegrationService` (the `"metadata"` adapter) had this partially built already but
    only checked `homeScripts`, which would always report "stopped" for any since-migrated network
    child; `dashboard/libs/script-plugin.js`'s `buildScriptPluginService` (the `"script"` adapter -
    used by every current multi-child service) had no per-panel mechanism at all and blanket-applied
    the whole-service level to every panel, which was the actual bug in the screenshot. Both now
    share the same `getScriptGroupHealth` logic.
  - **This also fixes a real, previously-dead bug**: `hacking-engine-integration.js` already
    declared `"runtimeScript"` on its "Buyer" and "BDRouter" panels, but since Hacking Engine uses
    the `"script"` adapter, that field was never read by anything - and even if it had been, the
    Home-only check would have permanently misreported both panels as "stopped" now that Buyer/
    BDRouter run as network children. Both bugs are fixed by the same change; no descriptor edit
    needed for Hacking Engine.
  - Content rollout: `server-manager-integration.js`'s 7 panels now declare `runtimeScript` grouped
    by which of its 3 children each represents (`home` → the Home-upgrade worker; `status`/`graphs`/
    `servers` → the Cloud buyer; `hacknet`/`hacknet-graphs`/`hacknet-servers` → the Hacknet buyer).
    `faction-manager-integration.js`'s 5 panels now declare `runtimeScript(s)` matching its actual
    existing telemetry layout (confirmed against the descriptor's own `telemetry.fields[].panelId`
    assignments, not guessed from panel labels): `status` already surfaces Core's, Gang Bootstrap's,
    *and* Boost's worker fields together, so it gets all three as `runtimeScripts`; `graphs` is
    specifically Boost's own reputation-boost-over-time history graph (`sourceKey: "boost.history"`),
    not Core's, so it gets only Boost; `gang-status`/`gang-members`/`gang-graphs` get only Gangs.
    Corp Manager, Augment Manager, and Contract Solver have exactly one panel each and were left
    alone - a single panel is already fully precise via the existing top-level signal. Progression
    Report's one network child doesn't map cleanly onto any of its 14 existing panels and was
    deliberately left for a dedicated content-authoring pass rather than bundling in a guess.
  - No RAM change anywhere (confirmed via the estimator, before/after each file: `automation-
    dashboard.jsx` 9.30 GB, `plugin-integration.js` 1.70 GB, `script-plugin.js` 1.60 GB, all
    unchanged) - pure control-flow/lookup logic, no new `ns.*` calls.

- **The left-menu health indicator now flags a service whose declared network child isn't healthy,
  even while its parent daemon is running fine** (`dashboard/automation-dashboard.jsx`). Since the
  network-child-supervisor migrations (see the paired `bitburner-scripts` repo's changelog for the
  dozen "Offload X to network RAM" commits), a parent's own running/not-running dot no longer tells
  the whole story - the parent can be alive while its dispatched worker is stuck waiting for RAM,
  crashed, or simply missing, and the only way to see that used to be opening that service's own
  Status panel and reading its worker fields one at a time.
  This is a fully generic addition to the existing health-badge pipeline, not new UI: every
  service's `getServiceHealth()` result already flows into the left-menu "!"/"!!" badge
  (`renderHealthBadge`), the per-item hover tooltip (`getServiceItemTooltip`, which already prints
  `Level: ...\n<summary>`), and the Danger/Warn/Healthy counters/filter - none of that changed. What
  changed is the *input*: a new `getNetworkChildHealthContribution(service, context)` runs for any
  service whose descriptor declares a non-empty `pluginMetadata.managedNetworkScripts` (already a
  flat array of script path strings in every current descriptor - no descriptor changes needed
  anywhere, in either repo). It skips entirely if the parent isn't running (the existing per-service
  `getHealth` already reports that case, so there's no double-warn), then looks up each declared
  script path against a newly-read `data/network_child_status.json` (`entry.script` already holds
  the same path string, so matching needs no requestId-naming convention). A declared path with no
  matching entry at all is silently ignored - that covers the older, multi-host-clone-style
  `managedNetworkScripts` entries that predate the network-child-supervisor and never publish a
  status entry (Hacking Ops' payloads, IPvGO's `nsproxy.js`, Faction Manager's
  `faction-manager-share-loop.js`). Any matched entry whose `status` isn't in the benign allowlist
  (`running`/`completed`/`cancelled`/`owner-stopped`) contributes `"warn"`, merged with (not
  replacing) the service's own existing health level via a new `moreSevereHealthLevel()` rank helper,
  since a framework service's own RAM/script-bucket health is an unrelated concern that must still
  surface. New `getNetworkChildStatusSnapshot(ns)` reads and caches the status file the same way
  `getHomeRamStatus()` already caches Home RAM - reusing the last parsed value (by comparing the
  `generatedAt`-stripped `children` content, not object identity) so the supervisor's own ~5s
  heartbeat rewrite of that file doesn't force a dashboard re-render every 5 seconds regardless of
  whether anything actually changed; a 30s staleness cutoff avoids confidently reporting from data
  the supervisor hasn't touched in a while (e.g. right after a dashboard restart). No RAM change -
  confirmed via the estimator (9.30 GB unchanged before/after) since `ns.fileExists`/`ns.read` were
  already called directly elsewhere in this same file.

## 2026-08-26

### Added

- **contract — Network Navigator's map can now hide Hacknet servers, alongside the existing Cloud
  servers toggle** (`dashboard/plugins/network-map/network-navigator.js`,
  `dashboard/plugins/network-map/network-view.js`, `dashboard/renderers/network-map-view.jsx`). The
  previous mechanism only had room for one such toggle, hardcoded end-to-end as "cloud"
  (`filters.showCloudDefault`/`cloudLabel`, `modeSelector.cloudKey`, a single `showCloud` React
  state) - adding a second category meant either duplicating that whole chain or generalizing it, so
  the `network-map` view schema (a documented, third-party-usable renderer) now declares
  `filters.visibilityToggles`, an array of `{ id, label, fieldKey, defaultShown }` entries instead of
  the single hardcoded slot; `modeSelector.cloudKey` is renamed `modeSelector.visibilityTogglesKey`
  and the per-mode gate field it points at is renamed `showCloud` -> `showVisibilityToggles` (still a
  single boolean per mode - city views hide every visibility toggle at once, exactly as before, just
  no longer only the one). The renderer's own state generalizes the same way: one `showCloud` boolean
  became a `visibilityToggleState` object keyed by each declared toggle's `id`, one hardcoded button
  became a loop over `filterConfig.visibilityToggles`, and the fit-on-toggle effect now keys off a
  compact fingerprint string of every toggle's state (`visibilityToggleStateKey`) instead of a single
  `previousShowCloudRef`. Network Navigator declares both toggles today
  (`{ id: "cloud", fieldKey: "cloud" }`, `{ id: "hacknet", fieldKey: "hacknet" }`); a third-party
  plugin using the same `network-map` renderer can declare any number of its own.
  Detecting a Hacknet server needed its own fix: Bitburner exposes no NS-level flag for it
  (`ns.getServer()` returns the same shape for a Hacknet Server as a normal one) - the reliable
  signal is the engine-reserved hostname prefix (`hacknet-server-`/`hacknet-node-`, confirmed against
  `bitburner-src`, which refuses to let any normal or purchased server collide with either). New
  `isHacknetServerHostname()` in `network-navigator.js` tags each node's `hacknet` field with it.
  While there, fixed a related double-count: the "Rooted normal-network fleet" RAM tally already
  excluded home and cloud/purchased servers because they have their own dedicated Capacity gauges
  (`hardware.home:ram`, `serverBuyer:cloud-ram`) - it was still counting Hacknet servers into that
  same total despite `reports.infrastructure:hacknet-ram` already covering them. No RAM change on
  `network-navigator.js` (8.20 GB, unchanged - the new hostname check is pure string comparison, no
  new `ns.*` call) or on the renderer (0 `ns.*` surface either way, pure React state/control-flow).

- **contract — Service Supervisor now publishes one shared capability snapshot before admitting
  managed services.** `dashboard/libs/capabilities.js` exposes the normalized
  `data/dashboard_capabilities.json` contract plus a freshness-checked reader. Lightweight
  launchers can consume an API boolean without each retaining its own `ns.getResetInfo()` call;
  missing, stale, or incomplete snapshots fail closed with a distinct waiting state. The paired
  scripts repository migrates Corp Manager, Faction Manager, Server Manager, Augment Manager, and
  Hacking Engine, while bundled Network Navigator is the sixth consumer—an exact 6.00 GB combined
  steady-state saving.

- **Network Navigator now runs navigation and city actions in specialized one-shot network
  workers.** Port 25, command names, and result telemetry remain unchanged. The persistent
  Singularity child now owns only company reputation/favor telemetry (3.70 GB at SF4.3; 33.70 GB at
  SF4.1). Connect/route actions briefly use 3.80/33.80 GB, while travel/open-location/company-work
  actions briefly use 12.10/162.10 GB and release it immediately. Actions queue serially and expose
  the network-child supervisor's waiting-for-RAM feedback instead of silently failing.

- **Optional current-work focus follows the dashboard window state.** Dashboard Options now includes
  a default-off **Focus current work when maximized** setting for Source-File 4 saves. When enabled,
  maximizing the dashboard focuses the active task; restoring to windowed mode or minimizing returns
  it to background mode. A one-shot `dashboard/current-work-focus.js` helper owns the Singularity
  call and exits immediately, so it consumes RAM only during a transition. Leaving the option off
  launches no helper; disabling it after the feature focused a task performs one final background
  transition and then becomes dormant. The dashboard remains 9.30 GB, while the helper measures
  3.20 GB at SF4.1 and 1.70 GB at SF4.3.

## 2026-08-25

### Added

- **contract** — **New Network Child Supervisor: any script can now request that a companion worker
  run somewhere else on the network instead of always on Home.** Previously every "temporary
  disposable worker" pattern in the paired `bitburner-scripts` repo (`ensureTemporaryHomeScripts`)
  only ever launched on Home, so Home's free RAM was the hard ceiling for how many Singularity-heavy
  workers could run at once, no matter how much RAM sat idle across the rest of the network.
  - **`dashboard/libs/network-child-request.js`** (new, 1.70 GB) — the request-side API a script
    calls to declare a desired child: `publishNetworkChildRequest(ns, request)` writes a normalized
    request file (`data/network-child-requests/<id>.json`, `normalizeNetworkChildRequest()` validates
    `id`/`script`/`ownerScript`, fills in `dependencies`/`inputFiles`/`outputFiles`/`lifecycle`
    (`"one-shot"` or `"persistent"`)/`preferRemote` (defaults `true`)/`reserveRamGb`/`label`, and an
    `expiresAt` from a default 15s TTL); `cancelNetworkChildRequest()` publishes the same request with
    `desired: false`; `readNetworkChildStatus(ns, id)` reads back that child's live status. Requests
    are a lease, not a one-time launch — the owner must keep re-publishing on its own cadence or the
    request expires and the supervisor tears the child down automatically.
  - **`dashboard/libs/network-child-supervisor.js`** (new, 5.55 GB) — the reconciler, launched
    on-demand by `service-supervisor.js` whenever a request file is pending. Picks a host via
    `getCandidateHosts()` (sorts by a `preferRemote`-driven Home penalty, then most free RAM, then
    hostname), `scp`s the worker and its declared `dependencies` there, launches it, and republishes
    an aggregate status file (`data/network_child_status.json`, throttled to one write per 5s unless
    forced) that `readNetworkChildStatus()` reads back. For `lifecycle: "persistent"` children it also
    syncs `inputFiles` from Home to the remote host and `outputFiles` back from the remote host to
    Home every reconcile pass, so a remotely-running worker's dashboard-options/telemetry files stay
    live on Home exactly as if it had run there.
  - **`dashboard/service-supervisor.js`** — main loop restructured around two independent cadences: a
    new `queueNetworkChildReconciliation()` check runs every `NETWORK_CHILD_RECONCILE_INTERVAL_MS`
    (1000ms) and launches the supervisor above only when a request file actually needs attention
    (`ns.run(..., {preventDuplicates: true})`), while the original service-scan/autostart logic keeps
    its existing `SUPERVISOR_INTERVAL_MS` (30000ms) cadence via a new `nextServiceReconcileAt` gate —
    network-child leases needed a much tighter loop than full service reconciliation ever did.
  - **`dashboard/libs/dashboard-ram-settings.js`** (new) — fixes a real latent bug surfaced by making
    `reservedHomeRam` load-bearing for the first time: it used to default to a purely decorative
    `1024` GB (displayed but never enforced anywhere). `resolveReservedHomeRamSetting()` uses a new
    `dashboardRamOptionsSchemaVersion` marker to tell a stale inherited `1024` apart from a deliberate
    user choice of exactly `1024` now that the value actually gates candidate-host selection —
    without it, every existing save would have silently reserved 1024 GB of Home RAM the instant this
    shipped. `dashboard-options.js`'s `normalizeDashboardRamSetting` moved into this file and is
    re-exported for compatibility.
  - **Host-rename and output-safety hardening**, two fast follow-up fixes once real Cloud-purchased
    workers started using this: the Cloud buyer can rename its own host mid-run, so
    `syncOutputFilesToHome()`'s `ns.fileExists(file, host)` check now lives *inside* the try/catch
    rather than assuming a previously-tracked hostname is still addressable; and a file declared as
    both an `inputFile` and an `outputFile` (e.g. a persistent worker's own counters/history) was
    being blindly overwritten with the stale Home copy every reconcile before its live output synced
    back — `outputFileSet` is now excluded from the live-input re-sync so only genuinely Home-owned
    inputs (like the dashboard options file) get re-copied each cycle.
  - First consumers are the paired `bitburner-scripts` repo's `libs/script-actions.js` (new
    `placement: "network"` target option) and 12 individual daemon offloads — see that repo's
    changelog for the full list.

- **contract** — **Home Server's two RAM safeguards now support either an exact amount or a
  percentage of total Home RAM.** `Transient RAM Reserve` and `Service Startup RAM Limit` each use
  the same compact selector-and-active-value row as Faction Manager and Hacking Ops: choose
  `Exact GB` or `Percentage`, then edit only that mode's value. Existing saves remain in Exact GB
  mode; both configured values are retained when switching modes, percentages are clamped to
  0–100%, and the effective GB amount is recalculated from live total Home RAM after an upgrade.
  Zero keeps its established meaning (`Disabled` for the reserve, `Unlimited` for the startup
  limit), and lowering the startup limit still only blocks future service starts rather than
  stopping services already running. The Infrastructure summary shows both the selected percentage
  and its effective GB value.
  - `dashboard/libs/dashboard-ram-settings.js` now owns the shared mode/value normalization and
    effective-limit resolution; `dashboard-options.js` persists the new mode and percentage fields.
  - `service-supervisor.js` applies the resolved startup limit during admission, while
    `network-child-supervisor.js` applies the resolved transient reserve before falling back to
    Home, so both safeguards follow Home RAM upgrades without requiring the options to be re-saved.

### Fixed

- **Network Navigator carried a phantom 4.00 GB `sleeve.travel` charge.** A local command result
  variable named `travel` was indistinguishable from the nested Netscript method to Bitburner's
  static analyzer. Renaming it to `travelResult` reduced the pre-split worker from 20.40/230.40 GB
  to 16.40/226.40 GB. The collision audits now supplement their generated top-level API list with
  this confirmed nested method name, and the one-shot validator guards the replacement workers.

- **contract** - Plugin panels can now place scoped actions above their content with
  `"actionsFirst": true`. The default remains unchanged: non-Options panel actions render after
  state, telemetry sections, and inputs. This lets bulk or toolbar-style controls lead the list they
  operate on without adding integration-specific UI code; Augment Manager's Buy panel is the first
  consumer in the paired scripts repository.

- **`buildTargetSnapshot()` could crash a calling script on non-normal network hosts** -
  (`dashboard/libs/topology.js`) this is the shared BFS-target-eligibility helper the paired
  `bitburner-scripts` repo's Hacking Ops profiles consume (Money already used it; Beginner and XP
  were switched over to it in the same fix - see that repo's changelog). It used to call
  `ns.getServerRequiredHackingLevel()`/`ns.getServerMaxMoney()` directly with no guard; Bitburner 3.0
  throws when those hacking-only APIs receive a non-normal host, such as a BN9 Hacknet Server - such
  hosts can still contribute executor RAM to a batcher, they just can never be hacking targets. Both
  calls are now wrapped in a try/catch that skips (and simply omits from `eligibleServers`/
  `xpFarmServers`) any host that throws, instead of crashing the entire caller. No RAM change (pure
  control-flow change, same API calls either way).

## 2026-08-16

### Added

- **contract** — **New `clearsOptionKeys` field on toggle-action metadata, for a true "radio button
  pair" between two unrelated services' own toggles.** A persisted toggle action (`kind:
  "save-options"` or `"plugin-command"`) can now declare `"clearsOptionKeys": ["someOtherServiceOptionKey"]`;
  when the toggle turns *itself* on (never when turning itself off), every listed key is forced to
  `false` in the same options-store write. Implemented in
  `dashboard/libs/plugin-integration.js`'s `buildPluginIntegrationActions` - for `save-options` kind
  it folds straight into the `optionOverrides` object that branch already builds and merges (no
  `automation-dashboard.jsx` change needed there); for `plugin-command` kind, `runServiceAction`'s
  handler (`automation-dashboard.jsx`) now also merges the same `clearedOptionOverrides` into its
  single-key `setOptions` update. No cross-service command-port coordination involved - each
  service's own launcher already polls the shared `data/dashboard_options.json` store live (typically
  every ~10s), so persisting the other key's new value is sufficient on its own for that service to
  notice and react. First real consumer: the paired `bitburner-scripts` repo's Faction Manager and
  new Corp Manager services, which can never both run at once (they'd fight over the same in-game
  "current work" slot) - see that repo's changelog. No RAM change (`automation-dashboard.jsx`
  unchanged at 8.30 GB - pure React state logic, no new `ns.*` surface).

- **Manual content authored for the 4 `bitburner-dashboard` plugins** (`dashboard/i18n/framework-en.json`),
  completing the content rollout alongside `bitburner-scripts`' own 14 integrations (see that repo's
  changelog): Port Registry (explains its cross-plugin `serviceTables` aggregation - any integration can
  contribute rows to another service's table without either importing the other, preserving the plugin
  boundary - plus its `conflictKey` collision detection, traced through `dashboard/libs/service-tables.js`),
  Mail Client (its three-source scan - network, home, and the darknet once unlocked - `.msg`/`.lit`/other
  file classification, and locally-tracked read state), and Network Navigator - authored under the manual
  key `"network"` (the visible Network Map view's own id), not `"navigation.network"` (the always-invisible
  `menuVisible: false` backend service that publishes its data) - since only the view id is ever read by
  `network-map-view.jsx`'s Manual button; documents the Singularity-gated connect/travel/company-work
  worker's deliberate isolation from the always-on, RAM-free topology scanner. Player Stats was already
  done in Phase 0.
- **Manual reaches the five full-window/workspace views that the tab-row mechanism above can't
  touch** (each bypasses `centerPanels` entirely - confirmed `selectedWorkspaceService` routes into
  `<WorkspaceProviderView>`, and `DASHBOARD_VIEW_METADATA` view-type plugins never reach the 3-column
  layout at all), placed per-view as specified rather than as one shared overlay:
  - **Script Log**: button to the right of the existing "Copy" button; toggling it swaps the log
    viewport for the manual text.
  - **Network Map**: button at the end of the bottom toolbar; toggling it repurposes the existing
    node-details inspector panel to show the manual instead of node details.
  - **File Manager**: button in the top filter bar; toggling it replaces the two-pane file browser
    with the manual text.
  - **Mail Client**: added to the existing keyboard-shortcut bar (`?: Manual`); toggling it replaces
    the message list/reader pane.
  - **BBS Connect**: `[ MANUAL ]` button at the bottom of the window, next to the existing
    "↑↓: SELECT ENTER: CONNECT" hint; toggling it replaces the remote-system directory list. Built
    with `h(...)` calls rather than JSX to match `bbs-connect-cabinet.js`'s own existing convention.
  - **Overview/System HUD deliberately excluded** - confirmed out of scope: it has no interactions,
    and its purpose is already clear and player-defined.
  - **Framework plumbing (one change, covers both `"workspace"`-adapter plugins for free)**: `manual`
    threaded as a new prop through `WorkspaceProviderView` → `PersistentWorkspaceProvider` →
    whatever `component` a plugin registered via `registerDashboardWorkspaceProvider` - Mail Client
    and BBS Connect both receive it automatically through this one shared path, no per-plugin
    framework change needed, only their own local button + content-swap wiring. View-type plugins
    (Script Log, Network Map, File Manager) each get `manual` passed directly at their own
    `automation-dashboard.jsx` mount point instead, since they're mounted individually by renderer
    type, not through one shared component.
  - Each view's own render helper (`renderManualSections` or equivalent) is a small **local**
    function, not a shared component - matches the confirmed "ad hoc per view" decision. Only the
    plain-data `normalizeManualSections` normalizer (string-or-array → `[{title, body}]`) is actually
    shared, reused by every one of these five plus the original tab-based `renderManualPanel`.
  - No RAM change on any touched entry point (`automation-dashboard.jsx` still 8.30 GB; BBS Connect's
    workspace entry still only `baseCost` + its pre-existing `ls` call) - every addition here is pure
    render/string logic plus the same already-free `ns.read()`/`ns.fileExists()` the original tab
    mechanism already used.
- **All five full-window/workspace Manual buttons now read "Back" while the manual is showing**
  (`script-log-view.jsx`, `network-map-view.jsx`, `file-manager-view.jsx`, `mail-client-view.jsx`,
  and `bitburner-scripts`' `bbs-connect-cabinet.js`), instead of staying labeled "Manual" the whole
  time - each already tracks the `showManual` boolean it toggles on, so this is just `showManual ?
  "Back" : "Manual"` (or `"M: BACK"` / `"M: MANUAL"` for BBS Connect's `KEY: ACTION` label
  convention) at each button's existing label, plus Network Map's `title` tooltip updated to match.
  No RAM change (label text only, same components as above).

### Changed

- **contract** — **Manual is now strictly opt-in, declared per-service via a new `manualFile` field,
  and each service's content lives in its own named file** instead of two shared JSON files.
  Previously *every* plugin/integration with `pluginFile` or `pluginMetadata` got a Manual tab
  regardless of whether any content existed, falling back to an empty "hasn't been authored yet"
  placeholder; now a service only gets the tab (or, for the five full-window/workspace views, the
  button/shortcut) once its own descriptor sets `manualFile` to a name **and** that name resolves to
  real content. Declare it exactly like any other metadata field:
  `"manualFile": "network-map"` on a `DASHBOARD_PLUGIN_METADATA` or `DASHBOARD_VIEW_METADATA` object,
  content in `dashboard/i18n/manual/framework/network-map.json` (this repo) or
  `dashboard/i18n/manual/scripts/<name>.json` (the paired private repo) as `{ "manual": "..." }` or
  `{ "manual": [{"title", "body"}, ...] }` - unchanged content shape, just one file per service
  instead of one shared file per repo. Two folders, not a flat list, specifically so a scripts-repo
  integration and a dashboard-repo plugin choosing the same name can never silently overwrite one
  another's file on the shared merged filesystem - the exact risk the original two-big-files split
  was already designed around, now closed structurally instead of by author discipline over two
  filenames.
  `dashboard/libs/manual-strings.js`'s `loadManualStrings(ns, declarations)` now takes an explicit
  `[{id, manualFile}]` list (built in `automation-dashboard.jsx` fresh each 30s refresh from
  `getDashboardServiceRegistry().services` and `getDashboardViewRegistry().views` - no separate
  bookkeeping needed, the four framework-owned global pages' `manualFile` fields on their
  `DASHBOARD_SERVICES` literals are already merged into that same services array) instead of reading
  two fixed paths - `normalizeManualSections` and its content-shape contract are unchanged.
  `isManualEligible` in `automation-dashboard.jsx` dropped its old `pluginFile || pluginMetadata`
  fallback entirely, now keying purely on `manualFile` presence + resolved content; the four
  full-window views with authored content (Network Map, Mail Client, plus this repo's Player Stats
  and Port Registry pages) carry forward unaffected, while Script Log, File Manager, and
  `bitburner-scripts`' BBS Connect - which never had content authored - now correctly hide their
  Manual affordance instead of showing an empty placeholder. Verified no RAM change anywhere
  (`automation-dashboard.jsx` still 8.30 GB, every touched renderer still its documented baseline) -
  every change here is pure descriptor/render logic plus the same already-free
  `ns.read()`/`ns.fileExists()` the original mechanism used.

### Fixed

- **Core Modules' Manual button was activating the wrong panel** - clicking it showed a core script's
  own status (whichever one happened to be first in the list) instead of the manual.
  `resolveSelectedCenterPanel` (`dashboard/libs/script-list.js`) validates any requested panel id
  against the service's actual `centerPanels` array, and Core Modules' is a dynamic list of core
  scripts that deliberately never includes a `"manual"` entry (see its bespoke button, added earlier
  today) - the validation silently rejected the request and fell back to
  `defaultCenterPanel` (the first listed script). Added an explicit exception for
  `selectedItem === "global.coreModules" && savedCenterPanel === "manual"`.
- **Script Log's, Network Map's, and File Manager's Manual buttons closed themselves almost
  immediately** - each used a bare `React.useState` for `showManual`, but these three views'
  entire React tree remounts on every dashboard refresh tick (confirmed via each file's own existing
  comments on this exact hazard, e.g. network-map-view.jsx's `useLayoutEffect` note: "The dashboard's
  outer main loop can remount this whole tree via a fresh `ns.printRaw()` call at any moment... on a
  totally separate clock from React's own scheduling"), which resets any state not persisted through
  the `initialState`/`onStateChange` (or `getDashboardViewInteractionState`/
  `saveDashboardViewInteractionState`) pattern the rest of each file's own local state already uses.
  `showManual` now initializes from and saves through that same external store in all three files,
  matching every other local toggle already handled that way. Mail Client and BBS Connect were never
  affected - both are `persistent: true` workspace providers with their own long-lived React root
  that survives dashboard refreshes (`workspace-provider-view.jsx`'s `PersistentWorkspaceProvider`),
  so a bare `useState` is correct there.
- **Network Map's zoom percentage indicator moved** to immediately right of the "+" (zoom in) button,
  instead of sitting at the end of the toolbar past Refresh/cloud-toggle/Manual.
- **A "Manual" tab** on every plugin/integration service, alongside its existing Status/Options/
  Graphs tabs - an extended reference view showing what the service does and an itemized,
  always-visible (not hover-only) breakdown of its own buttons and settings. Auto-injected the same
  way and behind the same gate as the existing Options tab (`automation-dashboard.jsx`'s
  `centerPanels` construction), so no per-integration opt-in is required; a service with no authored
  content yet shows a plain "hasn't been authored" placeholder, with its controls still listed from
  their own tooltips. New `WIDGET_STYLES.manualProse` token (`whiteSpace: pre-wrap`, no equivalent
  existed before - the only prior paragraph-preserving text style in the codebase was Mail Client's
  local `readerBody`).
  - **contract-adjacent** - the narrative text itself deliberately does **not** live in
    `DASHBOARD_PLUGIN_METADATA` (which is parsed as raw JSON and can't reference an import, and
    which the framework can't statically import from a private sibling repo either way). It lives in
    a new per-repo `dashboard/i18n/<name>-en.json` file, read at runtime via `ns.read()`/
    `ns.fileExists()` (both free) and merged by `serviceId` through the new
    `dashboard/libs/manual-strings.js` (`loadManualStrings`/`normalizeManualSections`). Two files
    intentionally, not one shared `en.json`: this repo's own `dashboard/plugins/` tree already merges
    with the private repo's `dashboard/plugins/` tree onto the same `home` filesystem at sync time
    (confirmed - both repos independently ship a `dashboard/plugins/` folder today), so an identical
    filename from both repos would silently overwrite one another. This is meant to seed the pattern
    for dashboard-wide translation later, not stay a one-off for this feature - a second locale is
    just a sibling file once the loader gains a locale parameter.
  - Piloted end-to-end against Player Status (`system.playerStatus`,
    `dashboard/i18n/framework-en.json`) before any wider rollout, per the standing plan. No RAM
    change (still 8.30 GB) - the new code path is pure render/string logic plus two already-free NS
    calls.
  - **Widened eligibility beyond ordinary plugin services**, in two more categories found after the
    pilot: `"static"`-adapter services (e.g. Port Registry) have real `pluginMetadata` but no backing
    script (empty `pluginFile`), so they were wrongly excluded by reusing Options' `isPluginService`
    gate - now checked separately (`isManualEligible`) against `pluginFile` **or** `pluginMetadata`.
    Framework-owned global entries (Dashboard Options, Core Modules, Start Order, Home Server) have
    neither, so they only gain a Manual tab once real narrative content actually exists for their id
    in `manualStrings` - there's no itemized actions/inputs fallback for them the way there is for
    plugin services, so an empty tab would have had nothing to show. All four authored in
    `dashboard/i18n/framework-en.json`. Deliberately **not** covered yet: `"workspace"`-adapter
    plugins (Mail Client, BBS Connect) and full-window `DASHBOARD_VIEW_METADATA` plugins (File
    Manager, Script Log) bypass the tab-row mechanism entirely (confirmed: `selectedWorkspaceService`
    routes into `<WorkspaceProviderView>`, and view-type plugins never reach the 3-column layout at
    all) - giving those a Manual entry point needs new UI surface (a title-bar button + overlay,
    scoped as its own follow-up), not just a wider gate.
  - **Core Modules got a bespoke Manual button instead of the generic tab**, next to its existing
    "Start Integrations" action. Its own `centerPanels` is a dynamically-built list of core scripts
    (one entry per script, not a small fixed tab set - see its `getPanels(homeScripts)`), so injecting
    a generic "manual" entry into that list would have shown up as a confusing extra list item rather
    than a tab. `isManualEligible` now explicitly excludes every `isGlobalListMenuItem` id (Core
    Modules, Integration Manager, Plugin List, Script List) from the generic path; the button sets
    `selectedCenterPanel` to `"manual"` directly, and `renderGlobalOptions()` checks for that before
    falling through to its normal script-selection resolution. First pass hand-rolled the button
    directly and was missing padding/tone/pressed-state styling as a result - fixed by adding a real
    `select-panel` action kind to `runServiceAction` (purely local `selectCenterPanel(...)`, no
    NS-touching dispatch) and routing it through the same `renderServiceActions()` "Start
    Integrations" already uses, instead of a hand-rolled element.
- **Standing tab-order convention**: every service's own first-declared panel (already load-bearing
  elsewhere as the `defaultCenterPanel` fallback, so "first declared" already meant "primary" before
  this) now always sorts first, Options always sorts at the very bottom, Manual pins directly above
  Options (not left to fall wherever it lands alphabetically - on a long panel list like Progression
  Report's 14, that could bury it far from Options), and everything else sorts alphabetically by
  label in between (new `sortServiceCenterPanels`, applied where `centerPanels` is assembled).
  Comparator trims labels before comparing, since Faction Manager's own "Graphs" tab had a stray
  leading space that would otherwise have sorted it unpredictably - fixed in
  `bitburner-scripts`' `faction-manager-integration.js` too while this was found.

### Added

- **Start Order now shows a capacity-planning ceiling, not just each service's own RAM.** Each row
  keeps its own RAM figure exactly as before, with a `(Children - X GB)` suffix once any of its
  declared `managedScripts` are found on `home` (hover for a note on what's included). The card
  title gained a right-aligned **Combined total**, in the same style as the title itself, summing
  every listed service plus its children — regardless of whether the service or one of its internal
  sub-toggles is currently switched on. Answers "how much Home RAM would let everything run at
  once," which the existing Service Startup RAM Limit safeguard deliberately doesn't (it counts only
  running service entry scripts, excludes children by design, and reflects live state rather than
  the maximum). Reuses `homeScripts`' already-computed live `ramPerThread` for every `.js`/`.jsx`
  file on home (including children, which have no `DASHBOARD_SCRIPT_METADATA` of their own by
  convention and so never appear elsewhere), so this needed no new `ns.*` calls: 8.30 GB, unchanged.

### Removed

- **`Card`'s accent dot** (`dashboard/renderers/dashboard-panels.jsx`), across every card in the
  dashboard. It read as too easy to confuse with the service-status dots now used elsewhere, and its
  removal also cleared the way for a title node to occupy the full header row and reach the card's
  right edge (e.g. Start Order's title + right-aligned **Combined total** figure, added above) — a
  title-row dot would otherwise have competed for that space. `accent` is still accepted by every
  call site (~12 of them) but no longer rendered; left in place rather than stripped from each
  caller for a purely cosmetic change. The now-fully-unused `cardAccent` style entry was removed.
- **contract** — Plugin configuration inputs can now use the same `visibleOptionKey` and optional
  `visibleOptionValue` metadata already supported by HUD groups and telemetry fields. This allows
  an enum or toggle to present only the configuration field relevant to its current mode without
  integration-specific dashboard rendering code.

### Changed

- Player Status's **Singularity API** toggle relabeled **Current Work Tracking**
  (`playerStatsCurrentWorkEnabled`, unchanged) - `player-stats-singularity.js` does exactly one
  thing (polls `ns.singularity.getCurrentWork()` and formats it for display), so the new label
  names that directly rather than the generic API it happens to use. Distinguishes it clearly from
  the sibling **Current Work UI** toggle (`playerStatsCurrentWorkVisible`), which only shows/hides
  the result without touching this RAM-costing background process - "Tracking" runs the daemon,
  "UI" decides whether its output is displayed. Action id renamed `toggle-singularity-api` →
  `toggle-current-work-tracking`; telemetry field `currentWorkEnabled` relabeled **Singularity API
  Enabled** → **Current Work Tracking Enabled** to match. No behavior or RAM change - metadata only.
- **[SF-4] Current Work Tracking** - label prefixed so the Source-File 4 requirement is visible at
  a glance without opening the tooltip. The four equivalent toggles in the private
  `bitburner-scripts` repo (Server Manager, Faction Manager, Hacking Engine, Progression Report)
  got the same prefix.

## 2026-08-15

### Added

- **RAM-collision audit tooling**, not-contained in this repo (own `acorn`/`acorn-walk`/
  `acorn-jsx-walk`/`@babel/standalone` in `tools/`, independent of the private sibling.
  `tools/audit-ram-collisions.mjs` walks every `.js`/`.jsx` file and flags any identifier matching
  `data/ns_api_functions.json` — the definitive Netscript API function-name list, generated from the
  game's own `NetscriptDefinitions.d.ts` and committed here (regenerated from the private
  `bitburner-src` repo when available). Documented as mandatory for new/significantly modified scripts in
  `docs/DASHBOARD_DESIGN_PRINCIPLES.md`'s Performance Discipline section.

### Fixed

- First run (49 initial findings, narrowed to 30 real ones once the tool's own exemption logic was
  taught to recognize `this.ns.method()` — a class storing its Netscript handle as an instance
  property, not a collision) found and fixed real collisions across 7 files:
  `service-supervisor.js`'s local `getScriptRam` wrapper (renamed `resolveScriptRamGb`),
  `file-manager-view.jsx`'s keyboard-shortcut `run` fields (renamed `execute`),
  `system-overview-view.jsx`'s alert-list `alert` map parameter (renamed `alertItem`), and native
  `Map`/`Set` `.clear()` calls plus a mail message's `.read` flag across `mail-client-scanner.js`,
  `mail-client-view.jsx`, `mail-client-workspace.js`, and `workspace-provider.js` (bracket notation,
  since `.read` is a shared field-name contract between the scanner and the viewer's configurable
  `fields.read` mapping — not safe to rename, and bracket-notation property access was never charged
  in the first place). No measurable RAM change on any currently-reachable entry point: the
  `getScriptRam` wrapper's own body already made the real, legitimately-charged call, and
  `file-manager-view.jsx` turned out not to be part of any entry point's static import graph at all
  (the plugin that renders it costs 1.60 GB base, no `ns.*` surface reachable through it) — this was
  a correctness/hygiene pass, not a reclaim.

## 2026-08-14

### Added

- Player Status now has an independent **Current Work UI** toggle. It hides the Singularity-backed
  Current Work group and related status fields without enabling, disabling, or otherwise changing
  the RAM-bearing Singularity worker.
- **contract** — HUD groups and telemetry fields can declare `visibleOptionKey` (and optionally
  `visibleOptionValue`) to make their presentation conditional on plugin-owned dashboard options.

### Changed

- Dashboard lifecycle, kill, restart, and File Manager actions now execute from the dashboard's
  validated main-loop queue instead of launching the 8.50 GB transient action worker. The executor
  reuses the dashboard's existing process/network APIs and stops scripts by PID, keeping React
  callbacks free of Netscript calls while making controls available even when Home has no spare RAM
  for another process. The dashboard is now 8.30 GB steady (12.80 GB with the 4.50 GB supervisor),
  replacing the previous reliable 13.40 GB dashboard-plus-worker reservation. The obsolete worker,
  result file contract, and queue modules were removed.
- **contract** — `formatDuration` now escalates past hours into days and years for long-range ETAs,
  instead of an ever-growing hour count. Beyond 1,000 years it reads "over 1,000 years" rather than
  spelling out the number — an ETA to a far-off hacking level can reach ~1e56 hours, which previously
  rendered as raw scientific notation (`"6.458975140990254e+56 hrs 44 min"`) in the stat bar. Output
  under 24 hours is byte-identical to before. `shortDurationText` gained matching `yr`/`d`
  abbreviations alongside the existing `hrs`/`min`. Flagged **contract** because this changes the
  string shape for any duration ≥ 24 hours (e.g. `"48 hours"` now reads `"2 days"`) — a plugin that
  parsed the old output rather than treating it as opaque display text would see a different format.

### Fixed

- Player Status's skill XP bars could sit pinned at 100% for stretches, then jump straight to the next
  level with no visible progress in between. The bar recomputed level boundaries using only the
  player's augmentation multiplier, omitting the BitNode's own per-skill level multiplier (e.g. BN2's
  `HackingLevelMultiplier: 0.8`) — in any BitNode where that differs from 1, the computed exp window
  for a level was narrower than the real one, so the bar reached 100% before the actual in-game level
  advanced. Now resolves the correct multiplier via `ns.getResetInfo()` (no Source-File gate, unlike
  `ns.getBitNodeMultipliers()` which needs SF5 and would leave a fresh BitNode with no fix at all) plus
  a small table of the game's own per-BitNode values, so it's accurate from a player's very first
  BitNode. RAM: 2.60 → 3.60 GB.

## 2026-08-13

### Added

- **contract** — `adapter: "workspace"`: a plugin can register its own React component and have it
  rendered in the two centre columns, keeping the menu and player-stats columns visible. Unlike a
  full-window view, the renderer is supplied by the plugin rather than the framework, so it can live
  outside this repository and is removed cleanly by deleting the plugin folder. Backed by
  `dashboard/libs/workspace-provider.js`; set `persistent: true` for anything with keyboard
  navigation, text input, scroll position or a live session, so it keeps its own React root instead
  of remounting on every dashboard tick.
- README example covering the BBS Connect plugin.
- **contract** — Action buttons can be scoped to a single panel with `panelId`. An action without
  one continues to appear on the auto-injected Options panel, so existing descriptors are unaffected.
- **contract** — New `clipboard` action kind. Instead of dispatching a command it copies a string to
  the clipboard, with the payload read from telemetry via `textKey` (a dotted path, resolved like
  telemetry `fields`). Because it sends nothing, it is not gated on the integration's runtime being
  alive — it stays usable while a capability-gated worker is stopped, which is the point: it exists
  for workflows a player must do by hand until an API unlocks them. The button disables itself when
  the resolved text is empty, and if the browser refuses clipboard access the raw text is shown so it
  can still be copied manually.

### Changed

- Mail Client moved from a full-window view to the workspace adapter. It is more compact, and the
  player-stats column stays visible while reading. Its hardcoded full-window renderer branch was
  removed; the view component itself was reused unchanged.
- Further Mail Client presentation refinements.

### Fixed

- A workspace panel now detaches correctly before another one loads.
- Panel-scoped actions rendered nowhere at all. Both adapters' `getActions` returned early unless the
  Options panel was selected, so an action carrying a `panelId` was filtered off Options and never
  built for its own panel. Placement is now decided in one place instead of two.

### Documentation

- README gained an "Action buttons and where they appear" section. The `actions` array previously had
  a single passing mention.

## 2026-08-12

Public availability began partway through this day, so only changes after that point are listed.

### Added

- Compact value preview beside monetary inputs, so a figure like `20000000000000` reads as `$20.00t`
  at a glance. Display only — the underlying input value is unchanged.

### Changed

- Reduced RAM use in capability checks (roughly 2.4–3.4 GB).
