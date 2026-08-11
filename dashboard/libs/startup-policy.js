export function parseDashboardLaunchOptions(args = []) {
    const normalizedArgs = (Array.isArray(args) ? args : [])
        .map((arg) => String(arg ?? "").trim().toLowerCase())
        .filter(Boolean);
    return {
        isDaemon: !normalizedArgs.includes("once") && !normalizedArgs.includes("--once"),
        // Every daemon integration now has its own Autostart toggle, so the blanket
        // command-line gate defaults on; --no-auto-start remains as a manual escape hatch.
        autoStart: !normalizedArgs.includes("--no-auto-start"),
    };
}

export function getDashboardRestartArgs(args = []) {
    const launchOptions = parseDashboardLaunchOptions(args);
    return [
        launchOptions.isDaemon ? "loop" : "once",
        ...(launchOptions.autoStart ? [] : ["--no-auto-start"]),
    ];
}

// The launch flag is a global permission, not a replacement for the supervisor daemon's own
// Autostart toggle. Both must allow startup so restarting the dashboard cannot silently revive a
// deliberately stopped supervisor (which would then restart every enabled integration service).
export function shouldAutoStartServiceSupervisor(autoStart, supervisorAutostartEnabled) {
    return autoStart === true && supervisorAutostartEnabled === true;
}
