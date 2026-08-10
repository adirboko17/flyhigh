import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { SectionHead } from "@/components/home/SectionHead";
import { PlanTicketCard } from "@/components/programs/PlanTicketCard";
import {
  PlanPurchaseButton,
  type PlanViewer,
} from "@/components/programs/PlanPurchase";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getSessionProfile, homeForRole } from "@/lib/auth";
import {
  POOL_PASS_CARD_TEMPLATES,
  PROGRAM_CARD_TEMPLATES,
  programStubMonths,
} from "@/lib/program-cards";
import { getPublicPlans } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";

export const metadata = {
  title: "הבריכה",
  description: "מנויים חודשיים וכניסות לבריכה - על הגובה.",
};

export default async function ProgramsPage() {
  const [{ programs, poolPasses }, profile] = await Promise.all([
    getPublicPlans(),
    getSessionProfile(),
  ]);

  // הורה מחובר רוכש ישירות מהעמוד; אורח מופנה להתחברות, ומנהל/מדריכה לאזור שלהם.
  let viewer: PlanViewer = { kind: "guest" };

  if (profile && profile.role !== "parent") {
    viewer = { kind: "other", homeHref: homeForRole(profile.role) };
  } else if (profile) {
    const supabase = await createClient();
    const { data: kids } = await supabase
      .from("children")
      .select("id, full_name")
      .eq("parent_id", profile.id)
      .order("created_at");

    viewer = {
      kind: "parent",
      parentName: profile.full_name,
      children: kids ?? [],
    };
  }

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="ticket"
        badgeText="מחירון · הבריכה"
        title="שנקפוץ למים?"
        description="מנויים חודשיים לשחייה חופשית וכניסות גמישות לבריכה - בלי התחייבות, בלי בירוקרטיה. בחרו, שלמו והתחילו לשחות."
      />

      <section className="container-page relative z-[3] pb-0 pt-8">
        <ScrollReveal>
          <SectionHead
            eyebrow="מנויים"
            title="מסלולים חודשיים"
            sub="שחייה חופשית, כמה שבא לכם"
            accent="var(--logo-magenta)"
          />
        </ScrollReveal>

        {programs.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {programs.map((program, index) => {
              const template =
                PROGRAM_CARD_TEMPLATES[index % PROGRAM_CARD_TEMPLATES.length];

              return (
                <ScrollReveal
                  key={program.id}
                  delay={Math.min((index % 2) * 90, 90)}
                  className="h-full"
                >
                  <PlanTicketCard
                    name={program.title}
                    desc={program.description}
                    price={formatCurrency(program.price)}
                    period={template.period}
                    stub={{
                      kind: "months",
                      count: programStubMonths(template.period, index),
                    }}
                    features={template.features}
                    icon={template.icon}
                    accent={template.accent}
                    featured={template.featured}
                    badge={template.badge}
                    cta={
                      <PlanPurchaseButton
                        planKind="program"
                        planId={program.id}
                        planTitle={program.title}
                        price={program.price}
                        featured={template.featured}
                        viewer={viewer}
                      />
                    }
                  />
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            אין מסלולים פעילים כרגע. צרו קשר ונשמח לעזור.
          </p>
        )}
      </section>

      <section className="container-page py-14 pb-16">
        <ScrollReveal>
          <SectionHead
            eyebrow="גמיש"
            title="כניסות לבריכה"
            sub="מתאים לאורחים ולשחיינים מזדמנים"
            accent="var(--logo-cyan)"
          />
        </ScrollReveal>

        {poolPasses.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {poolPasses.map((pass, index) => {
              const template =
                POOL_PASS_CARD_TEMPLATES[index % POOL_PASS_CARD_TEMPLATES.length];

              return (
                <ScrollReveal
                  key={pass.id}
                  delay={Math.min((index % 2) * 90, 90)}
                  className="h-full"
                >
                  <PlanTicketCard
                    name={pass.title}
                    desc={pass.description}
                    price={formatCurrency(pass.price)}
                    stub={{ kind: "entries", count: pass.entries_count }}
                    features={template.features}
                    icon={template.icon}
                    accent={template.accent}
                    featured={template.featured}
                    badge={template.badge}
                    cta={
                      <PlanPurchaseButton
                        planKind="pool_pass"
                        planId={pass.id}
                        planTitle={pass.title}
                        price={pass.price}
                        entriesCount={pass.entries_count}
                        featured={template.featured}
                        viewer={viewer}
                      />
                    }
                  />
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            אין כניסות פעילות כרגע.
          </p>
        )}
      </section>
    </div>
  );
}
