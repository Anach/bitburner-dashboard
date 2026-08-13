# Bitburner Automation Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A metadata-driven dashboard framework for [Bitburner](https://github.com/bitburner-official/bitburner-src). It turns a script tail into a responsive control surface for user-owned Netscript services without coupling the dashboard to those services.

The framework discovers declarative integration descriptors, reads JSON telemetry, and supplies the common UI: status and health, script controls, options, commands, graphs, resource cards, full-window views, logs, and file management. Your automation remains independent and continues to work when the dashboard is not running.

> [!IMPORTANT]
> This project is approaching public beta. Back up your Bitburner save and scripts before testing file-management or kill controls. The metadata contract may still change before a stable release.

<img width="1920" height="1019" alt="dash_overview_full" src="https://github.com/user-attachments/assets/b7680d8f-f899-4470-90d7-8ca83f87d88a" />

*A customized installation combining the dashboard framework with user-owned automation integrations. External services pictured here are examples of what the metadata API can support and are not bundled with the dashboard.*

## What the framework provides

- Responsive windowed, maximized, and minimized tail layouts.
- A native dashboard theme and an adapter that follows the active game theme.
- Metadata-discovered services with no service-specific imports in dashboard core.
- Generic start, stop, restart, edit, option, action, and requirement controls.
- A metadata-driven supervisor for integrated daemon services.
- JSON telemetry fields, quick statistics, gauges, history graphs, lists, and resource cards.
- Metadata-driven full-window overview, network-map, file-manager, and script-log views, plus retained embedded workspaces such as Mail Client.
- Health filtering and daemon/on-demand lifecycle presentation.
- Persistent dashboard options stored on `home`.
- Safe metadata parsing with `JSON.parse`; integration source is never evaluated.

No game DOM modification is required. The interface is rendered inside a normal Netscript tail window.

### Modular deployment

The framework remains usable with no external automation repository, and direct plugins can be removed without leaving broken menu entries or empty view surfaces. Select either image to view it at full resolution.

| Framework only | Framework with bundled plugins |
| --- | --- |
| <img width="1920" height="1019" alt="dash_no_plugins" src="https://github.com/user-attachments/assets/67866937-f1b1-4943-b81f-ed62980d223f" /> | <img width="1920" height="1019" alt="dash_plugin_mngr" src="https://github.com/user-attachments/assets/e4342676-2f05-43eb-a053-78a0ca7f2f27" /> |
| Core dashboard, configuration, and service-management surfaces only. | Plugin discovery and lifecycle controls without user-owned script integrations. |

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
| `dashboard/service-supervisor.js` | 4.50 GB | Supervises daemon start/restart (optional). |
| **Combined steady footprint** | **9.40 GB** | Dashboard + supervisor running together, the normal steady state. |
| `dashboard/action-worker.js` | 8.50 GB | Transient only — a worker instance starts on demand for a script/kill/file action and exits immediately after, never part of the permanent footprint. |

Included plugins (each independently removable; only pay for what you keep installed):

| Plugin runtime | Pre-SF4 RAM | With SF4 RAM | Notes |
| --- | ---: | ---: | --- |
| Player Stats (`dashboard/plugins/player-stats/player-stats.js`) | 10.10 GB | 2.60 GB | Optional Singularity-backed player details account for the difference. |
| Network Navigator parent (`dashboard/plugins/network-map/network-navigator.js`) | 9.20 GB | 9.20 GB | Owns network telemetry and launches the capability-gated child when Singularity is available. |
| Network Navigator Singularity child (`dashboard/plugins/network-map/network-navigator-singularity.js`) | 230.40 GB | 20.40 GB | Not normally launched without Singularity access. Parent + child cost **29.60 GB** in the normal qualified state. |
| Mail Client Scanner (`dashboard/plugins/mail-client/mail-client-scanner.js`) | 5.25 GB | 5.25 GB | |
| Mail Client Darknet Agent (`dashboard/plugins/mail-client/mail-client-darknet-agent.js`) | 7.65 GB | 7.65 GB | Self-propagates onto darknet servers via `ns.exec`; not a persistent daemon on `home`. |
| Mail Client Reader (`dashboard/plugins/mail-client/mail-client-reader.js`) | 1.85 GB | 1.85 GB | One-shot helper, `ns.exec`'d onto reachable network hosts as needed; not a persistent daemon. |
| Included view descriptors | 1.60 GB each | 1.60 GB each | Pure metadata with no `main()`; the dashboard reads these files rather than launching them, so they do not create separate processes. |

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

Dashboard Restart preserves whether `--no-auto-start` was active. Starting without the flag starts (or leaves alone, if already running) the supervisor. No `init` script is required; users may launch the dashboard from their own startup script if desired. Its theme, text size, startup window mode, unlock-glyph presentation, Player Stats visibility, and Script List exclusions can be changed under **Configuration → Dashboard Options**.

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

<img width="1920" height="1019" alt="dash_report_glyphs" src="https://github.com/user-attachments/assets/d00aa78e-204b-48a9-823c-5a18fe26e37e" />

*A user-owned integration using metadata-defined categories, subviews, unlock glyphs, requirements, and telemetry. The runtime remains independent of the dashboard.*

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

A metadata-only service uses `"adapter": "static"` and `"daemon": false`. It does not pair with
or start a runtime file; its descriptor alone creates the menu entry and panels. Static services
are intended for reference/lookup surfaces assembled from generic descriptor contributions.

A launch-only tool uses `"adapter": "shortcut"` and a unique `"shortcutId"`. It pairs with a
runtime by the same basename convention, but creates no service, status, options, health, or
subview panels. Clicking its main-menu entry starts it when stopped or restarts it when already
running without changing the current dashboard selection. Shortcut launches are temporary by
default; set `"temporary": false` only when game-save restoration is explicitly intended.

```js
export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "shortcut",
    "shortcutId": "software.themeEditor",
    "menuGroup": "software",
    "menuLabel": "Theme Editor",
    "description": "Open the theme editor tail.",
    "temporary": true,
    "launchArgs": []
};
```

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
    "menuUnlocks": [],
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

All descriptors contributing to the same category should declare the same label and optional order. Conflicts are reported in the browser console and resolved deterministically. Entries within each category sort alphabetically by their displayed label. An entry may set numeric `menuOrder`; lower values appear first, so `"menuOrder": -100` provides a simple top pin. Entries sharing an order remain alphabetical. **Software**, **Configuration**, and **Services** remain framework-pinned at the bottom of the menu; all other categories are metadata-driven.

### Contributing telemetry to a full-window view

An integration can use `viewTelemetry` to merge its own telemetry records into a collection owned by a full-window view. The source script publishes ready-to-display records; the dashboard only performs the descriptor-defined keyed merge and contains no knowledge of the contributing service:

```js
"viewTelemetry": [
    {
        "viewId": "network",
        "sourcePath": "networkNodes",
        "targetPath": "maps.network.nodes",
        "sourceIdKey": "hostname",
        "targetIdKey": "hostname",
        "defaultValues": { "customAlert": false },
        "fields": ["customAlert", { "sourceKey": "summary", "targetKey": "customSummary" }],
        "metricSets": {
            "network": [{ "key": "customSummary", "label": "Custom status" }]
        },
        "nodeFilters": [
            { "id": "custom-alerts", "label": "Custom alerts", "key": "customAlert", "accent": "#ff7bd0" }
        ]
    }
]
```

For that example the integration's normal telemetry JSON would contain `"networkNodes": [{ "hostname": "n00dles", "customAlert": true, "summary": "Investigate" }]`. `fields` may contain a field name copied as-is or an explicit `sourceKey`/`targetKey` mapping. `defaultValues`, `metricSets`, and `nodeFilters` are optional. Contributions disappear with their integration descriptor.

### Contributing telemetry to another service panel

An integration can use `serviceTelemetry` to add rows from its own telemetry snapshot to another service's normal status panel. This keeps the receiving service generic: it does not import the integration or name its service ID.

```js
"serviceTelemetry": [
    {
        "targetServiceId": "hardware.home",
        "panelId": "infrastructure",
        "fields": [
            { "key": "homeCores", "label": "Cores", "format": "number", "tone": "neutral", "emptyValue": "-" }
        ]
    }
]
```

Each field uses the normal telemetry-field `key`, `label`, `format`, and `tone` contract. `emptyValue` optionally keeps a placeholder row visible before telemetry exists, and `sourceLabel` can override the contributor's menu label used for attribution. Contributions disappear with their integration descriptor.

### Contributing rows to another service table

A target service declares a generic `tables[]` definition (columns, sorting, conflict key, and
summary aggregates). Any installed integration can contribute rows through `serviceTables[]`
without the target importing or naming the contributor:

```js
"serviceTables": [
    {
        "targetServiceId": "global.portRegistry",
        "tableId": "ports",
        "rows": [
            {
                "port": 31,
                "constant": "MY_SERVICE_COMMAND_PORT",
                "service": "My Service",
                "channel": "Command",
                "repo": "scripts",
                "owner": "automation/my-service.js"
            }
        ]
    }
]
```

The framework merges and sorts rows using only the target's table definition. Repeated values of
its `conflictKey` are highlighted and counted. A table may also declare `statusPanelId` and generic
`statusFields` aggregates (`count`, `distinctCount`, `maxPlusOne`, or `conflictCount`) to expose a
compact status panel from the same merged rows. Contributions disappear with their descriptor, so
the table always represents the installed integration set.

Use the `script` adapter for the normal script-oriented status view, including path and RAM information. The `metadata` adapter is available for a more telemetry-focused presentation. Use the `static` adapter for a menu service with panels but no Netscript process. Use the `shortcut` adapter for a menu entry that only starts/restarts its paired script and never creates a service or dashboard panel.

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
    { "id": "notifications", "label": "Notifications", "optionKey": "notifications", "type": "boolean-select" }
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

Service requirements with a recognized API, program, or stock type also appear as compact,
color-coded unlock markers beside the service's main-menu entry. Use the optional `"menuUnlocks"`
array for informative markers that should not qualify, gate, or appear in the Requirements panel.
It accepts the same `{ "type", "id" }` vocabulary as `"requirements"`; repeated unlock families,
such as several stock-access levels, Source Files, or augmentations, collapse into one marker.
For descriptive coverage of all Source Files or augmentations, `"menuUnlocks"` may use `"id": "*"`.
Keep lifecycle requirements in `"requirements"` and descriptive feature coverage in
`"menuUnlocks"`. By default, each row displays no more than five glyphs; each health exclamation
mark and the runtime-status dot consume slots before excess unlock markers collapse into a `+N`
marker whose tooltip contains the remaining key. Dashboard Options can disable unlock glyphs,
change the limit and opacity, or restrict them to main-menu or submenu rows. Panels may also
declare `"menuUnlocks"` or ordinary `"requirements"`; their markers appear at the right of the
corresponding submenu button.

Requirements declared on the descriptor gate and describe the whole service. A panel may instead
declare its own `"requirements"` array; those requirements appear only in that panel and do not
prevent the parent service from starting. When a panel represents a separately running child,
set `"runtimeScript"` to its Home-relative path so the panel reports the child's actual running
state rather than inheriting the parent service's state.

## Metadata capabilities

The example intentionally demonstrates the most common integration path. The framework also supports:

- Additional telemetry snapshots merged with `telemetry.sources`.
- Quick-stat fields with `overview`, `overviewLabel`, and `overviewOrder`.
- Circular quick gauges with `telemetry.overviewGauges`.
- `graph`, `string-list`, `items`, `message`, and `resource-cards` sections.
- Numeric, On/Off dropdown, and general select inputs.
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

### Embedded workspace providers

<img width="1920" height="1019" alt="image" src="https://github.com/user-attachments/assets/6d176c28-d444-46ca-976a-fbe3ba3d21ac" />

*An example BBS Connect plugin - not included*

An integration with the `workspace` adapter may register a scripts-owned React component through `dashboard/libs/workspace-provider.js`. The provider process owns its controller, long-lived state, and any worker or resource bridge; the dashboard only supplies the workspace slot, current theme, and input-focus callback.

Interactive providers should register with `persistent: true`. The framework then renders the provider into a retained `ReactDOM` root whose lifetime follows the provider registration rather than the dashboard's replaceable `printRaw()` tree. Dashboard telemetry can continue refreshing without remounting a game canvas or resetting component state, and keyboard focus is restored to the retained control after the outer dashboard tree is replaced. Navigating away merely detaches the retained root, navigating back reattaches it, and unregistering the provider performs the final React cleanup.

Provider React handlers must not call Netscript functions directly. Queue Netscript-backed work to the provider process and perform it from that process's main loop, as concurrent Netscript calls from UI callbacks can terminate a script.

The included Mail Client is the reference for converting an existing dashboard application to this layout. Its scanner daemon remains the sole Netscript owner, publishes live snapshots to an in-memory workspace controller, and drains UI commands from its normal loop. The retained Mail Client UI occupies the standard center workspace while metadata-contributed Player Status remains visible beside it; no second polling process or full-window renderer branch is required.

## Full-window views

Full-window pages use `DASHBOARD_VIEW_METADATA` descriptors rather than service descriptors. Supported renderers currently include:

- `system-overview`
- `network-map`
- `file-manager`
- `script-log`

<img width="1920" height="1019" alt="dash_net_map" src="https://github.com/user-attachments/assets/f25a9981-2177-43c9-8cce-971b292407bb" />

*Network Navigator demonstrates a metadata-discovered full-window view with interactive topology, server details, route controls, and integration-contributed telemetry.*

### Included utility views

| File Manager | Script Logs |
| --- | --- |
| <img width="1920" height="1019" alt="dash_file_mngr" src="https://github.com/user-attachments/assets/3f568cd8-d3e9-49ec-98b6-bc0e83b63b99" /> | <img width="1920" height="1019" alt="dash_log_viewer" src="https://github.com/user-attachments/assets/5fdb3951-5dc5-4b3e-9923-be0e592c6a97" /> |
| Browse and safely manage the `home` filesystem. | Search and inspect output from running and completed scripts. |

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
