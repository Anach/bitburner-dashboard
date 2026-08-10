# Bitburner Automation Dashboard

A metadata-driven dashboard framework for [Bitburner](https://github.com/bitburner-official/bitburner-src). It turns a script tail into a responsive control surface for user-owned Netscript services without coupling the dashboard to those services.

The framework discovers declarative integration descriptors, reads JSON telemetry, and supplies the common UI: status and health, script controls, options, commands, graphs, resource cards, full-window views, logs, and file management. Your automation remains independent and continues to work when the dashboard is not running.

> [!IMPORTANT]
> This project is approaching public beta. Back up your Bitburner save and scripts before testing file-management or kill controls. The metadata contract may still change before a stable release.

## What the framework provides

- Responsive windowed, maximized, and minimized tail layouts.
- A native dashboard theme and an adapter that follows the active game theme.
- Metadata-discovered services with no service-specific imports in dashboard core.
- Generic start, stop, restart, edit, option, action, and requirement controls.
- A metadata-driven supervisor for integrated daemon services.
- JSON telemetry fields, quick statistics, gauges, history graphs, lists, and resource cards.
- Metadata-driven full-window overview, network-map, file-manager, script-log, and mailbox views.
- Health filtering and daemon/on-demand lifecycle presentation.
- Persistent dashboard options stored on `home`.
- Safe metadata parsing with `JSON.parse`; integration source is never evaluated.

No game DOM modification is required. The interface is rendered inside a normal Netscript tail window.

## Requirements

- Bitburner 3.0.x. The current beta is developed against Bitburner 3.0.2.
- A method of synchronizing the framework files into the game while preserving their relative folders.
- Enough free `home` RAM for the dashboard and any integrations you choose to run.

The dashboard itself does not require Singularity. An individual integration can declare Singularity or another capability as required or optional.

### RAM requirements

Static RAM cost of each framework and included-plugin script, measured on Bitburner 3.0.2 (pre-SF4 save; figures with Source-File 4 unlocked will be lower for anything using `ns.singularity.*`, since Bitburner applies a 16x RAM penalty to those calls before SF4):

| Component | Static RAM | Notes |
| --- | ---: | --- |
| `dashboard/automation-dashboard.jsx` | 4.90 GB | Required. The dashboard itself. |
| `dashboard/service-supervisor.js` | 4.50 GB | Required if any daemon integration is enabled. Supervises daemon start/restart. |
| **Combined steady footprint** | **8.60 GB** | Dashboard + supervisor running together, the normal steady state. |
| `dashboard/action-worker.js` | 8.50 GB | Transient only — a worker instance starts on demand for a script/kill/file action and exits immediately after, never part of the permanent footprint. |

Included plugins (each independently removable; only pay for what you keep installed):

| Plugin runtime | Static RAM | Notes |
| --- | ---: | --- |
| Player Stats (`dashboard/plugins/player-stats/player-stats.js`) | 10.1 GB | |
| Network Navigator (`dashboard/plugins/network-map/network-navigator.js`) | 234.9 GB | Dominated by six pre-SF4-penalized `ns.singularity.*` calls used for city/company details. Drops sharply once Source-File 4 is unlocked — this is expected, not a bug. |
| Mailbox Scanner (`dashboard/plugins/mailbox/mailbox-scanner.js`) | 5.25 GB | |
| Mailbox Darknet Agent (`dashboard/plugins/mailbox/mailbox-darknet-agent.js`) | 7.65 GB | Self-propagates onto darknet servers via `ns.exec`; not a persistent daemon on `home`. |
| Mailbox Reader (`dashboard/plugins/mailbox/mailbox-reader.js`) | 1.85 GB | One-shot helper, `ns.exec`'d onto reachable network hosts as needed; not a persistent daemon. |
| File Manager / Script Log / Mailbox views (`file-manager-view.js`, `script-log-view.js`, `mailbox-view.js`) | 1.6 GB each | Pure metadata descriptors with no `main()` — base script cost only. |

These figures are static per-script costs, not a live-usage snapshot — measure your own installation after syncing if you need an exact number, since it depends on exactly which plugins you keep and whether Source-File 4 is unlocked.

## Install and run

1. Clone or download the framework repository locally.
2. Sync the `dashboard/` tree to Bitburner's `home`, preserving its relative paths.
3. In the Bitburner terminal, start the dashboard:

   ```text
   run dashboard/automation-dashboard.jsx
   ```

### Add a terminal alias

Bitburner's terminal can replace a short command with the full dashboard launch command. Run this once:

```text
alias dashboard="run dashboard/automation-dashboard.jsx"
```

You can then open the dashboard by typing:

```text
dashboard
```

A normal alias is sufficient because `dashboard` is the first word entered in the terminal; the global `-g` option is not needed. To inspect existing aliases, run `alias`. To remove or recreate this one, use:

```text
unalias dashboard
```

You can substitute a shorter name such as `dash` if preferred:

```text
alias dash="run dashboard/automation-dashboard.jsx"
```

The dashboard opens its own tail and prevents duplicate dashboard instances. Its native title bar includes a dashboard Restart control immediately before Bitburner's Stop button, including while minimized. Restart uses the same transient action-worker handoff as the in-dashboard action and preserves the current startup arguments. By default it starts the integration supervisor automatically. To launch the dashboard process only, without starting the supervisor, use:

```text
run dashboard/automation-dashboard.jsx --no-auto-start
```

Dashboard Restart preserves whether `--no-auto-start` was active. Starting without the flag starts (or leaves alone, if already running) the supervisor. No `init` script is required; users may launch the dashboard from their own startup script if desired. Its theme, text size, startup window mode, Player Stats visibility, and Script List exclusions can be changed under **Global Options → Dashboard Options**.

To launch it before saved processes, set **Game Options → System → Autoexec Script + Args** to `dashboard/automation-dashboard.jsx` (or append `--no-auto-start` to suppress integration auto-start). Bitburner marks autoexec processes temporary and launches them before saved scripts. The dashboard treats this as an idempotent, silent launch: a restored duplicate exits without terminal output, the autoexec instance does not print its normal startup line, and stopping the daemon closes its tail so the next launch cannot leave a second window beside a stale stopped dashboard.

The integration supervisor checks the `home` file list periodically and reuses parsed descriptors while that list is unchanged. Each active cycle uses one process snapshot to start or restart eligible integrations declared with `"daemon": true`; integrations declared with `"daemon": false` remain on demand. Every daemon integration has its own **Autostart** toggle (visible next to its Start/Stop/Restart actions), so individual services can be excluded without touching the command line. The supervisor exits when no enabled daemon integration is discovered. Selecting **Start integrations** in the Plugin List starts the supervisor again after it has been stopped or after a daemon integration is installed.

**Home Server → Options** provides two independent supervisor safeguards. **Transient RAM Reserve** is the minimum free `home` RAM that must remain after each service launch, preserving capacity for the action worker and other on-demand processes. **Service Startup RAM Limit** caps the combined RAM of running service entry scripts represented in the Start Order list; already-running listed services count toward the cap, and lowering it does not stop them. Child processes and manually started non-service scripts are outside that aggregate. A value of `0` disables the corresponding safeguard.

Runtime settings are written to:

```text
data/dashboard_options.json
```

Stopping the dashboard does not stop the supervisor or integrated automation scripts. The prominent kill controls are explicit exceptions and should be used deliberately.

Script lifecycle commands, kill operations, dashboard restart, and File Manager mutations run through `dashboard/action-worker.js`. The dashboard starts one worker only when an action is requested, validates commands and file paths at both sides of the boundary, processes one action at a time, and correlates the worker result before showing status. Keep enough temporary `home` RAM available for the worker when using these controls.

## Add an integration

An integration has two independent parts:

1. Your runtime script, which owns all automation and telemetry production.
2. A JSON-compatible descriptor, which tells the dashboard how to present and control it.

Start with [dashboard/examples/example-monitor-integration.js](dashboard/examples/example-monitor-integration.js). It is stored outside the discovery directory, so it does nothing by itself.

To activate a descriptor:

1. Choose a runtime basename, for example `example-monitor.js`.
2. Ensure exactly one script with that basename exists outside `dashboard/integrations/`, `dashboard/`, `libs/`, and `trashbin/`. The containing folder is your choice.
3. Copy the example to `dashboard/integrations/example-monitor-integration.js`.
4. Change its service identity, presentation, telemetry path, options, and command port.
5. Start or restart the dashboard. Discovery is automatic; dashboard core does not need editing.

The filename pairing is intentional:

```text
automation/example-monitor.js
dashboard/integrations/example-monitor-integration.js
                     ^ pairs with example-monitor.js
```

If zero or multiple runtime files share the expected basename, the descriptor is skipped.

### Descriptor rules

Every service descriptor must export this exact declaration:

```js
export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "example.monitor",
    "menuGroup": "automation",
    "menuLabel": "Example Monitor",
    "description": "A short user-facing description.",
    "requirements": [],
    "daemon": true,
    "panels": [
        { "id": "status", "label": "Status", "title": "Example Monitor" }
    ],
    "telemetry": {
        "path": "data/example_monitor.json",
        "fields": [
            { "key": "state", "label": "State", "tone": "info" }
        ]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
```

The object must be valid JSON syntax inside the JavaScript export:

- Use only objects, arrays, strings, numbers, booleans, and `null`.
- Quote object keys and strings with double quotes.
- Do not use imports, functions, callbacks, getters, variables, template strings, or executable expressions.
- Do not add trailing commas or comments inside the object.
- Keep runtime logic and Netscript calls in the runtime script.

`menuGroup` dynamically creates the service or view's main-menu category. When omitted or blank it defaults to `general`, displayed as **General**. An explicit value must be a stable identifier beginning with a lowercase letter and may contain letters, numbers, `.`, `_`, or `-`; camel-case identifiers are also supported. For example, `"menuGroup": "reports"` creates **Reports**, and `"menuGroup": "systemReports"` creates **System Reports**. A category is rendered only while it contains at least one visible item.

Two optional fields control presentation without registering the category in dashboard core:

- `menuGroupLabel` overrides the title inferred from `menuGroup`.
- `menuGroupOrder` is an optional finite number used for ascending category order. Categories without one sort alphabetically by their displayed label.

All descriptors contributing to the same category should declare the same label and optional order. Conflicts are reported in the browser console and resolved deterministically. Entries within each category sort alphabetically by their displayed label. An entry may set numeric `menuOrder`; lower values appear first, so `"menuOrder": -100` provides a simple top pin. Entries sharing an order remain alphabetical. **Software** and **Options** remain framework-pinned at the bottom of the menu; all other categories are metadata-driven.

Use the `script` adapter for the normal script-oriented status view, including path and RAM information. The `metadata` adapter is available for a more telemetry-focused presentation.

### Publish telemetry

The runtime publishes a JSON object to the descriptor's `telemetry.path`. For the supplied example, `data/example_monitor.json` could contain:

```json
{
  "generatedAt": 1785643200000,
  "state": "running",
  "cycles": 42,
  "profit": 1250000,
  "history": [
    { "timestamp": 1785643140000, "profit": 900000 },
    { "timestamp": 1785643200000, "profit": 1250000 }
  ]
}
```

Publish a complete snapshot each time; the runtime owns sampling frequency, history retention, and schema stability. The dashboard only reads and formats the data.

Telemetry field keys and graph series keys support dot-separated paths such as `economics.netProfit`.

Supported field formats include:

```text
money
signedMoney
ram
number
time
uppercase
shortDurationText
```

Common field tones include `neutral`, `info`, `success`, `warn`, `danger`, `signed`, and `warnWhenPositive`.

### Add options and commands

Options are stored with the dashboard configuration. The dashboard can send their values to a runtime through a Netscript port:

```js
"options": {
    "sampleInterval": { "default": 5000, "type": "integer", "min": 1000 },
    "notifications": { "default": true, "type": "boolean" }
},
"inputs": [
    { "id": "sample-interval", "label": "Sample Interval (ms)", "optionKey": "sampleInterval", "type": "number", "min": 1000 },
    { "id": "notifications", "label": "Notifications", "optionKey": "notifications", "type": "checkbox" }
],
"commands": {
    "port": 29,
    "optionBindings": [
        { "optionKey": "sampleInterval", "prefix": "SampleInterval:" },
        { "optionKey": "notifications", "trueValue": "Notifications:on", "falseValue": "Notifications:off" }
    ]
}
```

Allocate an unused port for each interactive runtime. The runtime is responsible for reading that port and applying commands. Custom action buttons use the same boundary through an `actions` array; see the complete example descriptor.

### Declare requirements

Requirements inform health and availability displays without putting capability checks in the descriptor. Supported requirement types are:

- `api`: `singularity`, `bladeburner`, `gang`, `corporation`, `sleeve`, `stanek`, or `darknet`.
- `sourceFile`: a Source-File number, optionally with `level`.
- `augmentation`: an augmentation name.
- `program`: a filename present on `home`.
- `stock`: `wse`, `tix`, `4s`, or `4s-tix`.
- `bitNode`: a BitNode number.

Set `"required": false` to display a capability as optional.

## Metadata capabilities

The example intentionally demonstrates the most common integration path. The framework also supports:

- Additional telemetry snapshots merged with `telemetry.sources`.
- Quick-stat fields with `overview`, `overviewLabel`, and `overviewOrder`.
- Circular quick gauges with `telemetry.overviewGauges`.
- `graph`, `string-list`, `items`, `message`, and `resource-cards` sections.
- Numeric, checkbox, and select inputs.
- Telemetry-driven action variants and lock states.
- On-demand runtimes with `"daemon": false`.
- Starting an on-demand runtime when a configured limit increases.
- Metadata-driven HUD groups and full-window view descriptors.

These capabilities are optional and remain subject to beta schema changes. The framework does not prescribe or ship automation behavior; integrations belong to the user.

## Framework boundaries

The project keeps three responsibilities separate:

- `dashboard/automation-dashboard.jsx` owns discovery, normalized state, generic action dispatch, and framework rendering.
- `dashboard/service-supervisor.js` discovers and supervises eligible daemon integrations.
- `dashboard/libs/` contains behavior shared by the framework and multiple plugins.
- `dashboard/renderers/` contains framework-owned implementations for optional metadata-discovered view types.
- `dashboard/integrations/` contains data-only descriptors for runtime scripts that do not require the dashboard.
- `dashboard/plugins/<plugin>/` contains removable dashboard-dependent descriptors, runtimes, and plugin-specific helpers.

Runtime scripts must not import dashboard code. Dashboard core and libraries must not import a runtime or an integration descriptor. The loader reads descriptor source as JSON and never evaluates it.

A direct plugin must keep all plugin-specific files in its own folder. Removing that folder removes the plugin from discovery and removes any runtime shipped by that plugin. Netscript resolves static imports before dashboard discovery, so core imports only framework-owned modules under `dashboard/libs/` and `dashboard/renderers/`, never files inside a removable plugin folder.

Framework renderers remain installed when a plugin is removed. A renderer defines a supported metadata view type, such as `file-manager` or `script-log`; the plugin descriptor activates that type and supplies its configuration. Without the descriptor, the renderer is dormant and no menu item or view is created. Do not delete a file under `dashboard/renderers/` when uninstalling a plugin because the dashboard's static import graph still requires it for RAM calculation and startup.

## Full-window views

Full-window pages use `DASHBOARD_VIEW_METADATA` descriptors rather than service descriptors. Supported renderers currently include:

- `system-overview`
- `network-map`
- `file-manager`
- `script-log`
- `mailbox`

The supplied views are direct dashboard plugins under `dashboard/plugins/<plugin>/`. View metadata is discovered from each plugin's immediate `*-view.js` descriptor, while supported renderer implementations live under `dashboard/renderers/`. The loader still accepts legacy `dashboard/integrations/*-view.js` descriptors, but new dashboard-dependent views should be packaged as plugin folders.

Plugins may contribute widgets to a discovered view through JSON-compatible `viewWidgets` metadata, or to the normal workspace right pane through `workspaceWidgets`. Player Stats uses both contracts to add itself to System Overview and beside the service status panel in non-global system groups. Its dashboard option is also plugin-contributed, so removing Player Stats removes the widgets and option without leaving an empty surface or inactive control.

## Beta notes

- Preserve folder paths when syncing; Netscript imports are path-based.
- The runtime framework imports only files beneath `dashboard/`; `data/` files are user or runtime state rather than code dependencies.
- Keep runtime basenames unique so descriptors pair deterministically.
- Dashboard Options' Hidden folders/scripts affect the Script List display only — they do not disable integration discovery, and a hidden script remains a valid target for the Script List's own bulk Kill Home/Kill Remote actions.
- Keep telemetry files valid JSON. Invalid or missing snapshots fail closed and show telemetry as unavailable.
- Port numbers are shared game-wide; integrations must not reuse ports unintentionally.
- File-manager actions can move, archive, or delete files on `home`. Running and descriptor-protected files are blocked, but a save backup remains strongly recommended.
- `dashboard/action-worker.js` and `data/dashboard_action_result.json` are framework-protected File Manager paths.
- Metadata and view schemas are still beta contracts. Review release notes before updating an existing integration.

Bug reports should include the Bitburner version, the descriptor, a small telemetry sample, the dashboard log output, and reproduction steps.
