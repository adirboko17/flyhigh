"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  cancelAdminEnrollment,
  loadEnrollmentCancellationPreview,
  type EnrollmentCancellationPreview,
} from "@/lib/admin/enrollmentActions";
import { PAYMENT_METHOD } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

export function CancelEnrollmentButton({
  enrollmentId,
  title,
  participantName,
  actionLabel = "הסרה מהחוג",
  compact = false,
  alwaysCredit = false,
  className,
  onRemoved,
}: {
  enrollmentId: string;
  title: string;
  participantName: string;
  actionLabel?: string;
  compact?: boolean;
  /** הסרה וזיכוי — תמיד מפיקים חשבונית זיכוי אם יש מה לזכות. */
  alwaysCredit?: boolean;
  className?: string;
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<EnrollmentCancellationPreview | null>(
    null
  );
  const [issueCredit, setIssueCredit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreview(null);
    setIssueCredit(true);
    loadEnrollmentCancellationPreview(enrollmentId).then((data) => {
      if (cancelled) return;
      setPreview(data);
      setIssueCredit(alwaysCredit || (data?.creditTotal ?? 0) > 0);
      setPreviewLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, enrollmentId, alwaysCredit]);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const result = await cancelAdminEnrollment(enrollmentId, {
      issueCreditInvoice: Boolean(
        preview && preview.creditTotal > 0 && (alwaysCredit || issueCredit)
      ),
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    onRemoved?.();
    router.refresh();
  }

  const canCredit = (preview?.creditTotal ?? 0) > 0;
  const refundsCard = preview?.creditTargets.some((target) => target.refundsCard);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(compact && "h-7 px-2.5 text-xs", className)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {alwaysCredit ? "הסרה וזיכוי" : "הסרה"}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title={actionLabel}
        description={`${title} · ${participantName}`}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            ההרשמה תבוטל והמקום יתפנה
            {preview && preview.openChargeCount > 0
              ? ". חיוב שעדיין לא שולם יימחק מהגבייה."
              : "."}
          </p>

          {previewLoading && (
            <p className="text-sm text-ink-400">בודק אם יש חשבונית מס-קבלה...</p>
          )}

          {canCredit && preview && (
            alwaysCredit ? (
              <p className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600">
                תופק חשבונית זיכוי על {formatCurrency(preview.creditTotal)}
                {preview.creditTargets
                  .map((target) =>
                    target.paymentMethod
                      ? ` · ${PAYMENT_METHOD[target.paymentMethod]}`
                      : ""
                  )
                  .join("")}
                {refundsCard
                  ? ". בעסקת אשראי הכסף יוחזר גם לכרטיס."
                  : ". ההחזר הכספי עצמו יטופל מול הלקוח."}
              </p>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 px-4 py-3">
                <input
                  type="checkbox"
                  checked={issueCredit}
                  disabled={loading}
                  onChange={(event) => setIssueCredit(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-300"
                />
                <span>
                  <span className="block text-sm font-medium text-ink-900">
                    להפיק חשבונית זיכוי על {formatCurrency(preview.creditTotal)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    {preview.creditTargets
                      .map((target) =>
                        target.paymentMethod
                          ? `${PAYMENT_METHOD[target.paymentMethod]} · ${formatCurrency(target.remaining)}`
                          : formatCurrency(target.remaining)
                      )
                      .join(" · ")}
                    {refundsCard
                      ? ". בעסקת אשראי הכסף יוחזר גם לכרטיס."
                      : ". ההחזר הכספי עצמו יטופל מול הלקוח."}
                  </span>
                </span>
              </label>
            )
          )}

          {!previewLoading && preview && !canCredit && (
            <p className="text-sm leading-relaxed text-ink-500">
              אין חשבונית מס-קבלה לזיכוי על ההרשמה הזו.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading || previewLoading}
              onClick={() => void handleCancel()}
            >
              {loading
                ? issueCredit && canCredit
                  ? "מפיק זיכוי ומסיר..."
                  : "מסיר..."
                : actionLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
