"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import {
  grantCustomerBalance,
  roundMoney,
} from "@/lib/payments/checkoutBalance";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";

const MAX_MANUAL_GRANT = 50000;

export type CustomerBalanceEntry = {
  id: string;
  amount: number;
  kind: string;
  note: string | null;
  createdAt: string;
};

export type ManualBalanceResult =
  | { success: true; balance: number }
  | { success: false; error: string };

function parseMoney(raw: string): number | null {
  const trimmed = raw.trim().replace(/₪/g, "").replace(/\s/g, "");
  if (!trimmed) return null;
  const normalized = trimmed.includes(".")
    ? trimmed.replace(/,/g, "")
    : trimmed.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = roundMoney(Number(normalized));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

async function requireAdmin() {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "אין לך הרשאה לבצע פעולה זו." };
  }
  if (!isAdminClientConfigured()) {
    return {
      ok: false as const,
      error: "ניהול היתרות אינו מוגדר בשרת. נסו שוב מאוחר יותר.",
    };
  }
  return { ok: true as const, profile, admin: createAdminClient() };
}

export async function loadCustomerBalanceEntries(
  parentId: string
): Promise<CustomerBalanceEntry[]> {
  const access = await requireAdmin();
  if (!access.ok) return [];

  const { data } = await access.admin
    .from("customer_balance_entries")
    .select("id, amount, kind, note, created_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(8);

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: roundMoney(Number(row.amount)),
    kind: row.kind,
    note: row.note,
    createdAt: row.created_at,
  }));
}

/** מוסיף יתרה ללקוח בלי לקשור אותה לעסקה, בלי חשבונית ובלי רישום תשלום. */
export async function addManualCustomerBalance(input: {
  parentId: string;
  amount: string;
  note: string;
}): Promise<ManualBalanceResult> {
  const access = await requireAdmin();
  if (!access.ok) return { success: false, error: access.error };

  const amount = parseMoney(input.amount);
  if (amount === null) {
    return { success: false, error: "נא להזין סכום חיובי, עד שתי ספרות אחרי הנקודה." };
  }
  if (amount > MAX_MANUAL_GRANT) {
    return {
      success: false,
      error: `אפשר להוסיף עד ${MAX_MANUAL_GRANT.toLocaleString("he-IL")} ₪ בפעולה אחת.`,
    };
  }

  const note = input.note.trim();
  if (note.length > 400) {
    return { success: false, error: "ההערה ארוכה מדי." };
  }

  const { data: parent } = await access.admin
    .from("profiles")
    .select("id, role")
    .eq("id", input.parentId)
    .maybeSingle();
  if (!parent || parent.role !== "parent") {
    return { success: false, error: "הלקוח לא נמצא." };
  }

  try {
    await grantCustomerBalance({
      parentId: parent.id,
      amount,
      note: note || "הוספה ידנית",
      createdBy: access.profile.id,
      sourcePaymentId: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message && !message.includes("העברה ליתרה נכשלה")) {
      return { success: false, error: message };
    }
    return { success: false, error: "הוספת היתרה נכשלה. נסו שוב." };
  }

  const { data: rows } = await access.admin
    .from("customer_balance_entries")
    .select("amount")
    .eq("parent_id", parent.id);
  const balance = roundMoney(
    (rows ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  );

  revalidatePath("/admin/customers");
  revalidatePath("/parent/dashboard");
  return { success: true, balance };
}
