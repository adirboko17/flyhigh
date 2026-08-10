import { AboutSection } from "@/components/home/AboutSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";

/**
 * רצועה רציפה מתחת להירו: כרטיסי היתרונות + מי אנחנו.
 * הרקע והמסגרת האדומה העדינה מתחילים כאן כדי שלא יופיע קו מפריד אחרי גל ההירו.
 */
export function HomeIntroBand() {
  return (
    <div className="relative overflow-x-clip bg-ink-50">
      {/* שטיפה אדומה עדינה בפינה העליונה (צד התחלה ב־RTL) — כמו מסגרת רכה */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-[18%] -top-[8%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full opacity-[0.14]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--logo-magenta) 70%, white) 0%, transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -start-[12%] top-[18%] h-[min(55vw,440px)] w-[min(55vw,440px)] rounded-full opacity-[0.1]"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--logo-magenta) 55%, white) 0%, transparent 70%)",
        }}
      />

      {/* קווי פינה דקים שמרמזים על מסגרת */}
      <div
        aria-hidden
        className="pointer-events-none absolute start-3 top-3 h-24 w-24 rounded-ss-[28px] border-s-2 border-t-2 sm:start-5 sm:top-5 sm:h-32 sm:w-32 sm:rounded-ss-[36px]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--logo-magenta) 28%, transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-6 end-3 h-20 w-20 rounded-ee-[24px] border-b-2 border-e-2 sm:bottom-8 sm:end-5 sm:h-28 sm:w-28 sm:rounded-ee-[32px]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--logo-magenta) 22%, transparent)",
        }}
      />

      <FeaturesSection />
      <AboutSection />
    </div>
  );
}
