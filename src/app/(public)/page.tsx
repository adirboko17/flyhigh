import { ClassCard } from "@/components/classes/ClassCard";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeIntroBand } from "@/components/home/HomeIntroBand";
import { HomePlansGrid } from "@/components/home/HomePlansGrid";
import { SectionHead } from "@/components/home/SectionHead";
import type { PlanViewer } from "@/components/programs/PlanPurchase";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { createSessionReadClient, getSessionProfile, homeForRole } from "@/lib/auth";
import { pickFeaturedClasses } from "@/lib/home/featuredClasses";
import { loadFamilyDiscountSettings } from "@/lib/finance/siblingDiscount";
import {
  getHomeFeaturedClassIds,
  getPublicClasses,
  getPublicPlans,
} from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const [classes, featuredIds, { programs, poolPasses, privateLessons }, profile, familyDiscount] =
    await Promise.all([
      getPublicClasses(),
      getHomeFeaturedClassIds(),
      getPublicPlans(),
      getSessionProfile(),
      loadFamilyDiscountSettings(supabase),
    ]);

  const featured = pickFeaturedClasses(classes, featuredIds);
  const hasPlans =
    programs.length + poolPasses.length + privateLessons.length > 0;

  let viewer: PlanViewer = { kind: "guest" };

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
    <>
      <HeroSection
        accountHref={profile ? homeForRole(profile.role) : undefined}
      />
      <HomeIntroBand />

      <section className="container-page pb-2 pt-14">
        <ScrollReveal>
          <SectionHead
            eyebrow="החוגים שלנו"
            title="חוגים מובילים"
            sub="הצטרפו לחוגים הפופולריים שלנו — כל החוגים מועברים על ידי מדריכות ומדריכים מוסמכים."
            link="לכל החוגים"
            linkHref="/classes"
          />
        </ScrollReveal>

        {featured.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((cls, index) => (
              <ScrollReveal key={cls.id} delay={index * 80} className="h-full">
                <ClassCard cls={cls} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            בקרוב ייפתחו חוגים חדשים. השאירו פרטים ונעדכן אתכם.
          </p>
        )}
      </section>

      <section id="programs" className="container-page py-16">
        {hasPlans ? (
          <HomePlansGrid
            programs={programs}
            poolPasses={poolPasses}
            privateLessons={privateLessons}
            viewer={viewer}
            familyDiscount={familyDiscount}
          />
        ) : (
          <EmptyMini text="אין מסלולים, כניסות או שיעורים פרטיים פעילים כרגע" />
        )}
      </section>
    </>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
      {text}
    </p>
  );
}
