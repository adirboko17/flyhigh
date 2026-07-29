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
    desc: "מדריכות מוסמכות, יחס אישי וקבוצות קטנות.",
  },
  {
    icon: "enroll",
    title: "הרשמה דיגיטלית",
    desc: "נרשמים, משלמים ומנהלים הכל אונליין, בעברית מלאה.",
  },
  {
    icon: "drop",
    title: "מגוון פעילויות",
    desc: "חוגי שחייה, מסלולים חודשיים וכניסות חופשיות לבריכה.",
  },
];

const accents = [CYN, MAG, ORG];

export function FeaturesSection() {
  return (
    <section className="container-page relative z-[3] -mt-16 sm:-mt-20 lg:-mt-28">
      <div className="grid gap-5 md:grid-cols-3">
        {features.map((f, i) => {
          const accent = accents[i % 3];
          return (
            <ScrollReveal key={f.title} delay={i * 80} className="h-full">
              <div
                className="feat-card relative h-full overflow-hidden rounded-[22px] border border-ink-100 bg-white p-5 shadow-card sm:p-[26px]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: accent }}
                />
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white"
                  style={{
                    background: accent,
                    boxShadow: `0 12px 26px -10px ${accent}`,
                  }}
                >
                  <Icon name={f.icon} size={24} />
                </div>
                <h3 className="mt-[18px] font-display text-[19px] font-extrabold text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">
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
