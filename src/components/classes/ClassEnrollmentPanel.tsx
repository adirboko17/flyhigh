import { getSessionProfile, homeForRole } from "@/lib/auth";
import {
  formatClassAudience,
  formatClassGenderPolicy,
} from "@/lib/class-audience";
import { createClient } from "@/lib/supabase/server";
import {
  parseSiblingTiers,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import type { PublicClass } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  ClassEnrollmentActions,
  GuestEnrollmentActions,
  NonParentEnrollmentNotice,
} from "./ClassEnrollmentActions";
import {
  ClassLateRegistrationBanner,
  ClassPriceAmount,
  classPriceLabel,
} from "./ClassPrice";

interface ClassEnrollmentPanelProps {
  cls: PublicClass;
  soldOut: boolean;
  proration: ProratedClassPrice;
}

export async function ClassEnrollmentPanel({
  cls,
  soldOut,
  proration,
}: ClassEnrollmentPanelProps) {
  const registrationClosed = soldOut || proration.hasEnded;
  const profile = await getSessionProfile();

  const supabase = await createClient();
  const { data: tiersJson } = await supabase.rpc("class_sibling_discount_tiers", {
    p_class_id: cls.id,
  });
  const siblingTiers = parseSiblingTiers(tiersJson);

  let enrollmentContent = (
    <GuestEnrollmentActions
      classId={cls.id}
      soldOut={soldOut}
      ended={proration.hasEnded}
    />
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
            .select("id, full_name, birth_date")
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
          classPrice={proration.unitPrice}
          proration={proration}
          ageMin={cls.age_min}
          ageMax={cls.age_max}
          soldOut={soldOut}
          ended={proration.hasEnded}
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
        <p className="text-sm text-ink-500">{classPriceLabel(proration)}</p>
        <div className="mt-1">
          <ClassPriceAmount
            proration={proration}
            soldOut={registrationClosed}
            size="panel"
          />
        </div>
        {(proration.isLate || proration.hasEnded) && (
          <div className="mt-3">
            <ClassLateRegistrationBanner proration={proration} />
          </div>
        )}

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
          <Badge tone="neutral">{formatClassGenderPolicy(cls.gender_policy)}</Badge>
          <Badge tone="neutral">{formatClassAudience(cls)}</Badge>
          {proration.billableCount > 0 && (
            <Badge tone="neutral">
              {proration.isLate
                ? `${proration.remainingCount} מתוך ${proration.billableCount} מפגשים`
                : `${proration.billableCount} מפגשים`}
            </Badge>
          )}
        </div>

        {enrollmentContent}
      </div>
    </aside>
  );
}

function siblingOrdinal(n: number): string {
  if (n === 2) return "השני";
  if (n === 3) return "השלישי";
  return `ה־${n}`;
}

function SiblingDiscountNote({ tiers }: { tiers: SiblingDiscountTier[] }) {
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.minChildren - b.minChildren);

  return (
    <div className="mt-3 rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3 text-sm text-aqua-800">
      {sorted.length === 1 ? (
        <p>
          הנחת אחים · {sorted[0].percent}% מהילד {siblingOrdinal(sorted[0].minChildren)}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {sorted.map((tier) => (
            <li key={tier.minChildren}>
              {tier.percent}% מהילד {siblingOrdinal(tier.minChildren)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
