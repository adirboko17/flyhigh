import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const INSTRUCTOR_DOCUMENTS_BUCKET = "instructor-documents";
export const MAX_INSTRUCTOR_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const INSTRUCTOR_DOC_CATEGORIES = [
  { value: "form_101", label: "טופס 101" },
  { value: "employment", label: "הסכם העסקה" },
  { value: "id", label: "תעודת זהות" },
  { value: "bank", label: "פרטי בנק" },
  { value: "other", label: "אחר" },
] as const;

export type InstructorDocCategory =
  (typeof INSTRUCTOR_DOC_CATEGORIES)[number]["value"];

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export function instructorDocCategoryLabel(category: string): string {
  return (
    INSTRUCTOR_DOC_CATEGORIES.find((c) => c.value === category)?.label ??
    category
  );
}

export function validateInstructorDocumentFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "סוג הקובץ אינו נתמך. העלו PDF, תמונה, DOC או DOCX.";
  }
  if (file.size > MAX_INSTRUCTOR_DOCUMENT_BYTES) {
    return "גודל הקובץ המקסימלי הוא 10MB.";
  }
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadInstructorDocumentFile(
  supabase: SupabaseClient<Database>,
  instructorId: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  const validationError = validateInstructorDocumentFile(file);
  if (validationError) return { error: validationError };

  const ext =
    EXT_BY_MIME[file.type] ||
    file.name.split(".").pop()?.toLowerCase() ||
    "bin";
  const path = `${instructorId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(INSTRUCTOR_DOCUMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { error: "העלאת הקובץ נכשלה. נסו שוב." };
  }

  return { path };
}

export async function createInstructorDocumentSignedUrl(
  supabase: SupabaseClient<Database>,
  filePath: string,
  expiresIn = 120
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from(INSTRUCTOR_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    return { error: "לא ניתן לפתוח את המסמך כרגע." };
  }

  return { url: data.signedUrl };
}

export async function deleteInstructorDocumentFile(
  supabase: SupabaseClient<Database>,
  filePath: string
): Promise<{ error?: string }> {
  const { error } = await supabase.storage
    .from(INSTRUCTOR_DOCUMENTS_BUCKET)
    .remove([filePath]);

  if (error) {
    return { error: "מחיקת הקובץ נכשלה." };
  }

  return {};
}
