"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import type {
  AdminClassEnrollment,
  AdminClassWaitlistEntry,
} from "@/components/admin/ClassList";

const ENROLLMENT_SELECT =
  "id, class_id, parent_id, child_id, admin_assigned, status, payment_status, created_at, children(full_name, birth_date), profiles(full_name, phone)";

const WAITLIST_SELECT =
  "id, class_id, parent_id, child_id, status, created_at, children(full_name), profiles(full_name, phone)";

export async function loadClassRoster(classId: string): Promise<{
  enrollments: AdminClassEnrollment[];
  waitlist: AdminClassWaitlistEntry[];
}> {
  const supabase = await createAdminDataClient();

  const [{ data: enrollments }, { data: waitlist }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(ENROLLMENT_SELECT)
      .eq("type", "class")
      .eq("class_id", classId)
      .in("status", ["active", "pending", "cancelled"])
      .order("created_at", { ascending: false }),
    supabase
      .from("waitlist")
      .select(WAITLIST_SELECT)
      .eq("class_id", classId)
      .in("status", ["waiting", "offered"])
      .order("created_at"),
  ]);

  return {
    enrollments: (enrollments ?? []) as AdminClassEnrollment[],
    waitlist: (waitlist ?? []) as AdminClassWaitlistEntry[],
  };
}
