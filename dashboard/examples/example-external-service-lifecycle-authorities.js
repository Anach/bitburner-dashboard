// Example: optional external Service Supervisor lifecycle authority.
//
// This file is documentation only. A companion source can stage the real JSON file at:
//
//   dashboard/external-service-lifecycle-authorities.json
//
// The Dashboard stays fully standalone when that file is absent or invalid. Each authority maps
// its unique ID to one short-lived state file and the exact descriptor service IDs it may request.
// A request still does nothing unless the target descriptor declares
// `externalLifecycle.states` containing the requested "running" or "stopped" state. The
// supervisor owns the final process action; no external writer receives direct kill/run access.
export const EXAMPLE_EXTERNAL_SERVICE_LIFECYCLE_AUTHORITIES = {
    "authorities": [
        {
            "id": "example-controller",
            "statePath": "data/example_external_lifecycle_state.json",
            "serviceIds": [
                "example.optionalService"
            ]
        }
    ]
};
