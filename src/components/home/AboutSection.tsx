import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHead } from "@/components/home/SectionHead";

const CYN = "var(--logo-cyan)";
const MAG = "var(--logo-magenta)";
const ORG = "var(--logo-orange)";
const AQUA = "var(--aqua-500)";

const activities: { title: string; items: string; accent: string }[] = [
  {
    title: "התעמלות הגיל הרך, ילדים ונוער",
    items: "התעמלות קרקע ומכשירים, אקרובטיקה, אקרודאנס.",
    accent: MAG,
  },
  {
    title: "נינג'ה",
    items: "כולל חוגים ופעילויות ימי הולדת.",
    accent: ORG,
  },
  {
    title: "כושר נשים",
    items: "קבוצת ריצה, אירובי ופילאטיס, התעמלות במים.",
    accent: CYN,
  },
  {
    title: "פעילות ספורט ושיקום במים",
    items:
      "שיעורי שחייה למתחילים ולמתקדמים, נבחרות שחייה ותחרויות, שחיית פעוטות, התעמלות במים, הידרותרפיה, מנוי שחייה עצמאית ועוד.",
    accent: AQUA,
  },
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden py-16 sm:py-20"
      aria-labelledby="about-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,174,239,0.07),transparent_50%),radial-gradient(ellipse_at_90%_100%,rgba(236,0,140,0.05),transparent_45%)]"
      />

      <div className="container-page relative">
        <ScrollReveal>
          <SectionHead
            eyebrow="הסיפור שלנו"
            title="מי אנחנו"
            titleId="about-heading"
            sub="מרכז ספורט וכושר בדרום הר חברון — תנועה, בריאות וצמיחה לכל הגילאים."
            accent={CYN}
          />
        </ScrollReveal>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-14">
          <div className="space-y-5">
            <ScrollReveal>
              <p className="text-[16.5px] leading-[1.75] text-ink-700 sm:text-[17.5px]">
                <span className="font-display font-extrabold text-ink-900">
                  &ldquo;על הגובה&rdquo;
                </span>{" "}
                הינו מרכז ספורט וכושר בדרום הר חברון, הפועל לתת מענה לכלל תושבי
                יישובי ההר והסביבה, בכל הגילאים.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={60}>
              <p className="text-[16.5px] leading-[1.75] text-ink-600 sm:text-[17px]">
                המרכז מזמין כל אחד ואחת — ילדים ומבוגרים, מתחילים ומתקדמים —
                למצוא בו את הדרך לתנועה, לבריאות ולצמיחה.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <p className="text-[16.5px] leading-[1.75] text-ink-600 sm:text-[17px]">
                אנחנו שואפים לתת מענה לבריאות ולאורח חיים נכון לכל מי שרוצה
                לשפר את הכושר והבריאות שלו — מגיל 0 ועד 120, כולל אנשים בשיקום
                ובעלי צרכים מיוחדים.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={140}>
              <blockquote className="relative mt-2 rounded-[22px] border border-ink-100 bg-white px-6 py-6 shadow-[0_1px_2px_rgba(16,42,75,0.04)] sm:px-7 sm:py-7">
                <span
                  aria-hidden
                  className="absolute inset-y-5 start-0 w-[3px] rounded-full"
                  style={{ background: MAG }}
                />
                <p className="font-display text-[17px] font-bold leading-[1.65] text-ink-800 sm:text-[18.5px]">
                  אנו מאמינים שעבודה עם הגוף מקדמת גם את הנפש. כל תרגיל הוא
                  הזדמנות להתבוננות פנימה ולצמיחה מבפנים.
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500 sm:text-[15.5px]">
                  להתאמץ, להתמיד ולא לוותר — זה מה שמביא אותנו לגבהים חדשים.
                  כך בונים גוף ונפש, וכך נולדת תחושת ההצלחה והמסוגלות.
                </p>
              </blockquote>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={80}>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink-900 sm:text-xl">
                מגוון רחב של חוגי ספורט ופעילויות
              </h3>
              <ul className="mt-5 space-y-4">
                {activities.map((activity) => (
                  <li key={activity.title} className="flex gap-3.5">
                    <span
                      aria-hidden
                      className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        background: activity.accent,
                        boxShadow: `0 0 0 4px color-mix(in srgb, ${activity.accent} 18%, transparent)`,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-display text-[15.5px] font-extrabold leading-snug text-ink-900 sm:text-base">
                        {activity.title}
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-500 sm:text-[14.5px]">
                        {activity.items}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
