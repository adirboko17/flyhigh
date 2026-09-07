import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { formatFileSize } from "@/lib/storage/instructorDocuments";

export const BUSINESS_EXPENSES_BUCKET = "business-expenses";
export const MAX_BUSINESS_EXPENSE_BYTES = 10 * 1024 * 1024;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export { formatFileSize };

export function expenseTitleFromFileName(name: string): string {
  const trimmed = name.trim();
  const withoutExt = trimmed.replace(/\.[^.]+$/, "").trim();
  return withoutExt || trimmed;
}

export function resolveExpenseFileType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? (MIME_BY_EXT[ext] ?? null) : null;
}

export function validateBusinessExpenseFile(file: File): string | null {
  if (!resolveExpenseFileType(file)) {
    return "סוג הקובץ אינו נתמך. העלו PDF, תמונה, DOC או DOCX.";
  }
  if (file.size > MAX_BUSINESS_EXPENSE_BYTES) {
    return "גודל הקובץ המקסימלי הוא 10MB.";
  }
  return null;
}

export function parseExpenseAmount(value: string): number | null | "invalid" {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return "invalid";
  return Math.round(amount * 100) / 100;
}

export async function uploadBusinessExpenseFile(
  supabase: SupabaseClient<Database>,
  file: File,
  month: string
): Promise<{ path?: string; error?: string }> {
  if (!MONTH_PATTERN.test(month)) {
    return { error: "חודש לא תקין." };
  }

  const validationError = validateBusinessExpenseFile(file);
  if (validationError) return { error: validationError };

  const mime = resolveExpenseFileType(file) ?? file.type;
  const ext =
    EXT_BY_MIME[mime] ||
    file.name.split(".").pop()?.toLowerCase() ||
    "bin";
  const path = `${month}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUSINESS_EXPENSES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mime,
    });

  if (error) {
    return { error: "העלאת הקובץ נכשלה. נסו שוב." };
  }

  return { path };
}

export async function createBusinessExpenseSignedUrl(
  supabase: SupabaseClient<Database>,
  filePath: string,
  expiresIn = 120
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from(BUSINESS_EXPENSES_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    return { error: "לא ניתן לפתוח את המסמך כרגע." };
  }

  return { url: data.signedUrl };
}

export async function downloadBusinessExpenseFile(
  supabase: SupabaseClient<Database>,
  filePath: string
): Promise<{ data?: Blob; error?: string }> {
  const { data, error } = await supabase.storage
    .from(BUSINESS_EXPENSES_BUCKET)
    .download(filePath);

  if (error || !data) {
    return { error: "הורדת הקובץ נכשלה." };
  }

  return { data };
}

export async function deleteBusinessExpenseFile(
  supabase: SupabaseClient<Database>,
  filePath: string
): Promise<{ error?: string }> {
  const { error } = await supabase.storage
    .from(BUSINESS_EXPENSES_BUCKET)
    .remove([filePath]);

  if (error) {
    return { error: "מחיקת הקובץ נכשלה." };
  }

  return {};
}
