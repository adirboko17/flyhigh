import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { formatFileSize } from "@/lib/storage/instructorDocuments";

export const BUSINESS_DOCUMENTS_BUCKET = "business-documents";
export const MAX_BUSINESS_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const BUSINESS_DOC_CATEGORIES = [
  { value: "osek", label: "תעודת עוסק" },
  { value: "account_management", label: "אישור ניהול חשבון" },
  { value: "tax_withholding", label: "אישור ניכוי מס במקור" },
  { value: "bookkeeping", label: "אישור ניהול ספרים" },
  { value: "insurance", label: "ביטוח" },
  { value: "license", label: "רישיון עסק" },
  { value: "other", label: "אחר" },
] as const;

export type BusinessDocCategory =
  (typeof BUSINESS_DOC_CATEGORIES)[number]["value"];

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

export { formatFileSize };

export function businessDocCategoryLabel(category: string): string {
  return (
    BUSINESS_DOC_CATEGORIES.find((item) => item.value === category)?.label ??
    category
  );
}

export function validateBusinessDocumentFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "סוג הקובץ אינו נתמך. העלו PDF, תמונה, DOC או DOCX.";
  }
  if (file.size > MAX_BUSINESS_DOCUMENT_BYTES) {
    return "גודל הקובץ המקסימלי הוא 10MB.";
  }
  return null;
}

export async function uploadBusinessDocumentFile(
  supabase: SupabaseClient<Database>,
  file: File
): Promise<{ path?: string; error?: string }> {
  const validationError = validateBusinessDocumentFile(file);
  if (validationError) return { error: validationError };

  const ext =
    EXT_BY_MIME[file.type] ||
    file.name.split(".").pop()?.toLowerCase() ||
    "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
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

export async function createBusinessDocumentSignedUrl(
  supabase: SupabaseClient<Database>,
  filePath: string,
  expiresIn = 120
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    return { error: "לא ניתן לפתוח את המסמך כרגע." };
  }

  return { url: data.signedUrl };
}

export async function deleteBusinessDocumentFile(
  supabase: SupabaseClient<Database>,
  filePath: string
): Promise<{ error?: string }> {
  const { error } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .remove([filePath]);

  if (error) {
    return { error: "מחיקת הקובץ נכשלה." };
  }

  return {};
}
