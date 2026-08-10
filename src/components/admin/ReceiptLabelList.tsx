"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSection } from "@/components/admin/AdminSection";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/client";

export type AdminReceiptLabelRow = {
  id: string;
  label: string;
  is_active: boolean;
  sort_order: number;
};

export function ReceiptLabelList({ labels }: { labels: AdminReceiptLabelRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminReceiptLabelRow | "new" | null>(
    null
  );

  const sorted = useMemo(
    () =>
      [...labels].sort(
        (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "he")
      ),
    [labels]
  );

  return (
    <>
      <AdminSection
        id="receipt-labels"
        icon="🧾"
        title="תוויות לקבלה"
        count={sorted.length}
        totalCount={labels.length}
        onNew={() => setEditing("new")}
        newLabel="+ תווית חדשה"
      >
        {labels.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            עדיין אין תוויות — הוסיפו את הראשונה ולקוחות יוכלו לבחור אותה
            בתשלום.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>תווית</TH>
                <TH className="hidden sm:table-cell">סדר</TH>
                <TH>סטטוס</TH>
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {sorted.map((row) => (
                <TR key={row.id}>
                  <TD className="font-semibold text-ink-900">{row.label}</TD>
                  <TD className="hidden tabular-nums text-ink-500 sm:table-cell">
                    {row.sort_order}
                  </TD>
                  <TD>
                    <Badge tone={row.is_active ? "success" : "neutral"}>
                      {row.is_active ? "פעילה" : "מושבתת"}
                    </Badge>
                  </TD>
                  <TD>
                    <AdminRowActions
                      itemLabel={row.label}
                      onEdit={() => setEditing(row)}
                      onDelete={async () => {
                        const result = await deleteAdminRow(
                          createClient(),
                          "receipt_labels",
                          row.id
                        );
                        if (!result.error) router.refresh();
                        return result;
                      }}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </AdminSection>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "תווית חדשה" : "עריכת תווית"}
        description="הטקסט שיופיע ללקוח בבחירת פרטי הקבלה."
      >
        {editing !== null && (
          <ReceiptLabelForm
            existing={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}

function ReceiptLabelForm({
  existing,
  onClose,
}: {
  existing: AdminReceiptLabelRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [label, setLabel] = useState(existing?.label ?? "");
  const [sortOrder, setSortOrder] = useState(String(existing?.sort_order ?? 100));
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      setError("נא להזין תווית בת לפחות שני תווים.");
      return;
    }
    if (trimmed.length > 120) {
      setError("התווית ארוכה מדי (עד 120 תווים).");
      return;
    }

    const order = Number(sortOrder);
    if (!Number.isFinite(order)) {
      setError("סדר התצוגה חייב להיות מספר.");
      return;
    }

    setError(null);
    setLoading(true);

    const payload = {
      label: trimmed,
      sort_order: Math.round(order),
      is_active: isActive,
    };

    const supabase = createClient();
    const { error: dbError } = isEdit
      ? await supabase
          .from("receipt_labels")
          .update(payload)
          .eq("id", existing!.id)
      : await supabase.from("receipt_labels").insert(payload);

    setLoading(false);

    if (dbError) {
      setError("שמירת התווית נכשלה. נסו שוב.");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="טקסט על הקבלה" htmlFor="receipt-label-text">
        <Input
          id="receipt-label-text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="למשל: טיפול הידרותרפיה"
          maxLength={120}
          required
        />
      </Field>

      <Field
        label="סדר תצוגה"
        htmlFor="receipt-label-order"
        hint="מספר נמוך יותר מופיע קודם ברשימה."
      >
        <Input
          id="receipt-label-order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </Field>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300"
          />
          תווית פעילה (זמינה לבחירה בתשלום)
        </label>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="sm:flex-1"
          onClick={onClose}
          disabled={loading}
        >
          ביטול
        </Button>
        <Button type="submit" className="sm:flex-1" disabled={loading}>
          {loading ? "שומר..." : isEdit ? "שמירה" : "יצירה"}
        </Button>
      </div>
    </form>
  );
}
