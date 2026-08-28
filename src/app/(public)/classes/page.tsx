import Link from "next/link";
import { ClassesCatalog } from "@/components/classes/ClassesCatalog";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { sortByCatalogOrder } from "@/lib/classes/catalogOrder";
import { getCatalogClassOrderIds, getPublicClasses } from "@/lib/public-data";

export const metadata = {
  title: "חוגים",
  description: "כל חוגי השחייה ופעילויות המים של על הגובה.",
};

export default async function ClassesPage() {
  const [classes, catalogOrderIds] = await Promise.all([
    getPublicClasses(),
    getCatalogClassOrderIds(),
  ]);
  const ordered = sortByCatalogOrder(classes, catalogOrderIds);

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="waves"
        badgeIconColor="var(--logo-cyan)"
        badgeText="חוגים · שחייה לכל הגילאים"
        title="החוגים שלנו"
        description="בחרו את החוג המתאים לילד שלכם והירשמו בקלות. כל החוגים מועברים על ידי מדריכים ומדריכות מוסמכים."
      />

      <div className="container-page relative z-[3] py-12">
        {ordered.length > 0 ? (
          <ClassesCatalog classes={ordered} />
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

        <ScrollReveal className="mt-12 sm:mt-14">
          <aside
            aria-labelledby="pool-cta-heading"
            className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(0,174,239,0.10)_0%,rgba(13,82,133,0.06)_45%,rgba(236,0,140,0.07)_100%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -start-16 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,174,239,0.18),transparent_70%)]"
            />

            <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-9">
              <div className="min-w-0 max-w-xl">
                <p className="text-xs font-bold tracking-wide text-[var(--logo-cyan)]">
                  גם בלי חוג קבוע
                </p>
                <h2
                  id="pool-cta-heading"
                  className="mt-1.5 font-display text-[22px] font-extrabold leading-snug text-ink-900 sm:text-[26px]"
                >
                  מנויים, כרטיסיות ושיעורים פרטיים בבריכה
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600 sm:text-base">
                  רוצים שחייה חופשית, כרטיסיית כניסות או שיעור פרטי? בעמוד הבריכה
                  תמצאו את כל האפשרויות — ותוכלו לבחור מה שמתאים לקצב שלכם.
                </p>
              </div>

              <Link
                href="/programs"
                className="hero-cta-primary ah-btn ah-btn--lg shrink-0 self-start sm:self-center"
              >
                לעמוד הבריכה
              </Link>
            </div>
          </aside>
        </ScrollReveal>
      </div>
    </div>
  );
}
