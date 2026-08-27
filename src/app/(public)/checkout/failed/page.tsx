import Link from "next/link";
import { releaseAbandonedCartCheckout } from "@/lib/cart/actions";
import { extractCardcomCheckoutId } from "@/lib/integrations/cardcom";
import { voidUnpaidCardcomCheckout } from "@/lib/payments/cardcomCheckout";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = { title: "התשלום לא הושלם" };

export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }

  const checkoutId = extractCardcomCheckoutId(query);
  const fromCart = query.get("from") === "cart";

  if (checkoutId) {
    if (fromCart) {
      await releaseAbandonedCartCheckout(checkoutId).catch(() => null);
    } else {
      await voidUnpaidCardcomCheckout({ checkoutId }).catch(() => null);
    }
  }

  return (
    <section className="container-page py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          ✕
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ink-900">
          התשלום לא הושלם
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {fromCart
            ? "לא בוצע חיוב. הפריטים נשארו בסל — אפשר לנסות שוב."
            : "לא בוצע חיוב, וההרשמה לא נשמרה. אפשר לנסות שוב מההתחלה."}
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href={fromCart ? "/cart" : "/parent/dashboard"}>
            {fromCart ? "חזרה לסל" : "לניסיון תשלום נוסף"}
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            צור קשר
          </ButtonLink>
        </div>
        <p className="mt-6 text-xs text-ink-400">
          <Link href="/classes" className="font-semibold text-brand-700">
            חזרה לחוגים
          </Link>
        </p>
      </div>
    </section>
  );
}
