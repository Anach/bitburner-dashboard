export const DASHBOARD_THEME_MODE_DASHBOARD = "Dashboard";
export const DASHBOARD_THEME_MODE_GAME = "Follow game";
export const DASHBOARD_THEME_MODES = [DASHBOARD_THEME_MODE_DASHBOARD, DASHBOARD_THEME_MODE_GAME];
export const DASHBOARD_TEXT_SIZE_GAME = "Game UI";
export const DASHBOARD_TEXT_SIZE_COMFORTABLE = "Comfortable";
export const DASHBOARD_TEXT_SIZE_LARGE = "Large";
export const DASHBOARD_TEXT_SIZE_MODES = [
    DASHBOARD_TEXT_SIZE_GAME,
    DASHBOARD_TEXT_SIZE_COMFORTABLE,
    DASHBOARD_TEXT_SIZE_LARGE,
];

const DASHBOARD_BASE_FONT_SIZE = 13;
const FALLBACK_GAME_STYLES = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: 14,
    tailFontSize: 14,
    lineHeight: 1.25,
};

const FALLBACK_GAME_THEME = {
    primarylight: "#8ef0b5",
    primary: "#6ee7a8",
    primarydark: "#355435",
    successlight: "#8ef0b5",
    success: "#6ee7a8",
    successdark: "#355435",
    errorlight: "#ff9a9a",
    error: "#ff7a7a",
    errordark: "#722424",
    secondarylight: "#e4f8e9",
    secondary: "#9ab0a0",
    secondarydark: "#50665d",
    warninglight: "#ffd88a",
    warning: "#ffc66c",
    warningdark: "#724c20",
    infolight: "#8fc5ff",
    info: "#6cb4ff",
    infodark: "#183c60",
    welllight: "#101c18",
    well: "#07100d",
    white: "#ffffff",
    black: "#000000",
    hp: "#ff7a7a",
    money: "#ffd17a",
    hack: "#8ef0b5",
    combat: "#e4f8e9",
    cha: "#c084fc",
    int: "#8fc5ff",
    rep: "#e4f8e9",
    disabled: "#789589",
    backgroundprimary: "#020504",
    backgroundsecondary: "#050908",
    button: "#101c18",
    maplocation: "#e4f8e9",
};

const COLOR_TOKEN_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*[^)]+\)/g;
const THEMED_COLOR_PROPS = new Set(["color", "fill", "stroke", "stopColor", "floodColor", "lightingColor"]);
const THEME_ROLE_PROP = "data-dashboard-theme-role";
const TYPOGRAPHY_ELEMENT_TYPES = new Set(["button", "input", "select", "textarea"]);
const PLAYER_STAT_THEME_ROLE_PREFIX = "player-stat-";
const PLAYER_STAT_THEME_KEYS = new Set(["hp", "money", "hack", "combat", "cha", "int", "rep", "primary", "secondary", "maplocation"]);

function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
}

function parseHexColor(value) {
    const raw = String(value ?? "").trim().slice(1);
    if (![3, 4, 6, 8].includes(raw.length) || !/^[0-9a-fA-F]+$/.test(raw)) return null;
    const expanded = raw.length <= 4
        ? raw.split("").map((character) => `${character}${character}`).join("")
        : raw;
    return {
        r: Number.parseInt(expanded.slice(0, 2), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        b: Number.parseInt(expanded.slice(4, 6), 16),
        a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
}

function parseFunctionalColor(value) {
    const match = String(value ?? "").trim().match(/^rgba?\(\s*([^)]+)\)$/i);
    if (!match) return null;
    const parts = match[1].split(",").map((part) => part.trim());
    if (parts.length < 3 || parts.length > 4) return null;
    const channels = parts.slice(0, 3).map((part) => Number(part));
    if (channels.some((channel) => !Number.isFinite(channel))) return null;
    const alpha = parts.length === 4 ? Number(parts[3]) : 1;
    if (!Number.isFinite(alpha)) return null;
    return {
        r: clamp(Math.round(channels[0]), 0, 255),
        g: clamp(Math.round(channels[1]), 0, 255),
        b: clamp(Math.round(channels[2]), 0, 255),
        a: clamp(alpha),
    };
}

function parseColor(value) {
    const raw = String(value ?? "").trim();
    if (raw.startsWith("#")) return parseHexColor(raw);
    if (/^rgba?\(/i.test(raw)) return parseFunctionalColor(raw);
    return null;
}

function formatColor(color, alpha = color?.a ?? 1) {
    if (!color) return "";
    const r = clamp(Math.round(color.r), 0, 255);
    const g = clamp(Math.round(color.g), 0, 255);
    const b = clamp(Math.round(color.b), 0, 255);
    const normalizedAlpha = clamp(alpha);
    if (normalizedAlpha < 0.999) {
        return `rgba(${r}, ${g}, ${b}, ${Number(normalizedAlpha.toFixed(3))})`;
    }
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function mixColors(left, right, ratio) {
    const amount = clamp(ratio);
    return {
        r: left.r + ((right.r - left.r) * amount),
        g: left.g + ((right.g - left.g) * amount),
        b: left.b + ((right.b - left.b) * amount),
        a: 1,
    };
}

function getColorProfile(color) {
    const red = color.r / 255;
    const green = color.g / 255;
    const blue = color.b / 255;
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const delta = maximum - minimum;
    const lightness = (maximum + minimum) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));
    let hue = 0;
    if (delta > 0) {
        if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
        else if (maximum === green) hue = 60 * (((blue - red) / delta) + 2);
        else hue = 60 * (((red - green) / delta) + 4);
    }
    if (hue < 0) hue += 360;
    return {
        hue,
        saturation,
        chroma: delta,
        lightness,
        luminance: (0.2126 * red) + (0.7152 * green) + (0.0722 * blue),
    };
}

function classifySemanticColor(profile) {
    // The dashboard palette contains many subtly green or blue structural greys.
    // Treat only deliberately chromatic colours as semantic accents.
    if (profile.saturation < 0.36 || profile.chroma < 0.07) return "neutral";
    if (profile.hue < 18 || profile.hue >= 344) return "error";
    if (profile.hue < 76) return "warning";
    if (profile.hue < 174) return "primary";
    if (profile.hue < 258) return "info";
    return "secondary";
}

function normalizeGameTheme(rawTheme = {}) {
    const normalized = {};
    for (const [key, fallback] of Object.entries(FALLBACK_GAME_THEME)) {
        const candidate = String(rawTheme?.[key] ?? "").trim();
        normalized[key] = parseColor(candidate) ? candidate : fallback;
    }
    return normalized;
}

function finiteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeGameStyles(rawStyles = {}) {
    return {
        fontFamily: String(rawStyles?.fontFamily ?? "").trim() || FALLBACK_GAME_STYLES.fontFamily,
        fontSize: clamp(finiteNumber(rawStyles?.fontSize, FALLBACK_GAME_STYLES.fontSize), 10, 28),
        tailFontSize: clamp(finiteNumber(rawStyles?.tailFontSize, FALLBACK_GAME_STYLES.tailFontSize), 10, 28),
        lineHeight: clamp(finiteNumber(rawStyles?.lineHeight, FALLBACK_GAME_STYLES.lineHeight), 1, 2),
    };
}

export function normalizeDashboardTextSizeMode(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === DASHBOARD_TEXT_SIZE_LARGE.toLowerCase()) return DASHBOARD_TEXT_SIZE_LARGE;
    if (normalized === DASHBOARD_TEXT_SIZE_GAME.toLowerCase()) return DASHBOARD_TEXT_SIZE_GAME;
    return DASHBOARD_TEXT_SIZE_COMFORTABLE;
}

function buildDashboardTypography(rawStyles, textSizeMode, followGame, maximized) {
    const gameStyles = normalizeGameStyles(rawStyles);
    const mode = normalizeDashboardTextSizeMode(textSizeMode);
    const gameSize = gameStyles.fontSize;
    const gameSurfaceSize = Math.max(gameStyles.fontSize, gameStyles.tailFontSize);
    const comfortableSize = Math.min(22, gameSurfaceSize + 1);
    const maximizedFontSize = mode === DASHBOARD_TEXT_SIZE_LARGE
        ? Math.min(24, gameSurfaceSize + 2)
        : mode === DASHBOARD_TEXT_SIZE_COMFORTABLE
            ? comfortableSize
            : gameSize;
    const rootFontSize = maximized ? maximizedFontSize : DASHBOARD_BASE_FONT_SIZE;
    return {
        mode,
        fontFamily: followGame ? gameStyles.fontFamily : FALLBACK_GAME_STYLES.fontFamily,
        rootFontSize,
        fontScale: rootFontSize / DASHBOARD_BASE_FONT_SIZE,
        lineHeight: gameStyles.lineHeight,
    };
}

function buildParsedPalette(gameTheme) {
    return Object.fromEntries(Object.entries(gameTheme).map(([key, value]) => [key, parseColor(value)]));
}

function getSemanticTarget(palette, semantic, level = "main") {
    const suffix = level === "light" ? "light" : level === "dark" ? "dark" : "";
    const key = semantic === "neutral"
        ? (level === "light" ? "primarylight" : level === "dark" ? "secondarydark" : "secondary")
        : `${semantic}${suffix}`;
    return palette[key] ?? palette.primary ?? parseColor(FALLBACK_GAME_THEME.primary);
}

function adaptBackgroundColor(profile, semantic, palette, elementType = "", themeRole = "") {
    const background = profile.luminance < 0.025
        ? palette.backgroundprimary
        : palette.backgroundsecondary;
    if (semantic === "neutral") {
        const blackButtonSurface = themeRole === "navigation-group" || themeRole === "navigation-item" || themeRole === "map-node";
        if (String(elementType ?? "").toLowerCase() === "button" && !blackButtonSurface) return palette.button;
        return palette.backgroundprimary;
    }
    const semanticTarget = getSemanticTarget(palette, semantic, profile.luminance > 0.45 ? "main" : "dark");
    const tintStrength = clamp(0.1 + (profile.saturation * 0.24) + (profile.luminance * 0.16), 0.1, 0.42);
    return mixColors(background, semanticTarget, tintStrength);
}

function adaptForegroundColor(profile, semantic, palette) {
    if (semantic === "neutral") {
        if (profile.luminance >= 0.72) return palette.secondarylight;
        if (profile.luminance >= 0.42) return palette.secondary;
        return palette.disabled;
    }
    const level = profile.luminance >= 0.7 ? "light" : profile.luminance < 0.32 ? "dark" : "main";
    return getSemanticTarget(palette, semantic, level);
}

function adaptDecorationColor(profile, semantic, palette, property) {
    if (semantic === "neutral") {
        if (property === "fill" && profile.luminance < 0.12) return palette.backgroundsecondary;
        if (profile.luminance < 0.03) return palette.black;
        if (profile.luminance < 0.42) return palette.secondarydark;
        if (profile.luminance >= 0.72) return palette.secondarylight;
        return palette.secondary;
    }
    const level = profile.luminance >= 0.72 ? "light" : profile.luminance < 0.3 ? "dark" : "main";
    return getSemanticTarget(palette, semantic, level);
}

function adaptColorToken(token, propertyName, theme, themeRole = "", elementType = "") {
    const source = parseColor(token);
    if (!source) return token;
    const profile = getColorProfile(source);
    let semantic = classifySemanticColor(profile);
    const property = String(propertyName ?? "").toLowerCase();
    const subtleStructuralBorder = property.includes("border")
        && semantic === "info"
        && source.a <= 0.42;
    if (subtleStructuralBorder) {
        return formatColor(theme.palette.white ?? theme.palette.secondarylight, source.a);
    }
    if ((themeRole === "menu-item" || themeRole === "navigation-item" || themeRole === "stat-value") && property === "color" && semantic === "primary") {
        semantic = "neutral";
    }
    let target;
    if (property.includes("background")) {
        target = adaptBackgroundColor(profile, semantic, theme.palette, elementType, themeRole);
    } else if (property === "color" || property.endsWith("textfillcolor")) {
        target = adaptForegroundColor(profile, semantic, theme.palette);
    } else {
        target = adaptDecorationColor(profile, semantic, theme.palette, property);
    }
    return formatColor(target, source.a);
}

function adaptStyleValue(value, propertyName, theme, themeRole = "", elementType = "") {
    if (typeof value !== "string" || !theme?.followGame) return value;
    return value.replace(COLOR_TOKEN_PATTERN, (token) => adaptColorToken(token, propertyName, theme, themeRole, elementType));
}

function scalePixelValue(value, scale) {
    if (typeof value === "number") return value * scale;
    if (typeof value !== "string") return value;
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px)?$/i);
    if (!match) return value;
    const scaled = Number((Number(match[1]) * scale).toFixed(2));
    return match[2] ? `${scaled}px` : String(scaled);
}

function adaptTypographyStyle(style, theme, elementType) {
    const typography = theme?.typography;
    if (!typography) return style;
    if (style.fontFamily) style.fontFamily = typography.fontFamily;
    if (style.fontSize !== undefined && Math.abs(typography.fontScale - 1) > 0.001) {
        style.fontSize = scalePixelValue(style.fontSize, typography.fontScale);
    }
    if (TYPOGRAPHY_ELEMENT_TYPES.has(String(elementType ?? "").toLowerCase()) && Math.abs(typography.fontScale - 1) > 0.001) {
        if (style.height !== undefined) style.height = scalePixelValue(style.height, typography.fontScale);
        if (style.minHeight !== undefined) style.minHeight = scalePixelValue(style.minHeight, typography.fontScale);
    }
    return style;
}

function getAdaptedBorderColor(style, theme) {
    if (typeof style.borderColor === "string" && style.borderColor) return style.borderColor;
    const borderColors = typeof style.border === "string" ? style.border.match(COLOR_TOKEN_PATTERN) : null;
    return borderColors?.at(-1) ?? formatColor(theme.palette.secondarydark);
}

function adaptFollowGameGeometry(style, theme, themeRole) {
    for (const [propertyName, value] of Object.entries(style)) {
        if (!propertyName.toLowerCase().endsWith("radius")) continue;
        const raw = String(value ?? "").trim().toLowerCase();
        const numeric = Number.parseFloat(raw);
        const circular = raw.includes("%") || (Number.isFinite(numeric) && numeric >= 900);
        if (!circular) style[propertyName] = typeof value === "number" ? 0 : "0px";
    }

    if (theme.maximized && themeRole === "app-frame") {
        style.border = "none";
        delete style.borderColor;
        style.borderRadius = "0px";
        return style;
    }

    if (theme.maximized && themeRole === "hero-frame") {
        const borderColor = getAdaptedBorderColor(style, theme);
        style.border = "none";
        delete style.borderColor;
        style.borderBottom = `1px solid ${borderColor}`;
        style.background = theme.gameTheme.backgroundprimary;
        return style;
    }

    if (theme.maximized && themeRole === "quick-stat") {
        const borderColor = getAdaptedBorderColor(style, theme);
        style.border = "none";
        delete style.borderColor;
        style.borderBottom = `2px solid ${borderColor}`;
        style.background = theme.gameTheme.backgroundprimary;
        return style;
    }

    if (theme.maximized && themeRole === "workspace-column-first") {
        style.border = "none";
        delete style.borderColor;
        style.background = theme.gameTheme.backgroundprimary;
        return style;
    }

    if (theme.maximized && themeRole === "workspace-column") {
        const divider = formatColor(theme.palette.white ?? theme.palette.secondarylight, 0.28);
        style.border = "none";
        delete style.borderColor;
        style.borderLeft = `1px solid ${divider}`;
        style.background = theme.gameTheme.backgroundprimary;
        return style;
    }

    if (theme.maximized && themeRole === "card-frame") {
        style.border = "none";
        delete style.borderColor;
        style.background = theme.gameTheme.backgroundprimary;
        return style;
    }

    if (themeRole === "data-row") {
        const borderColor = getAdaptedBorderColor(style, theme);
        style.border = "none";
        delete style.borderColor;
        style.borderLeft = `2px solid ${borderColor}`;
        return style;
    }

    if (themeRole === "nested-section" || themeRole === "graph-panel") {
        const borderColor = getAdaptedBorderColor(style, theme);
        style.border = "none";
        delete style.borderColor;
        style.borderTop = `1px solid ${borderColor}`;
        return style;
    }

    if (themeRole === "menu-group") {
        style.border = "none";
        delete style.borderColor;
        return style;
    }

    if (themeRole === "selector-frame") {
        style.border = "none";
        delete style.borderColor;
        style.background = "transparent";
        style.padding = "3px 0";
    }

    if (themeRole === "data-heading") {
        style.color = theme.gameTheme.primary;
    }

    if (themeRole === "data-value") {
        const color = parseColor(style.color);
        const semantic = color ? classifySemanticColor(getColorProfile(color)) : "neutral";
        if (semantic !== "warning" && semantic !== "error") {
            style.color = theme.gameTheme.secondary;
        }
    }
    if (themeRole.startsWith(PLAYER_STAT_THEME_ROLE_PREFIX)) {
        const themeKey = themeRole.slice(PLAYER_STAT_THEME_ROLE_PREFIX.length);
        if (PLAYER_STAT_THEME_KEYS.has(themeKey) && theme.gameTheme[themeKey]) {
            if (style.color !== undefined) style.color = theme.gameTheme[themeKey];
            if (style.background !== undefined) style.background = theme.gameTheme[themeKey];
            if (style.backgroundColor !== undefined) style.backgroundColor = theme.gameTheme[themeKey];
        }
    }
    return style;
}

export function adaptDashboardColorValue(value, propertyName, theme, themeRole = "", elementType = "") {
    return adaptStyleValue(value, propertyName, theme, themeRole, elementType);
}

export function normalizeDashboardThemeMode(value) {
    return String(value ?? "").trim().toLowerCase() === DASHBOARD_THEME_MODE_GAME.toLowerCase()
        ? DASHBOARD_THEME_MODE_GAME
        : DASHBOARD_THEME_MODE_DASHBOARD;
}

export function getGameThemeSignature(rawTheme = {}) {
    const theme = normalizeGameTheme(rawTheme);
    return JSON.stringify(theme);
}

export function getGameStylesSignature(rawStyles = {}) {
    return JSON.stringify(normalizeGameStyles(rawStyles));
}

export function buildDashboardTheme(mode, rawGameTheme = {}, config = {}) {
    const normalizedMode = normalizeDashboardThemeMode(mode);
    const gameTheme = normalizeGameTheme(rawGameTheme);
    const followGame = normalizedMode === DASHBOARD_THEME_MODE_GAME;
    const maximized = Boolean(config.maximized);
    const typography = buildDashboardTypography(config.gameStyles, config.textSizeMode, followGame, maximized);
    return {
        mode: normalizedMode,
        followGame,
        maximized,
        gameTheme,
        typography,
        palette: buildParsedPalette(gameTheme),
        signature: `${normalizedMode}:${followGame ? JSON.stringify(gameTheme) : "dashboard"}:${JSON.stringify(typography)}:${maximized ? "max" : "window"}`,
        styleCache: new WeakMap(),
    };
}

export function adaptDashboardStyle(style, theme, elementType = "", themeRole = "") {
    if (!style || typeof style !== "object" || Array.isArray(style)) return style;
    const removeWindowedAppFrameBorder = !theme?.maximized && themeRole === "app-frame";
    const dashboardFrameStyle = !theme?.followGame && (themeRole === "card-frame" || themeRole === "hero-frame");
    const hasTypographyAdaptation = Boolean(theme?.typography && (
        Math.abs(theme.typography.fontScale - 1) > 0.001
        || style.fontFamily
    ));
    if (!theme?.followGame && !hasTypographyAdaptation && !removeWindowedAppFrameBorder && !dashboardFrameStyle) return style;
    const cacheKey = `${String(elementType ?? "")}:${String(themeRole ?? "")}`;
    const styleCache = theme.styleCache?.get(style);
    const cached = styleCache?.get(cacheKey);
    if (cached) return cached;
    let adapted = Object.fromEntries(
        Object.entries(style).map(([propertyName, value]) => [propertyName, adaptStyleValue(value, propertyName, theme, themeRole, elementType)])
    );
    adapted = adaptTypographyStyle(adapted, theme, elementType);
    if (!theme?.followGame && themeRole === "card-frame") {
        adapted.border = "1px solid rgba(108, 180, 255, 0.24)";
        adapted.borderRadius = "8px";
        adapted.background = "linear-gradient(145deg, rgba(12, 28, 22, 0.98), rgba(10, 17, 29, 0.97))";
        adapted.boxShadow = "inset 0 1px 0 rgba(210, 240, 255, 0.04)";
    }
    if (!theme?.followGame && themeRole === "hero-frame") {
        adapted.border = "1px solid rgba(108, 180, 255, 0.24)";
        adapted.borderBottom = "1px solid rgba(108, 180, 255, 0.24)";
        adapted.borderRadius = "8px";
        adapted.background = "linear-gradient(105deg, rgba(16, 38, 29, 0.98), rgba(13, 21, 36, 0.97))";
        adapted.boxShadow = "inset 0 1px 0 rgba(210, 240, 255, 0.05)";
    }
    if (removeWindowedAppFrameBorder) {
        adapted.border = "none";
        delete adapted.borderColor;
    }
    if (theme?.followGame) adapted = adaptFollowGameGeometry(adapted, theme, themeRole);
    const nextStyleCache = styleCache ?? new Map();
    nextStyleCache.set(cacheKey, adapted);
    theme.styleCache?.set(style, nextStyleCache);
    return adapted;
}

export function createDashboardThemedReact(react, getTheme) {
    if (!react?.createElement || typeof getTheme !== "function") return react;
    const themedReact = Object.create(react);
    Object.defineProperty(themedReact, "createElement", {
        configurable: false,
        enumerable: true,
        writable: false,
        value(type, props, ...children) {
            let themedProps = props;
            if (typeof type === "string" && props) {
                const theme = getTheme();
                const themeRole = String(props[THEME_ROLE_PROP] ?? "");
                let changed = false;
                const nextProps = { ...props };
                if (props.style) {
                    nextProps.style = adaptDashboardStyle(props.style, theme, type, themeRole);
                    changed = nextProps.style !== props.style;
                }
                for (const propertyName of THEMED_COLOR_PROPS) {
                    if (typeof props[propertyName] !== "string") continue;
                    const adapted = adaptDashboardColorValue(props[propertyName], propertyName, theme, themeRole, type);
                    if (adapted === props[propertyName]) continue;
                    nextProps[propertyName] = adapted;
                    changed = true;
                }
                if (props.fontSize !== undefined && theme?.typography && Math.abs(theme.typography.fontScale - 1) > 0.001) {
                    nextProps.fontSize = scalePixelValue(props.fontSize, theme.typography.fontScale);
                    changed = nextProps.fontSize !== props.fontSize || changed;
                }
                if (changed) themedProps = nextProps;
            }
            return react.createElement(type, themedProps, ...children);
        },
    });
    return themedReact;
}
