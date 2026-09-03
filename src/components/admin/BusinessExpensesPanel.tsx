"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/client";
import {
  createBusinessExpenseSignedUrl,
  deleteBusinessExpenseFile,
  downloadBusinessExpenseFile,
  expenseTitleFromFileName,
  formatFileSize,
  parseExpenseAmount,
  resolveExpenseFileType,
  uploadBusinessExpenseFile,
  validateBusinessExpenseFile,
} from "@/lib/storage/businessExpenses";
import { createZip, triggerDownload, uniqueZipNames } from "@/lib/storage/zip";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDateShort } from "@/utils/format";
import type { BusinessExpense } from "@/types";

const FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type BusinessExpenseRow = Pick<
  BusinessExpense,
  | "id"
  | "month"
  | "title"
  | "amount"
  | "file_name"
  | "file_path"
  | "file_size"
  | "mime_type"
  | "notes"
  | "created_at"
>;

type PendingFile = {
  id: string;
  file: File;
  title: string;
  amount: string;
};

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

export function BusinessExpensesPanel({
  month,
  monthTitle,
  expenses,
}: {
  month: string;
  monthTitle: string;
  expenses: BusinessExpenseRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<string | null>(null);

  const totalAmount = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + (expense.amount == null ? 0 : Number(expense.amount)),
        0
      ),
    [expenses]
  );
  const amountsCount = expenses.filter((expense) => expense.amount != null).length;

  function closeUploadModal() {
    if (busy) return;
    setUploadOpen(false);
    setPending([]);
    setNotes("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addFiles(list: FileList | File[] | null) {
    if (!list || list.length === 0) return;
    const next: PendingFile[] = [];
    let lastError: string | null = null;

    for (const file of Array.from(list)) {
      const validationError = validateBusinessExpenseFile(file);
      if (validationError) {
        lastError = validationError;
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        title: expenseTitleFromFileName(file.name),
        amount: "",
      });
    }

    if (next.length === 0) {
      setError(lastError ?? "לא נבחרו קבצים תקינים.");
      return;
    }

    setError(lastError);
    setPending((current) => [...current, ...next]);
  }

  function updatePending(id: string, patch: Partial<Pick<PendingFile, "title" | "amount">>) {
    setPending((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function openExpense(expense: BusinessExpenseRow) {
    setOpeningId(expense.id);
    setError(null);
    const supabase = createClient();
    const result = await createBusinessExpenseSignedUrl(supabase, expense.file_path);
    setOpeningId(null);

    if (result.error || !result.url) {
      setError(result.error ?? "לא ניתן לפתוח את המסמך.");
      return;
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function downloadExpense(expense: BusinessExpenseRow) {
    setOpeningId(expense.id);
    setError(null);
    const supabase = createClient();
    const result = await downloadBusinessExpenseFile(supabase, expense.file_path);
    setOpeningId(null);

    if (result.error || !result.data) {
      setError(result.error ?? "הורדת הקובץ נכשלה.");
      return;
    }

    triggerDownload(result.data, expense.file_name);
  }

  async function downloadMonthZip() {
    if (expenses.length === 0) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const names = uniqueZipNames(expenses.map((expense) => expense.file_name));
    const entries: { name: string; data: Uint8Array }[] = [];

    try {
      for (let index = 0; index < expenses.length; index++) {
        setZipProgress(`מוריד ${index + 1} מתוך ${expenses.length}...`);
        const expense = expenses[index];
        const result = await downloadBusinessExpenseFile(supabase, expense.file_path);
        if (result.error || !result.data) {
          setError(result.error ?? `הורדת הקובץ "${expense.file_name}" נכשלה.`);
          setBusy(false);
          setZipProgress(null);
          return;
        }
        entries.push({
          name: names[index],
          data: await blobToUint8Array(result.data),
        });
      }

      setZipProgress("מכין קובץ ZIP...");
      const zip = createZip(entries);
      triggerDownload(zip, `hotzaot-${month}.zip`);
    } catch {
      setError("הכנת הקובץ להורדה נכשלה. נסו שוב.");
    }

    setBusy(false);
    setZipProgress(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (pending.length === 0) {
      setError("יש לבחור לפחות קובץ אחד.");
      return;
    }

    const rows: {
      file: File;
      title: string;
      amount: number | null;
    }[] = [];

    for (const item of pending) {
      const title = item.title.trim();
      if (!title) {
        setError("יש להזין כותרת לכל הוצאה.");
        return;
      }
      const amount = parseExpenseAmount(item.amount);
      if (amount === "invalid") {
        setError(`הסכום עבור "${title}" אינו תקין.`);
        return;
      }
      rows.push({ file: item.file, title, amount });
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sharedNotes = notes.trim() || null;
    const uploadedPaths: string[] = [];
    const insertedIds: string[] = [];

    async function rollbackUpload() {
      if (insertedIds.length > 0) {
        await supabase.from("business_expenses").delete().in("id", insertedIds);
      }
      await Promise.all(
        uploadedPaths.map((path) => deleteBusinessExpenseFile(supabase, path))
      );
    }

    for (const row of rows) {
      const uploaded = await uploadBusinessExpenseFile(supabase, row.file, month);
      if (uploaded.error || !uploaded.path) {
        await rollbackUpload();
        setBusy(false);
        setError(uploaded.error ?? "ההעלאה נכשלה.");
        return;
      }

      uploadedPaths.push(uploaded.path);
      const { data: inserted, error: insertError } = await supabase
        .from("business_expenses")
        .insert({
          month,
          title: row.title,
          amount: row.amount,
          file_path: uploaded.path,
          file_name: row.file.name,
          mime_type: resolveExpenseFileType(row.file),
          file_size: row.file.size,
          notes: sharedNotes,
          uploaded_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        await rollbackUpload();
        setBusy(false);
        setError("שמירת ההוצאה נכשלה. נסו שוב.");
        return;
      }

      insertedIds.push(inserted.id);
    }

    setBusy(false);
    setUploadOpen(false);
    setPending([]);
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(expense: BusinessExpenseRow) {
    const confirmed = window.confirm(
      `למחוק את ההוצאה "${expense.title}"? פעולה זו אינה ניתנת לביטול.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("business_expenses")
      .delete()
      .eq("id", expense.id);

    if (deleteError) {
      setBusy(false);
      setError("מחיקת ההוצאה נכשלה.");
      return;
    }

    await deleteBusinessExpenseFile(supabase, expense.file_path);
    setBusy(false);
    router.refresh();
  }

  const uploadButton = (
    <Button type="button" onClick={() => setUploadOpen(true)}>
      + העלאת הוצאות
    </Button>
  );

  return (
    <>
      {expenses.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void downloadMonthZip()}
          >
            {zipProgress ?? "הורדת כל החודש (ZIP)"}
          </Button>
          {uploadButton}
        </div>
      )}

      {error && !uploadOpen && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>מסמכי {monthTitle}</CardTitle>
            <p className="mt-1 text-sm text-ink-500">
              {expenses.length > 0
                ? `${expenses.length} מסמכים${
                    amountsCount > 0 ? ` · ${formatCurrency(totalAmount)} בסכומים שמולאו` : ""
                  }`
                : "עדיין אין הוצאות לחודש זה"}
            </p>
          </div>
        </CardHeader>

        {expenses.length === 0 ? (
          <EmptyState
            icon="📂"
            title="אין הוצאות בחודש זה"
            description="העלו קבלות, חשבוניות או צילומים. בסוף החודש אפשר להוריד הכל כקובץ אחד ולשלוח לרואה החשבון."
            action={uploadButton}
            className="rounded-none border-0 bg-transparent"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>הוצאה</TH>
                <TH className="hidden sm:table-cell">קובץ</TH>
                <TH>סכום</TH>
                <TH className="hidden md:table-cell">הועלה</TH>
                <TH>
                  <span className="sr-only">פעולות</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {expenses.map((expense) => (
                <TR key={expense.id}>
                  <TD className="min-w-0">
                    <p className="max-w-[14rem] truncate font-semibold text-ink-900 sm:max-w-none">
                      {expense.title}
                    </p>
                    {expense.notes && (
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-ink-500">
                        {expense.notes}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-ink-400 sm:hidden">
                      {expense.file_name}
                    </p>
                  </TD>
                  <TD className="hidden max-w-[12rem] truncate text-ink-600 sm:table-cell">
                    {expense.file_name}
                    <span className="ms-1 text-ink-400">
                      · {formatFileSize(expense.file_size)}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {expense.amount == null ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      formatCurrency(Number(expense.amount))
                    )}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-ink-500 md:table-cell">
                    {formatDateShort(expense.created_at)}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={openingId === expense.id || busy}
                        onClick={() => void openExpense(expense)}
                      >
                        {openingId === expense.id ? "פותח..." : "פתיחה"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={openingId === expense.id || busy}
                        onClick={() => void downloadExpense(expense)}
                      >
                        הורדה
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => void handleDelete(expense)}
                      >
                        מחיקה
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={uploadOpen}
        onClose={closeUploadModal}
        title="העלאת הוצאות"
        description={`${monthTitle} · הקבצים יישמרו במאגר הפרטי ויהיו זמינים רק למנהלים.`}
        className="max-w-2xl"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <Field label="קבצים" required>
            <div className="space-y-2">
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50/50 px-6 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40",
                  busy && "pointer-events-none opacity-50"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-ink-100">
                  📎
                </span>
                <span className="mt-3 text-sm font-semibold text-ink-800">
                  לחצו לבחירה או גררו לכאן
                </span>
                <span className="mt-1 text-xs text-ink-500">
                  אפשר כמה קבצים יחד · PDF, תמונה, DOC או DOCX · עד 10MB לקובץ
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  multiple
                  disabled={busy}
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              {pending.length > 0 && (
                <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
                  {pending.map((item) => (
                    <li key={item.id} className="space-y-3 px-3 py-3 sm:px-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-base">
                          📄
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-ink-500">
                            {formatFileSize(item.file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPending((current) =>
                              current.filter((file) => file.id !== item.id)
                            )
                          }
                          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900 disabled:opacity-50"
                        >
                          הסרה
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                        <Field label="כותרת" required>
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              updatePending(item.id, { title: e.target.value })
                            }
                            placeholder="לדוגמה: חשבונית חשמל"
                            disabled={busy}
                            required
                          />
                        </Field>
                        <Field label="סכום">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={item.amount}
                            onChange={(e) =>
                              updatePending(item.id, { amount: e.target.value })
                            }
                            placeholder="אופציונלי"
                            disabled={busy}
                          />
                        </Field>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          <Field label="הערה לכל הקבצים (אופציונלי)">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="לדוגמה: נשלח לרואה חשבון, מספר חשבונית..."
              disabled={busy}
              rows={2}
            />
          </Field>

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={closeUploadModal}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={busy || pending.length === 0}>
              {busy
                ? "מעלה..."
                : pending.length > 1
                  ? `העלאת ${pending.length} מסמכים`
                  : "העלאה"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
