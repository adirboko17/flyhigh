"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cancelInterestEnrollment } from "@/lib/enrollment/actions";

export function CancelInterestEnrollmentButton({
  enrollmentId,
  classTitle,
  traineeName,
}: {
  enrollmentId: string;
  classTitle: string;
  traineeName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const result = await cancelInterestEnrollment(enrollmentId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        ביטול הרשמה
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="ביטול הרשמת עניין"
        description={`${classTitle} · ${traineeName}`}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            ההרשמה תבוטל. אפשר להירשם שוב מאוחר יותר אם החוג עדיין פתוח
            להרשמת עניין.
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
              {loading ? "מבטל..." : "ביטול ההרשמה"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
