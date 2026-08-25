import { getSessionProfile, homeForRole } from "@/lib/auth";
import { declarationSchoolYear } from "@/lib/health-declaration";
import {
  formatClassAudience,
  formatClassGenderPolicy,
} from "@/lib/class-audience";
import { createClient } from "@/lib/supabase/server";
import { listFamilyChildrenInCategory } from "@/lib/enrollment/categorySiblings";
import {
  parseSiblingTiers,
  siblingTiersForCheckout,
} from "@/lib/finance/siblingDiscount";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import type { PublicClass, PublicClassSlot } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  ClassEnrollmentActions,
  GuestEnrollmentActions,
  NonParentEnrollmentNotice,
} from "./ClassEnrollmentActions";
import {
  ClassLateRegistrationBanner,
  ClassPriceAmount,
  ClassPriceNote,
  classPriceLabel,
} from "./ClassPrice";

interface ClassEnrollmentPanelProps {
  cls: PublicClass;
  soldOut: boolean;
  proration: ProratedClassPrice;
  slots?: PublicClassSlot[];
}

export async function ClassEnrollmentPanel({
  cls,
  soldOut,
  proration,
  slots = [],
}: ClassEnrollmentPanelProps) {
  const registrationClosed = soldOut || proration.hasEnded;
  const profile = await getSessionProfile();

  const supabase = await createClient();
  const { data: tiersJson } = await supabase.rpc("class_sibling_discount_tiers", {
    p_class_id: cls.id,
  });
  const siblingTiers = siblingTiersForCheckout(
    cls.category,
    parseSiblingTiers(tiersJson)
  );

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
      const healthYear = declarationSchoolYear();
      const [{ data: children }, { data: enrollments }, { data: waitlist }, categorySiblingIds, { data: declarations }] =
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
          listFamilyChildrenInCategory(
            supabase,
            profile.id,
            cls.id,
            cls.category
          ),
          supabase
            .from("health_declarations")
            .select("child_id")
            .eq("parent_id", profile.id)
            .eq("school_year", healthYear),
        ]);

      const declaredIds = new Set(
        (declarations ?? []).map((row) => row.child_id)
      );

      enrollmentContent = (
        <ClassEnrollmentActions
          classId={cls.id}
          classTitle={cls.title}
          classPrice={proration.unitPrice}
          proration={proration}
          billingMonths={cls.billing_months}
          ageMin={cls.age_min}
          ageMax={cls.age_max}
          soldOut={soldOut}
          ended={proration.hasEnded}
          availableSpots={cls.available}
          parent={{
            fullName: profile.full_name,
            birthDate: profile.birth_date,
          }}
          kids={(children ?? []).map((child) => ({
            ...child,
            hasHealthDeclaration: declaredIds.has(child.id),
          }))}
          enrollments={enrollments ?? []}
          waitlist={waitlist ?? []}
          siblingTiers={siblingTiers}
          categorySiblingIds={categorySiblingIds}
          pickOneSlot={cls.pick_one_slot}
          slots={slots}
          classGenderPolicy={cls.gender_policy}
        />
      );
    }
  }

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <p className="text-sm text-ink-500">
          {classPriceLabel(proration, cls.billing_months)}
        </p>
        <div className="mt-1">
          <ClassPriceAmount
            proration={proration}
            soldOut={registrationClosed}
            size="panel"
            billingMonths={cls.billing_months}
          />
        </div>
        <div className="mt-1">
          <ClassPriceNote
            proration={proration}
            billingMonths={cls.billing_months}
          />
        </div>
        {(proration.isLate || proration.hasEnded) && (
          <div className="mt-3">
            <ClassLateRegistrationBanner proration={proration} />
          </div>
        )}

        {soldOut && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            החוג מלא. אפשר להצטרף לרשימת המתנה.
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cls.category && <Badge tone="brand">{cls.category}</Badge>}
          {cls.level && <Badge tone="info">רמה: {cls.level}</Badge>}
          <Badge tone="neutral">
            {slots.length > 1 &&
            new Set(slots.map((slot) => slot.gender_policy)).size > 1
              ? "מגדר לפי מועד"
              : formatClassGenderPolicy(
                  slots[0]?.gender_policy ?? cls.gender_policy
                )}
          </Badge>
          {cls.audience_type === "grade" && (
            <Badge tone="neutral">{formatClassAudience(cls)}</Badge>
          )}
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
