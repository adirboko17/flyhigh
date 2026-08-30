"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cancelAdminEnrollment } from "@/lib/admin/enrollmentActions";
import { cn } from "@/utils/cn";

export function CancelEnrollmentButton({
  enrollmentId,
  title,
  participantName,
  actionLabel = "הסרה מהחוג",
  compact = false,
  className,
  onRemoved,
}: {
  enrollmentId: string;
  title: string;
  participantName: string;
  actionLabel?: string;
  compact?: boolean;
  className?: string;
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const result = await cancelAdminEnrollment(enrollmentId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    onRemoved?.();
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          compact && "h-7 px-2.5 text-xs",
          className
        )}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        הסרה
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
            ההרשמה תבוטל והמקום יתפנה. אם עדיין לא שולם — החיוב יימחק מהגבייה.
            אם כבר שולם — הלקוח ייכנס לעמוד זיכויים כזיכוי בהמתנה, עם סכום יחסי
            לפי המפגשים שנותרו.
          </p>
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
              disabled={loading}
              onClick={() => void handleCancel()}
            >
              {loading ? "מסיר..." : actionLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
