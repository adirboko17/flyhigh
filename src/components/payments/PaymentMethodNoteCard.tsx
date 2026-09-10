import { PAYMENT_METHOD } from "@/lib/constants";
import { cn } from "@/utils/cn";
import type { Enums } from "@/types/database.types";

export function PaymentMethodNoteCard({
  method,
  note,
  title,
  className,
  children,
}: {
  method?: Enums<"payment_method"> | null;
  note: string | null | undefined;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const trimmed = note?.trim() ?? "";
  if (!trimmed && !children) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 text-sky-950",
        className
      )}
    >
      <p className="font-semibold">
        {title ??
          (method ? `איך משלמים ב${PAYMENT_METHOD[method]}` : "הוראות תשלום")}
      </p>
      {trimmed ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {trimmed}
        </p>
      ) : null}
      {children}
    </div>
  );
}
