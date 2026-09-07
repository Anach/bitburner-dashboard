export const DEFAULT_FILE_PREVIEW_MAX_CHARS = 80000;
export const MIN_FILE_PREVIEW_MAX_CHARS = 1000;
export const MAX_FILE_PREVIEW_MAX_CHARS = 100000;

export function normalizeFilePreviewMaxChars(value) {
    const requested = Number(value);
    const normalized = Number.isFinite(requested) ? requested : DEFAULT_FILE_PREVIEW_MAX_CHARS;
    return Math.max(MIN_FILE_PREVIEW_MAX_CHARS, Math.min(MAX_FILE_PREVIEW_MAX_CHARS, Math.floor(normalized)));
}
