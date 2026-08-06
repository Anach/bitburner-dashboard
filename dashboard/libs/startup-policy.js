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