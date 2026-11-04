"use server";

import { revalidatePath } from "next/cache";
import { createAdminDataClient } from "@/lib/admin/dataClient";

const ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isCalendarDate(value: string) {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** צהריים בישראל, כדי שתאריך הרכישה לא יזוז בגלל אזור הזמן. */
function israelNoonIso(date: string) {
  const utcNoon = new Date(`${date}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(utcNoon);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const shownAsUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute")
  );
  return new Date(utcNoon.getTime() - (shownAsUtc - utcNoon.getTime())).toISOString();
}

function revalidateBuyerDates() {
  revalidatePath("/admin/buyers");
  revalidatePath("/admin");
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/customers");
  revalidatePath("/parent/dashboard");
}

export async function updatePlanBuyerDates(input: {
  enrollmentId: string;
  startsOn?: string;
  endsOn?: string;
  purchasedOn?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!ID.test(input.enrollmentId)) {
    return { success: false, error: "הרכישה לא נמצאה." };
  }

  const supabase = await createAdminDataClient();
  const { data, error: loadError } = await supabase
    .from("enrollments")
    .select("id, type, programs(kind)")
    .eq("id", input.enrollmentId)
    .maybeSingle();

  if (loadError || !data) {
    return { success: false, error: "הרכישה לא נמצאה." };
  }

  const program = asOne(data.programs);
  const isMembership = data.type === "program" && program?.kind === "membership";
  const isPass = data.type === "pool_pass";

  if (isPass) {
    const purchasedOn = input.purchasedOn?.trim() ?? "";
    if (!isCalendarDate(purchasedOn)) {
      return { success: false, error: "תאריך הרכישה לא תקין." };
    }
    const { error } = await supabase
      .from("enrollments")
      .update({ created_at: israelNoonIso(purchasedOn) })
      .eq("id", data.id);
    if (error) {
      return { success: false, error: "שמירת תאריך הרכישה נכשלה. נסו שוב." };
    }
    revalidateBuyerDates();
    return { success: true };
  }

  if (!isMembership) {
    return { success: false, error: "אפשר לערוך תאריכים רק למנוי או לכרטיסייה." };
  }

  const startsOn = input.startsOn?.trim() ?? "";
  const endsOn = input.endsOn?.trim() ?? "";
  if (!isCalendarDate(startsOn)) {
    return { success: false, error: "תאריך ההתחלה לא תקין." };
  }
  if (!isCalendarDate(endsOn)) {
    return { success: false, error: "תאריך הסיום לא תקין." };
  }
  if (endsOn < startsOn) {
    return {
      success: false,
      error: "תאריך הסיום צריך להיות בתאריך ההתחלה או אחריו.",
    };
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ starts_on: startsOn, ends_on: endsOn })
    .eq("id", data.id);

  if (error) {
    return { success: false, error: "שמירת תאריכי המנוי נכשלה. נסו שוב." };
  }

  revalidateBuyerDates();
  return { success: true };
}
