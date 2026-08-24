import { TermsContent } from "@/components/legal/TermsContent";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata = {
  title: "תקנון",
  description:
    "תקנון על הגובה - מחירי החוגים, מה כלול בתשלום ונהלי תשלום, פרישה והחזרים.",
};

export default function TermsPage() {
  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="badge"
        badgeIconColor="var(--logo-magenta)"
        badgeText="תקנון · נהלי הרשמה ותשלום"
        title="תקנון"
        description="מחירי החוגים, מה כלול בתשלום, ונהלי פרישה והחזרים — אותו מלל שמאשרים בהרשמה."
        size="compact"
      />

      <section className="container-page relative z-[3] py-12 pb-16">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl rounded-[26px] border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <TermsContent />
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
