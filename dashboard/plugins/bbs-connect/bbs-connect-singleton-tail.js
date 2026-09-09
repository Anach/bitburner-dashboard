/**
 * Claim the single live instance of a standalone tail application.
 *
 * The lowest PID wins simultaneous launches. A later instance reopens the
 * existing process's tail (when it was closed) and exits before creating UI.
 */
export function claimSingletonTail(ns) {
    const current = ns.self();
    const instances = ns.ps(current.server)
        .filter((process) => process.filename === current.filename);
    if (instances.length <= 1) return true;

    const keeper = instances.reduce((oldest, process) =>
        !oldest || process.pid < oldest.pid ? process : oldest, null);
    if (keeper?.pid === current.pid) return true;

    // `run --tail` may have opened this duplicate before main() reached the guard.
    ns.ui.closeTail(current.pid);
    ns.ui.openTail(keeper.pid);
    return false;
}


