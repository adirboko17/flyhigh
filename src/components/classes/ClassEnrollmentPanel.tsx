import { getSessionProfile, homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  parseSiblingTiers,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import { formatCurrency } from "@/utils/format";
import type { PublicClass } from "@/types";
import { Badge } from "@/components/ui/Badge";
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

  const supabase = await createClient();
  const { data: tiersJson } = await supabase.rpc("class_sibling_discount_tiers", {
    p_class_id: cls.id,
  });
  const siblingTiers = parseSiblingTiers(tiersJson);

  let enrollmentContent = (
    <GuestEnrollmentActions classId={cls.id} soldOut={soldOut} />
  );

  if (profile) {
    if (profile.role !== "parent") {
      enrollmentContent = (
        <NonParentEnrollmentNotice homeHref={homeForRole(profile.role)} />
      );
    } else {
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
              "id, child_id, status, payment_status, children(full_name), payments(payment_method, status)"
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
          availableSpots={cls.available}
          kids={children ?? []}
          enrollments={enrollments ?? []}
          waitlist={waitlist ?? []}
          siblingTiers={siblingTiers}
        />
      );
    }
  }

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <p className="text-sm text-ink-500">מחיר החוג</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-brand-700 sm:text-4xl">
          {formatCurrency(cls.price)}
        </p>

        <SiblingDiscountNote tiers={siblingTiers} />

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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cls.category && <Badge tone="brand">{cls.category}</Badge>}
          {cls.level && <Badge tone="info">רמה: {cls.level}</Badge>}
          {cls.session_count != null && cls.session_count > 0 && (
            <Badge tone="neutral">{cls.session_count} מפגשים</Badge>
          )}
        </div>

        {enrollmentContent}
      </div>
    </aside>
  );
}

function SiblingDiscountNote({ tiers }: { tiers: SiblingDiscountTier[] }) {
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.minChildren - b.minChildren);

  return (
    <div className="mt-3 rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3">
      <p className="text-sm font-semibold text-aqua-800">הנחת אחים</p>
      <ul className="mt-1 space-y-0.5 text-sm text-aqua-700">
        {sorted.map((tier) => (
          <li key={tier.minChildren}>
            {tier.minChildren} ילדים ומעלה — {tier.percent}% הנחה על ההרשמה
          </li>
        ))}
      </ul>
    </div>
  );
}
