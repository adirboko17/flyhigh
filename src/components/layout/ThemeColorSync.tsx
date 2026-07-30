"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { THEME_COLOR, THEME_COLOR_REFRESH_EVENT } from "@/lib/theme-color";

/**
 * מסנכרן את <meta name="theme-color"> ואת רקע ה-html עם הסקשן שנמצא בראש החלון,
 * כך ששורת הסטטוס, שורת הכתובת ואזור ה-overscroll לא נשארים בצבע שלא תואם לתוכן.
 * סקשן מצהיר על הצבע שלו באמצעות data-theme-color.
 */
export function ThemeColorSync() {
  const pathname = usePathname();

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]:not([media])'
    );

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    let applied = "";
    let frame = 0;

    const resolveColor = () => {
      // מצבי ניגודיות גבוהה צובעים את כל העמוד, ולכן גוברים על הכול.
      const contrast = document.documentElement.dataset.a11yContrast;
      if (contrast === "dark") return "#000000";
      if (contrast === "light") return "#ffffff";

      // שכבה שמכסה את כל המסך (כמו תפריט מובייל) גוברת על הסקשן שמתחתיה.
      const overlay = document.querySelector<HTMLElement>(
        "[data-theme-color-overlay]"
      );
      if (overlay?.dataset.themeColorOverlay) {
        return overlay.dataset.themeColorOverlay;
      }

      const zones = document.querySelectorAll<HTMLElement>("[data-theme-color]");
      let color: string = THEME_COLOR.page;

      // האחרון בסדר ה-DOM מנצח, כך שאזור מקונן גובר על העוטף שלו.
      zones.forEach((zone) => {
        const rect = zone.getBoundingClientRect();
        if (rect.top <= 0 && rect.bottom > 0) {
          color = zone.dataset.themeColor || color;
        }
      });

      return color;
    };

    const apply = () => {
      frame = 0;
      const color = resolveColor();
      if (color === applied) return;

      applied = color;
      meta.content = color;
      document.documentElement.style.backgroundColor = color;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const contrastObserver = new MutationObserver(schedule);
    contrastObserver.observe(document.documentElement, {
      attributeFilter: ["data-a11y-contrast"],
    });

    apply();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener(THEME_COLOR_REFRESH_EVENT, schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      contrastObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(THEME_COLOR_REFRESH_EVENT, schedule);
    };
  }, [pathname]);

  return null;
}
