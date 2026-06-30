import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "class-images";
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateClassImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "יש להעלות קובץ תמונה (JPG, PNG, WebP או GIF).";
  }
  if (file.size > MAX_BYTES) {
    return "גודל הקובץ המקסימלי הוא 5MB.";
  }
  return null;
}

export async function uploadClassImage(
  supabase: SupabaseClient<Database>,
  file: File
): Promise<{ url?: string; error?: string }> {
  const validationError = validateClassImageFile(file);
  if (validationError) return { error: validationError };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    return { error: "העלאת התמונה נכשלה. נסו שוב." };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
