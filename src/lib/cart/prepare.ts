import {
  childEligibilityError,
  parentGenderError,
  type ClassAudienceFields,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import type { Enums } from "@/types/database.types";
import type { CartItem } from "@/lib/cart/types";
import {
  countFamilyChildrenInCategory,
  listFamilyChildrenInCategory,
} from "@/lib/enrollment/categorySiblings";
import { resolveClassParticipants } from "@/lib/enrollment/trainees";
import {
  classInstallmentsMax,
  classPeriodTotal,
} from "@/lib/finance/classPricing";
import { planInstallmentsMax } from "@/lib/finance/installments";
import { prorateClassPrice } from "@/lib/finance/proratedClassPrice";
import {
  calculateOrderTotal,
  parseSiblingTiers,
  siblingTiersForCheckout,
  splitAmount,
  splitSiblingAmounts,
} from "@/lib/finance/siblingDiscount";
import {
  activityPeopleCap,
  parseActivityPriceTiers,
  quoteActivityPrice,
  type ActivityPriceTier,
} from "@/lib/finance/activityPricing";
import {
  ACTIVITY_MAX_PEOPLE,
  isActivityProgram,
  type ProgramKind,
} from "@/lib/programs";
import { chargeDescriptionForCheckout } from "@/lib/enrollment/receiptLabel";
import {
  declarationSchoolYear,
  healthDeclarationErrorFor,
  missingHealthDeclarationChildren,
} from "@/lib/health-declaration";
import { addMonths, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";
import type { PlanKind } from "@/lib/enrollment/planActions";
import type { Database } from "@/types/database.types";

type EnrollmentInsert = Database["public"]["Tables"]["enrollments"]["Insert"];

type Client = Awaited<ReturnType<typeof createClient>>;

export type PreparedCartLine = {
  itemId: string;
  kind: CartItem["kind"];
  title: string;
  listTotal: number;
  participantNames: string[];
  installmentsMax: number | null;
  chargeDescription: string;
  enrollmentRows: EnrollmentInsert[];
  paymentChildIds: (string | null)[];
  paymentAmounts: number[];
  privateLessonQuantity: number | null;
  activityQuantity: number | null;
  planId: string | null;
};

function childrenEligibilityError(
  cls: Omit<ClassAudienceFields, "gender_policy"> & {
    gender_policy: ClassGenderPolicy;
  },
  children: Parameters<typeof childEligibilityError>[1][],
  slotGenders: ClassGenderPolicy[]
): string | null {
  const genders = slotGenders.length > 0 ? slotGenders : [cls.gender_policy];
  for (const child of children) {
    for (const gender of genders) {
      const eligibilityError = childEligibilityError(
        { ...cls, gender_policy: gender },
        child
      );
      if (eligibilityError) return eligibilityError;
    }
  }
  return null;
}

async function requireHealthDeclarations(
  supabase: Client,
  parentId: string,
  children: { id: string; full_name: string }[]
): Promise<string | null> {
  if (children.length === 0) return null;
  const { data } = await supabase
    .from("health_declarations")
    .select("child_id")
    .eq("parent_id", parentId)
    .eq("school_year", declarationSchoolYear())
    .in(
      "child_id",
      children.map((child) => child.id)
    );
  const missing = missingHealthDeclarationChildren(
    children,
    (data ?? []).map((row) => row.child_id)
  );
  if (missing.length === 0) return null;
  return healthDeclarationErrorFor(missing.map((child) => child.full_name));
}

function resolveParticipants(childIds: string[], includeSelf: boolean) {
  const uniqueChildIds = [...new Set(childIds.filter(Boolean))];
  const participants: (string | null)[] = [...uniqueChildIds];
  if (includeSelf) participants.push(null);
  return { uniqueChildIds, participants };
}

function normalizeQuantity(
  kind: PlanKind,
  programKind: ProgramKind | null,
  quantity: number | undefined,
  maxPeople = ACTIVITY_MAX_PEOPLE
) {
  if (kind !== "private_lesson" && !isActivityProgram(programKind)) return 1;
  const value = Math.floor(Number(quantity ?? 1));
  if (!Number.isFinite(value) || value < 1 || value > maxPeople) return null;
  return value;
}

type CartParent = {
  id: string;
  full_name: string;
  gender?: Enums<"gender_type"> | null;
};

export async function prepareCartLine(
  supabase: Client,
  profile: CartParent,
  item: CartItem,
  reserved: {
    classSpots: Map<string, number>;
    categoryKids: Map<string, string[]>;
  }
): Promise<{ success: true; line: PreparedCartLine } | { success: false; error: string }> {
  if (item.kind === "class") {
    return prepareClassLine(supabase, profile, item, reserved);
  }
  return preparePlanLine(supabase, profile, item);
}

async function prepareClassLine(
  supabase: Client,
  profile: CartParent,
  item: CartItem,
  reserved: {
    classSpots: Map<string, number>;
    categoryKids: Map<string, string[]>;
  }
): Promise<{ success: true; line: PreparedCartLine } | { success: false; error: string }> {
  const classId = item.productId;
  const { uniqueChildIds, participants, includeSelf } = resolveClassParticipants(
    item.childIds,
    item.includeSelf
  );
  if (participants.length === 0) {
    return { success: false, error: `נא לבחור מתאמנים ל${item.title}.` };
  }

  const [{ data: cls }, { data: children }, { data: existingEnrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, price, billing_months, pick_one_slot, category, capacity, status, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, interest_only"
        )
        .eq("id", classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      uniqueChildIds.length > 0
        ? supabase
            .from("children")
            .select(
              "id, full_name, gender, birth_date, school_grade, grade_school_year"
            )
            .eq("parent_id", profile.id)
            .in("id", uniqueChildIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("enrollments")
        .select("child_id")
        .eq("class_id", classId)
        .eq("parent_id", profile.id)
        .neq("status", "cancelled"),
    ]);

  if (!cls) {
    return { success: false, error: `${item.title} אינו זמין להרשמה.` };
  }
  if (cls.interest_only) {
    return {
      success: false,
      error: `ההרשמה ל${cls.title} היא ללא תשלום. רעננו את העמוד ונסו שוב.`,
    };
  }

  let weeklySlotId: string | null = null;
  let slotGenders: ClassGenderPolicy[] = [];
  if (cls.pick_one_slot) {
    if (!item.weeklySlotId) {
      return { success: false, error: `נא לבחור מועד ל${cls.title}.` };
    }
    const { data: slot } = await supabase
      .from("class_weekly_slots")
      .select("id, gender_policy")
      .eq("id", item.weeklySlotId)
      .eq("class_id", classId)
      .maybeSingle();
    if (!slot) {
      return { success: false, error: `המועד שנבחר ל${cls.title} אינו תקין.` };
    }
    weeklySlotId = slot.id;
    slotGenders = [slot.gender_policy];
  } else {
    const { data: slots } = await supabase
      .from("class_weekly_slots")
      .select("gender_policy")
      .eq("class_id", classId);
    if (slots && slots.length > 0) {
      slotGenders = [...new Set(slots.map((row) => row.gender_policy))];
    }
  }

  const selectedChildren = children ?? [];
  if (selectedChildren.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const healthError = await requireHealthDeclarations(
    supabase,
    profile.id,
    selectedChildren
  );
  if (healthError) return { success: false, error: healthError };

  const eligibilityError = childrenEligibilityError(
    cls,
    selectedChildren,
    slotGenders
  );
  if (eligibilityError) return { success: false, error: eligibilityError };

  if (includeSelf) {
    const parentError = parentGenderError(
      profile.full_name,
      profile.gender,
      cls.gender_policy,
      slotGenders
    );
    if (parentError) return { success: false, error: parentError };
  }

  const alreadyEnrolled = new Set(
    (existingEnrollments ?? [])
      .map((row) => row.child_id)
      .filter(Boolean) as string[]
  );
  if (uniqueChildIds.some((id) => alreadyEnrolled.has(id))) {
    return { success: false, error: `אחד או יותר כבר רשומים ל${cls.title}.` };
  }
  if (
    includeSelf &&
    (existingEnrollments ?? []).some((enrollment) => enrollment.child_id == null)
  ) {
    return { success: false, error: `ההורה כבר רשום ל${cls.title}.` };
  }

  let takenQuery = supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .in("status", ["active", "pending"]);
  if (weeklySlotId) takenQuery = takenQuery.eq("weekly_slot_id", weeklySlotId);
  const { count: takenCount } = await takenQuery;
  const reservedKey = `${classId}:${weeklySlotId ?? "all"}`;
  const reservedSpots = reserved.classSpots.get(reservedKey) ?? 0;
  if (cls.capacity != null) {
    const available = cls.capacity - (takenCount ?? 0) - reservedSpots;
    if (participants.length > available) {
      return {
        success: false,
        error:
          available <= 0
            ? `${cls.title} מלא.`
            : `אין מספיק מקומות ב${cls.title} לכל המתאמנים שבסל.`,
      };
    }
  }

  const [{ data: tiersJson }, categorySiblingIds] = await Promise.all([
    supabase.rpc("class_sibling_discount_tiers", { p_class_id: classId }),
    listFamilyChildrenInCategory(supabase, profile.id, classId, cls.category),
  ]);

  let sessionsQuery = supabase
    .from("class_sessions")
    .select("session_date, start_time, status")
    .eq("class_id", classId);
  if (weeklySlotId) sessionsQuery = sessionsQuery.eq("weekly_slot_id", weeklySlotId);
  const { data: sessions } = await sessionsQuery;
  const proration = prorateClassPrice(
    classPeriodTotal(Number(cls.price), cls.billing_months),
    sessions ?? [],
    todayInIsrael()
  );
  if (proration.hasEnded) {
    return { success: false, error: `${cls.title} כבר הסתיים.` };
  }

  const categoryKey = cls.category ?? "";
  const extraFromCart = reserved.categoryKids.get(categoryKey) ?? [];
  const alreadyEnrolledCount = countFamilyChildrenInCategory(
    [...categorySiblingIds, ...extraFromCart],
    uniqueChildIds
  );
  const order = calculateOrderTotal(
    proration.unitPrice,
    participants.length,
    siblingTiersForCheckout(cls.category, parseSiblingTiers(tiersJson)),
    alreadyEnrolledCount + participants.length
  );
  const childAmounts = splitSiblingAmounts(
    proration.unitPrice,
    participants.length,
    order.percent,
    alreadyEnrolledCount,
    order.total
  );

  reserved.classSpots.set(reservedKey, reservedSpots + participants.length);
  reserved.categoryKids.set(categoryKey, [
    ...extraFromCart,
    ...uniqueChildIds,
    ...(includeSelf ? ["__self__"] : []),
  ]);

  const names = [
    ...selectedChildren.map((child) => child.full_name),
    ...(includeSelf ? [profile.full_name] : []),
  ];

  return {
    success: true,
    line: {
      itemId: item.id,
      kind: "class",
      title: cls.title,
      listTotal: order.total,
      participantNames: names,
      installmentsMax: classInstallmentsMax(cls.billing_months),
      chargeDescription: chargeDescriptionForCheckout({
        productTitle: cls.title,
        participantCount: participants.length,
        kind: "class",
        customLabel: null,
      }),
      enrollmentRows: participants.map((childId, index) => {
        const paysFull =
          order.percent <= 0 || (alreadyEnrolledCount === 0 && index === 0);
        return {
          parent_id: profile.id,
          child_id: childId,
          class_id: classId,
          weekly_slot_id: weeklySlotId,
          type: "class" as const,
          status: "active" as const,
          discount_percent: paysFull ? 0 : order.percent,
        };
      }),
      paymentChildIds: participants,
      paymentAmounts: childAmounts,
      privateLessonQuantity: null,
      activityQuantity: null,
      planId: null,
    },
  };
}

async function preparePlanLine(
  supabase: Client,
  profile: CartParent,
  item: CartItem
): Promise<{ success: true; line: PreparedCartLine } | { success: false; error: string }> {
  const kind = item.kind as PlanKind;
  const planId = item.productId;
  const { uniqueChildIds, participants } = resolveParticipants(
    item.childIds,
    item.includeSelf
  );
  if (participants.length === 0) {
    return { success: false, error: `נא לבחור למי מיועד ${item.title}.` };
  }

  let title = item.title;
  let price = 0;
  let durationMonths: number | null = null;
  let programKind: ProgramKind | null = null;
  let priceTiers: ActivityPriceTier[] = [];
  let extraHalfHourPrice: number | null = item.extraHalfHourPrice ?? null;
  let entriesCount: number | null = item.entriesCount ?? null;

  if (kind === "program") {
    const { data } = await supabase
      .from("programs")
      .select("id, title, price, duration_months, kind, price_tiers, extra_half_hour_price")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return { success: false, error: `${item.title} אינו זמין לרכישה.` };
    title = data.title;
    price = Number(data.price);
    durationMonths = data.duration_months;
    programKind = data.kind;
    priceTiers = parseActivityPriceTiers(data.price_tiers);
    extraHalfHourPrice = data.extra_half_hour_price;
  } else if (kind === "pool_pass") {
    const { data } = await supabase
      .from("pool_passes")
      .select("id, title, price, entries_count")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return { success: false, error: `${item.title} אינו זמין לרכישה.` };
    title = data.title;
    price = Number(data.price);
    entriesCount = data.entries_count;
  } else {
    const { data } = await supabase
      .from("private_lessons")
      .select("id, title, price")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return { success: false, error: `${item.title} אינו זמין לרכישה.` };
    title = data.title;
    price = Number(data.price);
  }

  const isActivity = isActivityProgram(programKind);
  const quantity = normalizeQuantity(
    kind,
    programKind,
    item.quantity,
    activityPeopleCap(priceTiers)
  );
  if (quantity === null) {
    return { success: false, error: `הכמות שנבחרה ל${title} אינה תקינה.` };
  }

  let selectedChildren: { id: string; full_name: string }[] = [];
  if (uniqueChildIds.length > 0) {
    const { data: children } = await supabase
      .from("children")
      .select("id, full_name")
      .eq("parent_id", profile.id)
      .in("id", uniqueChildIds);
    if (!children || children.length !== uniqueChildIds.length) {
      return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
    }
    selectedChildren = children;
  }

  if (kind === "program" && !isActivity) {
    const today = todayInIsrael();
    const { data: existing } = await supabase
      .from("enrollments")
      .select("child_id, ends_on")
      .eq("program_id", planId)
      .eq("parent_id", profile.id)
      .eq("status", "active");
    const taken = new Set(
      (existing ?? [])
        .filter((row) => !row.ends_on || row.ends_on >= today)
        .map((row) => row.child_id as string | null)
    );
    if (participants.some((participant) => taken.has(participant))) {
      return { success: false, error: `אחד או יותר כבר רשומים ל${title}.` };
    }
  }

  const listTotal = isActivity
    ? quoteActivityPrice(quantity, price, priceTiers)?.amount ?? null
    : Math.round(price * quantity * participants.length * 100) / 100;
  if (listTotal === null) {
    return { success: false, error: `מספר המשתתפים ב${title} אינו במחירון.` };
  }

  const activityChildId =
    item.includeSelf || uniqueChildIds.length !== 1 ? null : uniqueChildIds[0];
  const amounts = splitAmount(listTotal, isActivity ? 1 : participants.length);
  const membershipStart =
    kind === "program" && !isActivity ? todayInIsrael() : null;
  const membershipEnd =
    kind === "program" && !isActivity && durationMonths
      ? addMonths(membershipStart!, durationMonths)
      : null;

  const enrollmentRows = isActivity
    ? [
        {
          parent_id: profile.id,
          child_id: activityChildId,
          class_id: null,
          program_id: planId,
          pool_pass_id: null,
          private_lesson_id: null,
          type: kind,
          status: "active" as const,
          starts_on: null,
          ends_on: null,
          people_count: quantity,
        },
      ]
    : participants.map((childId) => ({
        parent_id: profile.id,
        child_id: childId,
        class_id: null,
        program_id: kind === "program" ? planId : null,
        pool_pass_id: kind === "pool_pass" ? planId : null,
        private_lesson_id: kind === "private_lesson" ? planId : null,
        type: kind,
        status: "active" as const,
        starts_on: membershipStart,
        ends_on: membershipEnd,
        people_count: null as number | null,
      }));

  const names = [
    ...selectedChildren.map((child) => child.full_name),
    ...(item.includeSelf ? [profile.full_name] : []),
  ];

  return {
    success: true,
    line: {
      itemId: item.id,
      kind,
      title,
      listTotal,
      participantNames: names,
      installmentsMax: planInstallmentsMax({
        kind,
        programKind,
        title,
        entriesCount,
        extraHalfHourPrice,
      }),
      chargeDescription: chargeDescriptionForCheckout({
        productTitle: title,
        participantCount: isActivity ? quantity : participants.length,
        kind: "plan",
        customLabel: null,
      }),
      enrollmentRows,
      paymentChildIds: isActivity ? [activityChildId] : participants,
      paymentAmounts: amounts,
      privateLessonQuantity: kind === "private_lesson" ? quantity : null,
      activityQuantity: isActivity ? quantity : null,
      planId,
    },
  };
}
