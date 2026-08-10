"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import {
  INSTRUCTOR_DOC_CATEGORIES,
  createInstructorDocumentSignedUrl,
  deleteInstructorDocumentFile,
  formatFileSize,
  instructorDocCategoryLabel,
  uploadInstructorDocumentFile,
  validateInstructorDocumentFile,
  type InstructorDocCategory,
} from "@/lib/storage/instructorDocuments";
import { cn } from "@/utils/cn";
import { formatDateShort } from "@/utils/format";
import type { InstructorDocument } from "@/types";

const FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type InstructorDocumentRow = Pick<
  InstructorDocument,
  | "id"
  | "title"
  | "category"
  | "file_name"
  | "file_path"
  | "file_size"
  | "mime_type"
  | "notes"
  | "created_at"
>;

interface InstructorDocumentsPanelProps {
  instructorId: string;
  documents: InstructorDocumentRow[];
  /** אדמין יכול להעלות ולמחוק; מדריכה רק צופה ומורידה. */
  canManage: boolean;
  emptyDescription?: string;
}

function resetFormState() {
  return {
    title: "",
    category: "form_101" as InstructorDocCategory,
    notes: "",
    file: null as File | null,
    error: null as string | null,
  };
}

export function InstructorDocumentsPanel({
  instructorId,
  documents,
  canManage,
  emptyDescription = "עדיין לא הועלו מסמכים.",
}: InstructorDocumentsPanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<InstructorDocCategory>("form_101");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  function closeUploadModal() {
    if (busy) return;
    setUploadOpen(false);
    const next = resetFormState();
    setTitle(next.title);
    setCategory(next.category);
    setNotes(next.notes);
    setFile(next.file);
    setError(next.error);
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickFile(next: File | null, input?: HTMLInputElement | null) {
    if (!next) {
      setFile(null);
      return;
    }
    const validationError = validateInstructorDocumentFile(next);
    if (validationError) {
      setError(validationError);
      if (input) input.value = "";
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  async function openDocument(doc: InstructorDocumentRow) {
    setOpeningId(doc.id);
    setError(null);
    const supabase = createClient();
    const result = await createInstructorDocumentSignedUrl(
      supabase,
      doc.file_path
    );
    setOpeningId(null);

    if (result.error || !result.url) {
      setError(result.error ?? "לא ניתן לפתוח את המסמך.");
      return;
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("יש להזין כותרת למסמך.");
      return;
    }
    if (!file) {
      setError("יש לבחור קובץ להעלאה.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const uploaded = await uploadInstructorDocumentFile(
      supabase,
      instructorId,
      file
    );

    if (uploaded.error || !uploaded.path) {
      setBusy(false);
      setError(uploaded.error ?? "ההעלאה נכשלה.");
      return;
    }

    const { error: insertError } = await supabase
      .from("instructor_documents")
      .insert({
        instructor_id: instructorId,
        title: trimmedTitle,
        category,
        file_path: uploaded.path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        notes: notes.trim() || null,
        uploaded_by: user?.id ?? null,
      });

    if (insertError) {
      await deleteInstructorDocumentFile(supabase, uploaded.path);
      setBusy(false);
      setError("שמירת המסמך נכשלה. נסו שוב.");
      return;
    }

    setBusy(false);
    setUploadOpen(false);
    const next = resetFormState();
    setTitle(next.title);
    setCategory(next.category);
    setNotes(next.notes);
    setFile(next.file);
    setError(next.error);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(doc: InstructorDocumentRow) {
    if (!canManage) return;
    const confirmed = window.confirm(
      `למחוק את המסמך "${doc.title}"? פעולה זו אינה ניתנת לביטול.`
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("instructor_documents")
      .delete()
      .eq("id", doc.id);

    if (deleteError) {
      setBusy(false);
      setError("מחיקת המסמך נכשלה.");
      return;
    }

    await deleteInstructorDocumentFile(supabase, doc.file_path);
    setBusy(false);
    router.refresh();
  }

  const uploadButton = (
    <Button type="button" onClick={() => setUploadOpen(true)}>
      + העלאת מסמך
    </Button>
  );

  return (
    <div className="space-y-4">
      {canManage && documents.length > 0 && (
        <div className="flex justify-end">{uploadButton}</div>
      )}

      {error && !uploadOpen && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}

      {documents.length === 0 ? (
        <EmptyState
          title="אין מסמכים"
          description={emptyDescription}
          action={canManage ? uploadButton : undefined}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-ink-100">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{doc.title}</p>
                    <Badge tone="brand">
                      {instructorDocCategoryLabel(doc.category)}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-ink-500">
                    {doc.file_name}
                    {" · "}
                    {formatFileSize(doc.file_size)}
                    {" · "}
                    {formatDateShort(doc.created_at)}
                  </p>
                  {doc.notes && (
                    <p className="text-sm text-ink-600">{doc.notes}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={openingId === doc.id || busy}
                    onClick={() => void openDocument(doc)}
                  >
                    {openingId === doc.id ? "פותח..." : "פתיחה"}
                  </Button>
                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => void handleDelete(doc)}
                    >
                      מחיקה
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canManage && (
        <Modal
          open={uploadOpen}
          onClose={closeUploadModal}
          title="העלאת מסמך"
          description="המסמך יהיה זמין גם למדריכה באזור האישי שלה."
        >
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="כותרת" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: טופס 101 — 2026"
                  disabled={busy}
                  required
                />
              </Field>
              <Field label="סוג מסמך">
                <Select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as InstructorDocCategory)
                  }
                  disabled={busy}
                >
                  {INSTRUCTOR_DOC_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="קובץ" required>
              <div className="space-y-2">
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-lg">
                      📄
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-white hover:text-ink-900 disabled:opacity-50"
                    >
                      הסרה
                    </button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50/50 px-6 py-7 text-center transition hover:border-brand-300 hover:bg-brand-50/40",
                      busy && "pointer-events-none opacity-50"
                    )}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-ink-100">
                      📎
                    </span>
                    <span className="mt-3 text-sm font-semibold text-ink-800">
                      לחצו לבחירת קובץ
                    </span>
                    <span className="mt-1 text-xs text-ink-500">
                      PDF, תמונה, DOC או DOCX · עד 10MB
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={FILE_ACCEPT}
                      disabled={busy}
                      required={!file}
                      className="sr-only"
                      onChange={(e) =>
                        pickFile(e.target.files?.[0] ?? null, e.target)
                      }
                    />
                  </label>
                )}
                {file && (
                  <label className="inline-block cursor-pointer text-sm font-medium text-brand-600 hover:underline">
                    החלפת קובץ
                    <input
                      type="file"
                      accept={FILE_ACCEPT}
                      disabled={busy}
                      className="sr-only"
                      onChange={(e) => {
                        pickFile(e.target.files?.[0] ?? null, e.target);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </Field>

            <Field label="הערה (אופציונלי)">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="פרטים נוספים למסמך..."
                disabled={busy}
                rows={2}
              />
            </Field>

            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
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
              <Button type="submit" disabled={busy}>
                {busy ? "מעלה..." : "העלאת מסמך"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
