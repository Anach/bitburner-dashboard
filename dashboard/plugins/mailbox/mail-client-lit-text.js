// ns.read() returns lore (.lit) content as HTML markup (Bitburner renders it via
// renderToStaticMarkup internally) - strip it down to readable plain text for Mail Client.
export function stripLitMarkup(text) {
    if (typeof text !== "string" || !text.includes("<")) return text;
    return text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&#x27;/gi, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, "\"")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
