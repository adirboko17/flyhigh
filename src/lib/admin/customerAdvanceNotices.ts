"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";

export type CustomerAdvanceNotice = {
  id: string;
  date: string;
  year: number;
  classTitle: string;
  personName: string;
};

function yearFromDate(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

export async function loadCustomerAdvanceNotices(
  parentId: string
): Promise<CustomerAdvanceNotice[]> {
  const supabase = await createAdminDataClient();

  const { data: children } = await supabase
    .from("children")
    .select("id")
    .eq("parent_id", parentId);

  const childIds = (children ?? []).map((child) => child.id);
  const filters = [`parent_id.eq.${parentId}`];
  if (childIds.length > 0) {
    filters.push(`child_id.in.(${childIds.join(",")})`);
  }

  const { data, error } = await supabase
    .from("attendance")
    .select(
      "id, date, child_id, parent_id, children(full_name), classes(title), profiles(full_name)"
    )
    .eq("status", "advance_notice")
    .or(filters.join(","))
    .order("date", { ascending: false });

  if (error) {
    console.error("loadCustomerAdvanceNotices", error);
    return [];
  }

  type AttendanceJoin = {
    id: string;
    date: string;
    children: { full_name: string | null } | null;
    classes: { title: string | null } | null;
    profiles: { full_name: string | null } | null;
  };

  return ((data ?? []) as AttendanceJoin[]).map((row) => ({
    id: row.id,
    date: row.date,
    year: yearFromDate(row.date),
    classTitle: row.classes?.title?.trim() || "חוג",
    personName:
      row.children?.full_name?.trim() ||
      row.profiles?.full_name?.trim() ||
      "לקוח",
  }));
}
