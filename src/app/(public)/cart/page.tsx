import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { getSessionProfile } from "@/lib/auth";

export const metadata = {
  title: "עגלת קניות",
  description: "סיכום הרכישות ותשלום אחד לכל החוגים והכרטיסיות שבחרתם.",
};

export default async function CartPage() {
  const profile = await getSessionProfile();
  const viewer =
    profile?.role === "parent"
      ? { kind: "parent" as const, parentName: profile.full_name }
      : profile
        ? { kind: "other" as const }
        : { kind: "guest" as const };

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="bag"
        badgeText="עגלת קניות"
        title="הסל שלכם"
        description="קבצו כמה חוגים, כרטיסיות או מנויים — ושלמו פעם אחת בכרטיס אשראי."
        backLink={{ href: "/classes", label: "חזרה לחוגים" }}
        backLinkPlacement="below-description"
        size="compact"
      />
      <section className="container-page relative z-[3] max-w-3xl pb-16 pt-8">
        <CartPageClient viewer={viewer} />
      </section>
    </div>
  );
}
