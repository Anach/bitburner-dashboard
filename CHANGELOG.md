# Changelog

Notable changes to the Bitburner Automation Dashboard, newest first.

This project became publicly available on 2026-08-12, around 11:00. Commits before that point are
development history from before anyone could build against the framework, and are not listed here —
the log starts where compatibility starts mattering.

Entries marked **contract** change something a plugin descriptor or runtime depends on. Metadata and
view schemas are still beta contracts, so review those entries before updating an existing
integration.

## Unreleased

### Added

- **contract** — Action buttons can be scoped to a single panel with `panelId`. An action without
  one continues to appear on the auto-injected Options panel, so existing descriptors are unaffected.
- **contract** — New `clipboard` action kind. Instead of dispatching a command it copies a string to
  the clipboard, with the payload read from telemetry via `textKey` (a dotted path, resolved like
  telemetry `fields`). Because it sends nothing, it is not gated on the integration's runtime being
  alive — it stays usable while a capability-gated worker is stopped, which is the point: it exists
  for workflows a player must do by hand until an API unlocks them. The button disables itself when
  the resolved text is empty, and if the browser refuses clipboard access the raw text is shown so it
  can still be copied manually.

### Fixed

- Panel-scoped actions rendered nowhere at all. Both adapters' `getActions` returned early unless the
  Options panel was selected, so an action carrying a `panelId` was filtered off Options and never
  built for its own panel. Placement is now decided in one place instead of two.

### Documentation

- README gained an "Action buttons and where they appear" section. The `actions` array previously had
  a single passing mention.

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

### Changed

- Mail Client moved from a full-window view to the workspace adapter. It is more compact, and the
  player-stats column stays visible while reading. Its hardcoded full-window renderer branch was
  removed; the view component itself was reused unchanged.
- Further Mail Client presentation refinements.

### Fixed

- A workspace panel now detaches correctly before another one loads.

## 2026-08-12

Public availability began partway through this day, so only changes after that point are listed.

### Added

- Compact value preview beside monetary inputs, so a figure like `20000000000000` reads as `$20.00t`
  at a glance. Display only — the underlying input value is unchanged.

### Changed

- Reduced RAM use in capability checks (roughly 2.4–3.4 GB).
