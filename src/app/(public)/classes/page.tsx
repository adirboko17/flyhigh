import { ClassCard } from "@/components/classes/ClassCard";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { createClient } from "@/lib/supabase/server";
import type { PublicClass } from "@/types";

export const metadata = {
  title: "חוגים",
  description: "כל חוגי השחייה ופעילויות המים של על הגובה.",
};

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_public_classes");
  const classes = (data as PublicClass[]) ?? [];

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="waves"
        badgeIconColor="var(--logo-cyan)"
        badgeText="חוגים · שחייה לכל הגילאים"
        title="החוגים שלנו"
        description="בחרו את החוג המתאים לילד שלכם והירשמו בקלות. כל החוגים מועברים על ידי מדריכות מוסמכות."
      />

      <div className="container-page relative z-[3] py-12">
        {classes.length > 0 ? (
          <>
            <ScrollReveal>
              <p className="mb-6 text-sm text-ink-500">
                נמצאו {classes.length} חוגים פעילים
              </p>
            </ScrollReveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls, index) => (
                <ScrollReveal
                  key={cls.id}
                  delay={Math.min((index % 3) * 80, 160)}
                  className="h-full"
                >
                  <ClassCard cls={cls} />
                </ScrollReveal>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
            <p className="text-2xl">🏊</p>
            <p className="mt-3 font-display text-lg font-bold text-ink-800">
              אין חוגים פעילים כרגע
            </p>
            <p className="mt-1 text-sm text-ink-500">
              חזרו אלינו בקרוב - אנחנו כל הזמן פותחים חוגים חדשים.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
