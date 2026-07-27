import { getSessionProfile, homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";
import type { PublicClass } from "@/types";
import {
  ClassEnrollmentActions,
  GuestEnrollmentActions,
  NonParentEnrollmentNotice,
} from "./ClassEnrollmentActions";

interface ClassEnrollmentPanelProps {
  cls: PublicClass;
  soldOut: boolean;
}

export async function ClassEnrollmentPanel({
  cls,
  soldOut,
}: ClassEnrollmentPanelProps) {
  const profile = await getSessionProfile();

  let enrollmentContent = (
    <GuestEnrollmentActions classId={cls.id} soldOut={soldOut} />
  );

  if (profile) {
    if (profile.role !== "parent") {
      enrollmentContent = (
        <NonParentEnrollmentNotice homeHref={homeForRole(profile.role)} />
      );
    } else {
      const supabase = await createClient();
      const [{ data: children }, { data: enrollments }, { data: waitlist }] =
        await Promise.all([
          supabase
            .from("children")
            .select("id, full_name")
            .eq("parent_id", profile.id)
            .order("created_at"),
          supabase
            .from("enrollments")
            .select(
              "id, child_id, status, payment_status, children(full_name)"
            )
            .eq("class_id", cls.id)
            .eq("parent_id", profile.id)
            .neq("status", "cancelled"),
          supabase
            .from("waitlist")
            .select("id, child_id, status, children(full_name)")
            .eq("class_id", cls.id)
            .eq("parent_id", profile.id)
            .neq("status", "cancelled"),
        ]);

      enrollmentContent = (
        <ClassEnrollmentActions
          classId={cls.id}
          classTitle={cls.title}
          classPrice={Number(cls.price)}
          soldOut={soldOut}
          children={children ?? []}
          enrollments={enrollments ?? []}
          waitlist={waitlist ?? []}
        />
      );
    }
  }

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
        <p className="text-sm text-ink-500">מחיר החוג</p>
        <p className="mt-1 font-display text-4xl font-extrabold text-brand-700">
          {formatCurrency(cls.price)}
        </p>

        <div className="mt-5 rounded-2xl bg-ink-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-500">מקומות פנויים</span>
            <span className="font-bold text-ink-900">
              {soldOut ? "מלא" : `${cls.available} מתוך ${cls.capacity}`}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200">
            <div
              className="h-full rounded-full bg-brand-gradient"
              style={{
                width: `${Math.min(
                  100,
                  (Number(cls.taken_count) / Math.max(cls.capacity, 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {enrollmentContent}
      </div>
    </aside>
  );
}
