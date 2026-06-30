import Link from "next/link";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { SectionHead } from "@/components/home/SectionHead";
import { PlanCard } from "@/components/programs/PlanCard";
import {
  POOL_PASS_CARD_TEMPLATES,
  PROGRAM_CARD_TEMPLATES,
} from "@/lib/program-cards";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";

export const metadata = {
  title: "מסלולים",
  description: "מנויים חודשיים וכניסות לבריכה - על הגובה.",
};

export default async function ProgramsPage() {
  const supabase = await createClient();

  const [{ data: programs }, { data: poolPasses }] = await Promise.all([
    supabase.from("programs").select("*").eq("status", "active"),
    supabase.from("pool_passes").select("*").eq("status", "active"),
  ]);

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="ticket"
        badgeText="מחירון · מסלולים וכניסות"
        title="בחרו את המסלול שלכם"
        description="מנויים חודשיים לשחייה חופשית וכניסות גמישות לבריכה - בלי התחייבות, בלי בירוקרטיה. בחרו, שלמו והתחילו לשחות."
      />

      <section className="container-page relative z-[3] pb-0 pt-8">
        <SectionHead
          eyebrow="מנויים"
          title="מסלולים חודשיים"
          sub="שחייה חופשית, כמה שבא לכם"
          accent="var(--logo-magenta)"
        />

        {(programs ?? []).length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {(programs ?? []).map((program, index) => {
              const template =
                PROGRAM_CARD_TEMPLATES[index % PROGRAM_CARD_TEMPLATES.length];

              return (
                <PlanCard
                  key={program.id}
                  name={program.title}
                  desc={program.description}
                  price={formatCurrency(program.price)}
                  period={template.period}
                  features={template.features}
                  icon={template.icon}
                  accent={template.accent}
                  featured={template.featured}
                  badge={template.badge}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            אין מסלולים פעילים כרגע. צרו קשר ונשמח לעזור.
          </p>
        )}
      </section>

      <section className="container-page py-14">
        <SectionHead
          eyebrow="גמיש"
          title="כניסות לבריכה"
          sub="מתאים לאורחים ולשחיינים מזדמנים"
          accent="var(--logo-cyan)"
        />

        {(poolPasses ?? []).length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {(poolPasses ?? []).map((pass, index) => {
              const template =
                POOL_PASS_CARD_TEMPLATES[index % POOL_PASS_CARD_TEMPLATES.length];

              return (
                <PlanCard
                  key={pass.id}
                  name={pass.title}
                  desc={pass.description}
                  price={formatCurrency(pass.price)}
                  features={template.features}
                  icon={template.icon}
                  accent={template.accent}
                  featured={template.featured}
                  badge={template.badge}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            אין כניסות פעילות כרגע.
          </p>
        )}
      </section>

      <section className="container-page pb-16">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-ink-100 bg-[var(--brand-gradient-soft)] p-7 sm:p-8">
          <div>
            <h3 className="font-display text-[22px] font-extrabold text-ink-900">
              לא בטוחים מה מתאים לכם?
            </h3>
            <p className="mt-1 text-ink-600">
              פתחו חשבון בחינם - תוכלו לבחור מסלול או כניסה בכל רגע.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="hero-cta-primary ah-btn ah-btn--lg">
              פתיחת חשבון
            </Link>
            <Link href="/classes" className="ah-btn ah-btn--lg ah-btn--outline">
              עיון בחוגים
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
