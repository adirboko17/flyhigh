/**
 * צבעי theme-color לשורות המערכת בדפדפני מובייל.
 *
 * הדפדפן צובע את שורת הסטטוס/כתובת לפי <meta name="theme-color">, ואת אזור
 * ה-overscroll לפי רקע ה-html. ThemeColorSync מסנכרן את שניהם לפי הסקשן
 * שנמצא כרגע בראש החלון — סקשן מסמן את הצבע שלו עם data-theme-color.
 */
export const THEME_COLOR = {
  /** משטח לבן, למשל פס הודעה עליון */
  surface: "#ffffff",
  /** רקע העמוד הרגיל (ink-50) */
  page: "#f6f7f9",
  /** גרדיאנט ההירו הכהה בראש עמודי האתר */
  hero: "#06314f",
  /** גרדיאנט הפוטר */
  footer: "#1b3164",
  /** רקע עמודי ההתחברות/הרשמה */
  auth: "#eff9ff",
} as const;

/** מאלץ חישוב מחדש של הצבע כשמשהו השתנה בלי גלילה (למשל פתיחת תפריט מסך מלא). */
export const THEME_COLOR_REFRESH_EVENT = "themecolor:refresh";

export function refreshThemeColor() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THEME_COLOR_REFRESH_EVENT));
}
