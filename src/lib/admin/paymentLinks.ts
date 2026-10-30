"use server";

import { assignChildrenToClass } from "@/lib/admin/assignment";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  dayLabel,
  isCollectionPaymentMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { formatDateShort } from "@/utils/format";

export type PaymentLinkClass = {
  id: string;
  title: string;
  price: number;
  pickOneSlot: boolean;
  appointment: boolean;
};

export type ClassScheduleChoice = {
  id: string;
  label: string;
  price: number | null;
};

function clock(value: string) {
  return value.slice(0, 5);
}

/** חוגים פעילים שאפשר לפתוח להם לינק תשלום מכרטיס הלקוח. */
export async function listClassesForPaymentLink(): Promise<PaymentLinkClass[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("classes")
    .select("id, title, price, pick_one_slot, booking_mode, interest_only, status")
    .in("status", ["active", "full"])
    .eq("interest_only", false)
    .order("title", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    price: Number(row.price),
    pickOneSlot: row.pick_one_slot && row.booking_mode !== "appointment",
    appointment: row.booking_mode === "appointment",
  }));
}

export async function listClassScheduleOptions(classId: string): Promise<{
  slots: ClassScheduleChoice[];
  sessions: ClassScheduleChoice[];
}> {
  const supabase = await createAdminDataClient();
  const [slots, sessions] = await Promise.all([
    supabase
      .from("class_weekly_slots")
      .select("id, day_of_week, start_time, end_time, price")
      .eq("class_id", classId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("class_sessions")
      .select("id, session_date, start_time, end_time")
      .eq("class_id", classId)
      .eq("status", "scheduled")
      .gte("session_date", todayInIsrael())
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(40),
  ]);

  return {
    slots: (slots.data ?? []).map((slot) => ({
      id: slot.id,
      label: `${dayLabel(slot.day_of_week)} ${clock(slot.start_time)}–${clock(slot.end_time)}`,
      price: slot.price == null ? null : Number(slot.price),
    })),
    sessions: (sessions.data ?? []).map((session) => ({
      id: session.id,
      label: `${formatDateShort(session.session_date)} ${clock(session.start_time)}–${clock(session.end_time)}`,
      price: null,
    })),
  };
}

/**
 * רושם חוג על הלקוח ופותח דף תשלום של קארדקום.
 * באשראי מוחזר לינק. בשאר האמצעים החיוב נפתח בגבייה.
 */
export async function createClassOfficeCharge(input: {
  parentId: string;
  classId: string;
  childId: string | null;
  amount: number | string;
  method: CollectionPaymentMethod;
  weeklySlotId?: string | null;
  sessionId?: string | null;
}): Promise<
  { success: true; checkoutUrl?: string } | { success: false; error: string }
> {
  if (!isCollectionPaymentMethod(input.method)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו תקין." };
  }

  const classMethod =
    input.method === "credit_card" ||
    input.method === "cash" ||
    input.method === "bank_transfer" ||
    input.method === "maccabi" ||
    input.method === "amit"
      ? input.method
      : null;
  if (!classMethod) {
    return {
      success: false,
      error: "לחוג אפשר אשראי, מזומן, העברה, מכבי או עמית.",
    };
  }

  const result = await assignChildrenToClass({
    classId: input.classId,
    parentId: input.parentId,
    childIds: input.childId ? [input.childId] : [],
    includeSelf: !input.childId,
    amount: Number(input.amount),
    method: classMethod,
    markPaid: false,
    weeklySlotId: input.weeklySlotId,
    sessionId: input.sessionId,
    officeCollection: input.method === "credit_card",
  });

  if (!result.success) return result;
  if (input.method === "credit_card" && !result.checkoutUrl) {
    return { success: false, error: "לא הצלחנו לפתוח את דף התשלום." };
  }

  return { success: true, checkoutUrl: result.checkoutUrl ?? undefined };
}
