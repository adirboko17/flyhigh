export const A11Y_STORAGE_KEY = "alhagova:a11y";

/** אחוזי גודל הבסיס של הטקסט. האיבר הראשון הוא ברירת המחדל. */
export const A11Y_FONT_STEPS = [100, 112, 125, 140, 160] as const;

export type A11yContrast = "off" | "dark" | "light";

export interface A11ySettings {
  fontStep: number;
  contrast: A11yContrast;
  grayscaleMedia: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  wideSpacing: boolean;
  reduceMotion: boolean;
  bigCursor: boolean;
  strongFocus: boolean;
}

export const A11Y_DEFAULTS: A11ySettings = {
  fontStep: 0,
  contrast: "off",
  grayscaleMedia: false,
  highlightLinks: false,
  readableFont: false,
  wideSpacing: false,
  reduceMotion: false,
  bigCursor: false,
  strongFocus: false,
};

function setFlag(root: HTMLElement, attr: string, on: boolean, value: string) {
  if (on) root.setAttribute(attr, value);
  else root.removeAttribute(attr);
}

export function applyA11ySettings(settings: A11ySettings) {
  const root = document.documentElement;
  const scale = A11Y_FONT_STEPS[settings.fontStep] ?? 100;

  root.style.fontSize = scale === 100 ? "" : `${scale}%`;

  setFlag(root, "data-a11y-contrast", settings.contrast !== "off", settings.contrast);
  setFlag(root, "data-a11y-media", settings.grayscaleMedia, "grayscale");
  setFlag(root, "data-a11y-links", settings.highlightLinks, "on");
  setFlag(root, "data-a11y-font-family", settings.readableFont, "readable");
  setFlag(root, "data-a11y-spacing", settings.wideSpacing, "wide");
  setFlag(root, "data-a11y-motion", settings.reduceMotion, "off");
  setFlag(root, "data-a11y-cursor", settings.bigCursor, "big");
  setFlag(root, "data-a11y-focus", settings.strongFocus, "strong");
}

export function readA11ySettings(): A11ySettings {
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return A11Y_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<A11ySettings>;
    return { ...A11Y_DEFAULTS, ...parsed };
  } catch {
    return A11Y_DEFAULTS;
  }
}

export function saveA11ySettings(settings: A11ySettings) {
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // מצב פרטי/חסימת אחסון — ההגדרות עדיין יחולו עד סוף הביקור.
  }
}

/**
 * מוחל לפני הצביעה הראשונה, כדי שהעדפות שמורות לא יגרמו להבהוב
 * של האתר בעיצוב הרגיל בכל טעינת עמוד.
 */
export const A11Y_INIT_SCRIPT = `(function(){try{
var s=JSON.parse(localStorage.getItem('${A11Y_STORAGE_KEY}')||'{}');
var r=document.documentElement,F=[${A11Y_FONT_STEPS.join(",")}];
if(s.fontStep)r.style.fontSize=(F[s.fontStep]||100)+'%';
if(s.contrast&&s.contrast!=='off')r.setAttribute('data-a11y-contrast',s.contrast);
if(s.grayscaleMedia)r.setAttribute('data-a11y-media','grayscale');
if(s.highlightLinks)r.setAttribute('data-a11y-links','on');
if(s.readableFont)r.setAttribute('data-a11y-font-family','readable');
if(s.wideSpacing)r.setAttribute('data-a11y-spacing','wide');
if(s.reduceMotion)r.setAttribute('data-a11y-motion','off');
if(s.bigCursor)r.setAttribute('data-a11y-cursor','big');
if(s.strongFocus)r.setAttribute('data-a11y-focus','strong');
}catch(e){}})();`;
