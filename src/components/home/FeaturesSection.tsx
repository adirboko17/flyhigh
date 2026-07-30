import { Icon } from "@/components/icons/Icon";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { IconName } from "@/components/icons/paths";

const CYN = "var(--logo-cyan)";
const MAG = "var(--logo-magenta)";
const ORG = "var(--logo-orange)";

const features: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: "shield",
    title: "בטיחות לפני הכל",
    desc: "מדריכות מוסמכות, יחס אישי וקבוצות קטנות בכל שיעור.",
  },
  {
    icon: "enroll",
    title: "הרשמה דיגיטלית",
    desc: "נרשמים, משלמים ומנהלים הכל אונליין — בעברית מלאה ובלי ניירת.",
  },
  {
    icon: "drop",
    title: "מגוון פעילויות",
    desc: "חוגי שחייה, מסלולים חודשיים וכניסות חופשיות — לכל גיל ורמה.",
  },
];

const accents = [CYN, MAG, ORG];

export function FeaturesSection() {
  return (
    <section className="container-page relative z-[3] mt-14 sm:mt-16">
      <div className="grid gap-6 pt-6 md:grid-cols-3">
        {features.map((f, i) => {
          const accent = accents[i % 3];
          return (
            <ScrollReveal key={f.title} delay={i * 80} className="h-full">
              <div className="feat-card relative h-full rounded-[22px] border border-ink-100 bg-white px-6 pb-6 pt-10 shadow-card">
                <div
                  className="absolute -top-6 start-6 flex h-12 w-12 items-center justify-center rounded-full text-white"
                  style={{
                    background: accent,
                    boxShadow: `0 12px 26px -10px ${accent}`,
                  }}
                >
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 className="font-display text-[19px] font-extrabold text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">
                  {f.desc}
                </p>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
