# Changelog

Notable changes to the Bitburner Automation Dashboard, newest first.

This project became publicly available on 2026-08-12, around 11:00. Commits before that point are
development history from before anyone could build against the framework, and are not listed here —
the log starts where compatibility starts mattering.

Entries marked **contract** change something a plugin descriptor or runtime depends on. Metadata and
view schemas are still beta contracts, so review those entries before updating an existing
integration.

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
