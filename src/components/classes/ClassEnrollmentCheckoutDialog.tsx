"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatCurrency } from "@/utils/format";
import { completeClassEnrollmentPayment } from "@/lib/enrollment/actions";

type Child = { id: string; full_name: string };

interface ClassEnrollmentCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  classTitle: string;
  unitPrice: number;
  selectedChildren: Child[];
}

export function ClassEnrollmentCheckoutDialog({
  open,
  onClose,
  classId,
  classTitle,
  unitPrice,
  selectedChildren,
}: ClassEnrollmentCheckoutDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"summary" | "payment" | "success">("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  const count = selectedChildren.length;
  const total = unitPrice * count;

  function handleClose() {
    if (loading) return;
    setStep("summary");
    setError(null);
    setPaymentReference(null);
    onClose();
  }

  async function handlePay() {
    setError(null);
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const result = await completeClassEnrollmentPayment({
      classId,
      childIds: selectedChildren.map((c) => c.id),
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setPaymentReference(result.paymentReference);
    setStep("success");
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "success"
          ? "התשלום הושלם בהצלחה"
          : step === "payment"
            ? "סליקה מאובטחת (דמו)"
            : "סיכום הרשמה"
      }
      description={
        step === "success"
          ? "הילדים נרשמו לחוג וקיבלתם אישור תשלום."
          : step === "payment"
            ? "זהו מסך דמו — לא מתבצע חיוב אמיתי."
            : `בדקו את פרטי ההרשמה ל${classTitle} לפני המעבר לתשלום.`
      }
    >
      {step === "summary" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-700">ילדים להרשמה</p>
            <ul className="mt-2 space-y-1.5">
              {selectedChildren.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-ink-900">{child.full_name}</span>
                  <span className="text-ink-500">{formatCurrency(unitPrice)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>מחיר לילד/ה</span>
              <span>{formatCurrency(unitPrice)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>כמות ילדים</span>
              <span>{count}</span>
            </div>
            <div className="flex justify-between font-display text-lg font-extrabold text-brand-700">
              <span>סה״כ לתשלום</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              ביטול
            </Button>
            <Button type="button" className="flex-1" onClick={() => setStep("payment")}>
              המשך לתשלום
            </Button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm">
            <div className="flex justify-between font-semibold text-brand-800">
              <span>לתשלום</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="mt-1 text-brand-700">
              {count} {count === 1 ? "ילד/ה" : "ילדים"} · {classTitle}
            </p>
          </div>

          <div className="space-y-3">
            <Field label="מספר כרטיס" htmlFor="demo-card">
              <Input
                id="demo-card"
                dir="ltr"
                defaultValue="4580 0000 0000 0001"
                readOnly
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="תוקף" htmlFor="demo-expiry">
                <Input id="demo-expiry" dir="ltr" defaultValue="12/28" readOnly />
              </Field>
              <Field label="CVV" htmlFor="demo-cvv">
                <Input id="demo-cvv" dir="ltr" defaultValue="123" readOnly />
              </Field>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={() => setStep("summary")}
            >
              חזרה
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={loading}
              onClick={handlePay}
            >
              {loading ? "מעבד תשלום..." : `שלם ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aqua-100 text-3xl">
            ✓
          </div>
          <div>
            <p className="font-semibold text-ink-900">
              {count === 1
                ? `${selectedChildren[0]?.full_name} נרשם/ה לחוג`
                : `${count} ילדים נרשמו לחוג`}
            </p>
            {paymentReference && (
              <p className="mt-1 text-xs text-ink-400" dir="ltr">
                אישור: {paymentReference}
              </p>
            )}
          </div>
          <Button type="button" className="w-full" onClick={handleClose}>
            סגירה
          </Button>
        </div>
      )}
    </Modal>
  );
}
