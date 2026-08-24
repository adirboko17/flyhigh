import Link from "next/link";
import {
  extractCardcomCheckoutId,
  extractCardcomLowProfileId,
} from "@/lib/integrations/cardcom";
import { settleCardcomCheckout } from "@/lib/payments/cardcomCheckout";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export const metadata = { title: "אישור תשלום" };

export default async function CheckoutSuccessPage({
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

  const result = await settleCardcomCheckout({
    checkoutId: extractCardcomCheckoutId(query),
    lowProfileId: extractCardcomLowProfileId(query),
  });

  const paid = result.success && (result.status === "paid" || result.status === "already_paid");

  return (
    <section className="container-page py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            paid ? "bg-aqua-100" : "bg-amber-100"
          }`}
        >
          {paid ? "✓" : "!"}
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ink-900">
          {paid ? "התשלום התקבל" : "עדיין ממתינים לאישור"}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {paid
            ? "ההרשמה או הרכישה נרשמו בחשבון, והחשבונית תישלח למייל אם הוגדרה בקארדקום."
            : "אם חויבתם, האישור יתעדכן תוך דקות. אם לא — אפשר לנסות שוב מאזור האישי."}
        </p>
        {paid && result.success && result.transactionId && (
          <p className="mt-3 text-xs text-ink-400" dir="ltr">
            אישור: {result.transactionId}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href="/parent/dashboard">לאזור האישי</ButtonLink>
          <ButtonLink href="/classes" variant="outline">
            חזרה לחוגים
          </ButtonLink>
        </div>
        <p className="mt-6 text-xs text-ink-400">
          בעיה?{" "}
          <Link href="/contact" className="font-semibold text-brand-700">
            צרו קשר
          </Link>
        </p>
      </div>
    </section>
  );
}
