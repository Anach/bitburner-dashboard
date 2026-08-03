export function parseDashboardLaunchOptions(args = []) {
    const normalizedArgs = (Array.isArray(args) ? args : [])
        .map((arg) => String(arg ?? "").trim().toLowerCase())
        .filter(Boolean);
    return {
        isDaemon: !normalizedArgs.includes("once") && !normalizedArgs.includes("--once"),
        autoStart: normalizedArgs.includes("--auto-start"),
    };
}

export function getDashboardRestartArgs(args = []) {
    const launchOptions = parseDashboardLaunchOptions(args);
    return [
        launchOptions.isDaemon ? "loop" : "once",
        ...(launchOptions.autoStart ? ["--auto-start"] : []),
    ];
}