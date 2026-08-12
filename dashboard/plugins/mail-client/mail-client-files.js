const MAILBOX_FILE_EXTENSIONS = [".msg", ".lit", ".txt"];

export function isMailboxCandidate(filename) {
    if (typeof filename !== "string") return false;

    const normalized = filename.replace(/\\/g, "/").replace(/^\/+/, "");
    const comparable = normalized.toLowerCase();
    if (!MAILBOX_FILE_EXTENSIONS.some((extension) => comparable.endsWith(extension))) return false;

    // Text files are otherwise valid Mail Client content. Exclude conventional machine-owned
    // state namespaces by their generic shape rather than coupling Mail Client to any plugin or
    // external script name (for example, both data/ and <application>UserData/ are state stores).
    const directorySegments = comparable.split("/").slice(0, -1);
    if (directorySegments.some((segment) => segment === "data" || segment.endsWith("userdata"))) return false;
    return true;
}
