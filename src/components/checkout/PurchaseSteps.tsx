import { cn } from "@/utils/cn";

export type PurchaseStepId = "choose" | "cart" | "pay";

const STEPS: {
  id: PurchaseStepId;
  label: string;
  detail: string;
}[] = [
  {
    id: "choose",
    label: "בחירה",
    detail: "בוחרים מה לקנות, ולמי.",
  },
  {
    id: "cart",
    label: "הסל",
    detail: "הפריט נשמר כאן. עדיין לא שילמנו.",
  },
  {
    id: "pay",
    label: "תשלום",
    detail: "משלמים ומקבלים אישור.",
  },
];

export function PurchaseSteps({ current }: { current: PurchaseStepId }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  const lastStep = current === "pay";

  return (
    <div className="rounded-2xl border border-brand-100 bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_100%)] px-4 py-4">
      <p className="text-[13px] font-bold text-brand-700">איך הרכישה עובדת</p>
      <ol className="mt-3 space-y-2.5">
        {STEPS.map((step, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li key={step.id} className="flex items-start gap-3" aria-current={state === "current" ? "step" : undefined}>
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  state === "current" && "bg-brand-600 text-white",
                  state === "done" && "bg-aqua-100 text-aqua-700",
                  state === "upcoming" && "bg-ink-100 text-ink-400"
                )}
                aria-hidden
              >
                {state === "done" ? "✓" : index + 1}
              </span>
              <p className="min-w-0 pt-0.5 text-[15px] leading-6">
                <span
                  className={cn(
                    "font-bold",
                    state === "upcoming" ? "text-ink-400" : "text-ink-900"
                  )}
                >
                  {step.label}
                </span>
                <span className={state === "upcoming" ? "text-ink-400" : "text-ink-600"}>
                  {" "}
                  — {step.detail}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[15px] font-medium leading-6 text-brand-800">
        {lastStep
          ? "הגעתם לשלב האחרון. אחרי התשלום והאישור, הרכישה הסתיימה."
          : "עדיין לא סיימנו. הרכישה מסתיימת רק בשלב התשלום."}
      </p>
    </div>
  );
}
