import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { SectionHead } from "@/components/home/SectionHead";
import { PlanTicketCard } from "@/components/programs/PlanTicketCard";
import { TreatmentHighlightCard } from "@/components/programs/TreatmentHighlightCard";
import {
  PlanPurchaseTrigger,
  type PlanViewer,
} from "@/components/programs/PlanPurchase";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { createSessionReadClient, getSessionProfile, homeForRole } from "@/lib/auth";
import {
  PRIVATE_LESSON_CARD_TEMPLATES,
  PROGRAM_CARD_TEMPLATES,
  activityCardPresentation,
  activityVisualTemplate,
  poolPassCardTemplate,
  programDurationLabel,
} from "@/lib/program-cards";
import { parseActivityPriceTiers } from "@/lib/finance/activityPricing";
import { isActivityProgram } from "@/lib/programs";
import { loadFamilyDiscountSettings } from "@/lib/finance/siblingDiscount";
import { getPublicPlans } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";

export const metadata = {
  title: "הבריכה",
  description: "מנויים חודשיים וכניסות לבריכה - על הגובה.",
};

export default async function ProgramsPage() {
  const supabase = await createClient();
  const [{ programs, poolPasses, privateLessons }, profile, familyDiscount] =
    await Promise.all([
      getPublicPlans(),
      getSessionProfile(),
      loadFamilyDiscountSettings(supabase),
    ]);

  // הורה מחובר רוכש ישירות מהעמוד; אורח מופנה להתחברות, ומנהל/מדריכה לאזור שלהם.
  let viewer: PlanViewer = { kind: "guest" };

  const memberships = programs.filter(
    (program) => !isActivityProgram(program.kind)
  );
  const activities = programs.filter((program) =>
    isActivityProgram(program.kind)
  );

  if (profile && profile.role !== "parent") {
    viewer = { kind: "other", homeHref: homeForRole(profile.role) };
  } else if (profile) {
    const reads = await createSessionReadClient();
    const { data: kids } = await reads
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
        description="מנויים חודשיים לשחייה חופשית, פעילויות לפי מספר משתתפים וכניסות גמישות לבריכה - בלי התחייבות, בלי בירוקרטיה. בחרו, שלמו והתחילו לשחות."
      />

      <section
        id="memberships"
        className="container-page relative z-[3] scroll-mt-28 pb-0 pt-8"
      >
        <ScrollReveal>
          <SectionHead
            eyebrow="מנויים"
            title="מנויים חודשיים"
            sub="שחייה חופשית, כמה שבא לכם"
            accent="var(--logo-magenta)"
          />
        </ScrollReveal>

        {memberships.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {memberships.map((program, index) => {
                const template =
                  PROGRAM_CARD_TEMPLATES[index % PROGRAM_CARD_TEMPLATES.length];

                return (
                  <ScrollReveal
                    key={program.id}
                    delay={Math.min((index % 2) * 90, 90)}
                    className="h-full"
                  >
                    <PlanPurchaseTrigger
                      planKind="program"
                      planId={program.id}
                      planTitle={program.title}
                      price={program.price}
                      programKind={program.kind}
                      viewer={viewer}
                      familyDiscount={familyDiscount}
                      className="h-full hover:translate-y-0 hover:shadow-none"
                    >
                      <PlanTicketCard
                        compact
                        name={program.title}
                        desc={program.description}
                        price={formatCurrency(program.price)}
                        period={programDurationLabel(program.duration_months)}
                        stub={{
                          kind: "months",
                          count: program.duration_months,
                        }}
                        features={template.features}
                        icon={template.icon}
                        accent={template.accent}
                        featured={template.featured}
                        badge={template.badge}
                      />
                    </PlanPurchaseTrigger>
                  </ScrollReveal>
                );
              })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            אין מנויים פעילים כרגע. צרו קשר ונשמח לעזור.
          </p>
        )}
      </section>

      {activities.length > 0 && (
        <section
          id="activities"
          className="container-page relative z-[3] scroll-mt-28 pb-0 pt-14"
        >
          <ScrollReveal>
            <SectionHead
              eyebrow="הפוגה"
              title="פעילויות"
              sub="משלמים, ואז מתאמים מועד מול המשרד"
              accent="var(--logo-magenta)"
            />
          </ScrollReveal>

          <div className="grid gap-5 sm:grid-cols-2">
            {activities.map((program, index) => {
                const card = activityCardPresentation(program);
                const visual = activityVisualTemplate(program.title);
                return (
                <ScrollReveal
                  key={program.id}
                  delay={Math.min((index % 2) * 90, 90)}
                  className="h-full"
                >
                  <PlanPurchaseTrigger
                    planKind="program"
                    planId={program.id}
                    planTitle={program.title}
                    price={program.price}
                    programKind={program.kind}
                    priceTiers={parseActivityPriceTiers(program.price_tiers)}
                    extraHalfHourPrice={program.extra_half_hour_price}
                    durationMinutes={program.duration_minutes}
                    viewer={viewer}
                    familyDiscount={familyDiscount}
                    className="h-full hover:translate-y-0 hover:shadow-none"
                  >
                    {visual.tone === "treatment" ? (
                      <TreatmentHighlightCard
                        compact
                        name={program.title}
                        desc={program.description || card.hint}
                        price={card.price}
                        period={card.period}
                      />
                    ) : (
                      <PlanTicketCard
                        compact
                        name={program.title}
                        desc={program.description || card.hint}
                        price={card.price}
                        period={card.period}
                        pricePrefix={card.pricePrefix}
                        priceRows={card.priceRows}
                        extraLine={card.extraLine}
                        stub={card.stub}
                        features={card.features}
                        icon={visual.icon}
                        accent={visual.accent}
                        featured={visual.featured}
                        badge={visual.badge}
                      />
                    )}
                  </PlanPurchaseTrigger>
                </ScrollReveal>
                );
              })}
          </div>
        </section>
      )}

      <section
        id="pool-passes"
        className="container-page scroll-mt-28 py-14 pb-16"
      >
        <ScrollReveal>
          <SectionHead
            eyebrow="גמיש"
            title="כניסות לבריכה"
            sub="מתאים לאורחים ולשחיינים מזדמנים"
            accent="var(--logo-cyan)"
          />
        </ScrollReveal>

        {poolPasses.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {poolPasses.map((pass, index) => {
              const template = poolPassCardTemplate(pass.entries_count);

              return (
                <ScrollReveal
                  key={pass.id}
                  delay={Math.min((index % 2) * 90, 90)}
                  className="h-full"
                >
                  <PlanPurchaseTrigger
                    planKind="pool_pass"
                    planId={pass.id}
                    planTitle={pass.title}
                    price={pass.price}
                    entriesCount={pass.entries_count}
                    viewer={viewer}
                    familyDiscount={familyDiscount}
                    className="h-full hover:translate-y-0 hover:shadow-none"
                  >
                    <PlanTicketCard
                      compact
                      name={pass.title}
                      desc={pass.description}
                      price={formatCurrency(pass.price)}
                      stub={{ kind: "entries", count: pass.entries_count }}
                      features={template.features}
                      icon={template.icon}
                      accent={template.accent}
                      featured={template.featured}
                      badge={template.badge}
                    />
                  </PlanPurchaseTrigger>
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

      <section
        id="private-lessons"
        className="container-page scroll-mt-28 pb-16 pt-4"
      >
        <ScrollReveal>
          <SectionHead
            eyebrow="אישי"
            title="שיעורים פרטיים"
            sub="שיעור אחד־על־אחד — ניצור קשר לתיאום מועד"
            accent="var(--logo-magenta)"
          />
        </ScrollReveal>

        {privateLessons.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {privateLessons.map((lesson, index) => {
              const template =
                PRIVATE_LESSON_CARD_TEMPLATES[
                  index % PRIVATE_LESSON_CARD_TEMPLATES.length
                ];

              return (
                <ScrollReveal
                  key={lesson.id}
                  delay={Math.min((index % 2) * 90, 90)}
                  className="h-full"
                >
                  <PlanPurchaseTrigger
                    planKind="private_lesson"
                    planId={lesson.id}
                    planTitle={lesson.title}
                    price={lesson.price}
                    durationMinutes={lesson.duration_minutes}
                    viewer={viewer}
                    familyDiscount={familyDiscount}
                    className="h-full hover:translate-y-0 hover:shadow-none"
                  >
                    <PlanTicketCard
                      compact
                      name={lesson.title}
                      desc={lesson.description}
                      price={formatCurrency(lesson.price)}
                      stub={{
                        kind: "minutes",
                        count: lesson.duration_minutes,
                      }}
                      features={template.features}
                      icon={template.icon}
                      accent={template.accent}
                      featured={template.featured}
                      badge={template.badge}
                    />
                  </PlanPurchaseTrigger>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            אין שיעורים פרטיים פעילים כרגע.
          </p>
        )}
      </section>
    </div>
  );
}
