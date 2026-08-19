# Changelog

Notable changes to the Bitburner Automation Dashboard, newest first.

This project became publicly available on 2026-08-12, around 11:00. Commits before that point are
development history from before anyone could build against the framework, and are not listed here —
the log starts where compatibility starts mattering.

Entries marked **contract** change something a plugin descriptor or runtime depends on. Metadata and
view schemas are still beta contracts, so review those entries before updating an existing
integration.

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
