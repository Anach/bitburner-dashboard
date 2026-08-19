// Manual content lives outside integration descriptors, one small named file per declared manual -
// each service opts in by setting pluginMetadata.manualFile (or, for the framework-owned global
// entries, a manualFile field directly on their DASHBOARD_SERVICES literal, or on a
// DASHBOARD_VIEW_METADATA object for full-window views) to a short name. Absence of that field means
// the service has no manual and gets no tab/button at all - see isManualEligible and each full-window
// view's own hasManual check in automation-dashboard.jsx and dashboard/renderers/*.
//
// Read via ns.read()/ns.fileExists() (both free) rather than statically imported, since
// automation-dashboard.jsx must never import from the private bitburner-scripts repo, and this is
// genuinely runtime data, not source - a missing file just contributes nothing.
//
// Both repos stage their whole dashboard/ tree onto the same merged home filesystem, so a
// scripts-repo integration and a dashboard-repo plugin could in principle both pick the same
// manualFile name - segregated into two folders so that can never silently overwrite a file on disk
// the way two repos both defaulting to dashboard/i18n/en.json once could have. A same-name collision
// across folders just means the scripts/ file wins the lookup (checked first); the framework/ file
// becomes unreachable at that name rather than being destroyed, so it's a debuggable ordering issue,
// not silent data loss.
const MANUAL_FOLDERS = ["scripts", "framework"];

function readManualFile(ns, name) {
    for (const folder of MANUAL_FOLDERS) {
        const path = `dashboard/i18n/manual/${folder}/${name}.json`;
        try {
            if (!ns.fileExists(path, "home")) continue;
            const raw = ns.read(path);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        } catch (error) {
            // Malformed file under this name - fall through and try the other folder.
        }
    }
    return null;
}

// declarations: [{ id: serviceId-or-viewId, manualFile: "name" }, ...], built by the caller from
// every currently-known service/view's own manualFile field. Keeping this a pure "read what I'm told
// to read" function, with no coupling to how services/views are discovered or merged, matches how
// this file was already documented as "seeding the pattern for dashboard-wide translation later."
export function loadManualStrings(ns, declarations = []) {
    const merged = {};
    for (const declaration of Array.isArray(declarations) ? declarations : []) {
        const id = typeof declaration?.id === "string" ? declaration.id : "";
        const name = typeof declaration?.manualFile === "string" ? declaration.manualFile.trim() : "";
        if (!id || !name) continue;
        const content = readManualFile(ns, name);
        if (content) merged[id] = content;
    }
    return merged;
}

// A bare string is one untitled section; the structured form is an array of {title, body} for
// services that bundle multiple distinct sub-features (e.g. Faction Manager: SF4 management, Gang
// automation, Gang Bootstrap, reputation-share filler - four different "when would I use this"
// answers that don't belong in one undifferentiated paragraph).
export function normalizeManualSections(manual) {
    if (typeof manual === "string" && manual.trim().length > 0) {
        return [{ title: "", body: manual }];
    }
    if (Array.isArray(manual)) {
        return manual
            .filter((section) => section && typeof section.body === "string" && section.body.trim().length > 0)
            .map((section) => ({ title: typeof section.title === "string" ? section.title : "", body: section.body }));
    }
    return [];
}
