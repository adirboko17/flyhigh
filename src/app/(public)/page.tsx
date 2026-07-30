import { ClassCard } from "@/components/classes/ClassCard";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeroSection } from "@/components/home/HeroSection";
import { HomePlansGrid } from "@/components/home/HomePlansGrid";
import { SectionHead } from "@/components/home/SectionHead";
import type { PlanViewer } from "@/components/programs/PlanPurchase";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getSessionProfile, homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PublicClass } from "@/types";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: classes }, { data: programs }, { data: poolPasses }, profile] =
    await Promise.all([
      supabase.rpc("list_public_classes"),
      supabase.from("programs").select("*").eq("status", "active"),
      supabase.from("pool_passes").select("*").eq("status", "active"),
      getSessionProfile(),
    ]);

  const featured = ((classes as PublicClass[]) ?? []).slice(0, 3);
  const hasPlans = (programs?.length ?? 0) + (poolPasses?.length ?? 0) > 0;

  let viewer: PlanViewer = { kind: "guest" };

  if (profile && profile.role !== "parent") {
    viewer = { kind: "other", homeHref: homeForRole(profile.role) };
  } else if (profile) {
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
    <>
      <HeroSection />
      <FeaturesSection />

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
        <ScrollReveal>
          <SectionHead
            eyebrow="מנויים וכניסות"
            title="מסלולים חודשיים וכניסות לבריכה"
            sub="בלי התחייבות ארוכה — בוחרים את המסלול שמתאים לקצב המשפחה."
            accent="var(--logo-cyan)"
            link="לכל המסלולים"
            linkHref="/programs"
          />
        </ScrollReveal>

        {hasPlans ? (
          <HomePlansGrid
            programs={programs ?? []}
            poolPasses={poolPasses ?? []}
            viewer={viewer}
          />
        ) : (
          <EmptyMini text="אין מסלולים או כניסות פעילים כרגע" />
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
