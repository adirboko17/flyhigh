"use server";

import { revalidateAfterEnrollmentChange } from "@/lib/admin/enrollmentActions";
import {
  buildPurchaseCatalog,
  purchaseChargeAmount,
  type PurchasePlanKind,
  type PurchaseProductOption,
} from "@/lib/admin/customerPurchaseCatalog";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  isCollectionPaymentMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import {
  chargeDescriptionForCheckout,
  resolveReceiptLabelForCheckout,
} from "@/lib/enrollment/receiptLabel";
import { planInstallmentOptions } from "@/lib/finance/installments";
import { isCardcomConfigured } from "@/lib/integrations/cardcom";
import { getPaymentProvider } from "@/lib/integrations/payments";
import {
  isPrivateLessonSeries,
  privateLessonCount,
} from "@/lib/private-lessons/series";
import { isActivityProgram, type ProgramKind } from "@/lib/programs";
import { syncEnrollmentPaymentStatus } from "@/lib/payments/splitParts";
import { addMonths, todayInIsrael } from "@/lib/scheduling/monthGrid";
import type { Json } from "@/types/database.types";

const TEXT_MAX = 120;

export type CustomerPurchaseResult =
  | { success: true; checkoutUrl?: string }
  | { success: false; error: string };

type PurchaseInput = {
  parentId: string;
  kind: PurchasePlanKind;
  planId: string;
  /** null — הרכישה על הלקוח עצמו. */
  childId: string | null;
  packageQuantity: number | null;
  peopleCount: number | null;
  amount: number | string;
  method: CollectionPaymentMethod;
  receiptLabelId: string | null;
  description: string;
  customText: string;
};

type LoadedPurchase = {
  option: PurchaseProductOption;
  durationMonths: number | null;
  requiresSchedule: boolean;
  entriesCount: number | null;
  lessonsCount: number | null;
  programKind: ProgramKind | null;
  extraHalfHourPrice: number | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAmount(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return round2(amount);
}

function isPlanKind(value: string): value is PurchasePlanKind {
  return (
    value === "program" || value === "pool_pass" || value === "private_lesson"
  );
}

function clip(value: string) {
  const trimmed = value.trim();
  return trimmed.length > TEXT_MAX ? trimmed.slice(0, TEXT_MAX) : trimmed;
}

async function loadPurchase(
  supabase: Awaited<ReturnType<typeof createAdminDataClient>>,
  kind: PurchasePlanKind,
  planId: string,
  packageQuantity: number | null
): Promise<LoadedPurchase | null> {
  if (kind === "program") {
    const { data } = await supabase
      .from("programs")
      .select(
        "id, title, price, kind, duration_months, duration_minutes, price_tiers, extra_half_hour_price, requires_schedule"
      )
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return null;
    const option = buildPurchaseCatalog({
      programs: [
        {
          id: data.id,
          title: data.title,
          price: Number(data.price),
          kind: data.kind,
          duration_months: data.duration_months,
          duration_minutes: data.duration_minutes,
          price_tiers: data.price_tiers,
        },
      ],
      poolPasses: [],
      privateLessons: [],
    }).find((item) => item.packageQuantity === packageQuantity);
    if (!option) return null;
    return {
      option,
      durationMonths: data.duration_months,
      requiresSchedule: data.requires_schedule,
      entriesCount: null,
      lessonsCount: null,
      programKind: data.kind,
      extraHalfHourPrice: data.extra_half_hour_price,
    };
  }

  if (kind === "pool_pass") {
    const { data } = await supabase
      .from("pool_passes")
      .select("id, title, price, entries_count, price_tiers, requires_schedule")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return null;
    const option = buildPurchaseCatalog({
      programs: [],
      poolPasses: [
        {
          id: data.id,
          title: data.title,
          price: Number(data.price),
          entries_count: data.entries_count,
          price_tiers: data.price_tiers as Json,
        },
      ],
      privateLessons: [],
    }).find((item) => item.packageQuantity === packageQuantity);
    if (!option) return null;
    return {
      option,
      durationMonths: null,
      requiresSchedule: data.requires_schedule,
      entriesCount: packageQuantity ?? data.entries_count,
      lessonsCount: null,
      programKind: null,
      extraHalfHourPrice: null,
    };
  }

  const { data } = await supabase
    .from("private_lessons")
    .select(
      "id, title, price, lessons_count, duration_minutes, price_tiers, requires_schedule"
    )
    .eq("id", planId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const option = buildPurchaseCatalog({
    programs: [],
    poolPasses: [],
    privateLessons: [
      {
        id: data.id,
        title: data.title,
        price: Number(data.price),
        lessons_count: data.lessons_count,
        duration_minutes: data.duration_minutes,
        price_tiers: data.price_tiers as Json,
      },
    ],
  }).find((item) => item.packageQuantity === packageQuantity);
  if (!option) return null;
  return {
    option,
    durationMonths: null,
    requiresSchedule: data.requires_schedule,
    entriesCount: null,
    lessonsCount: packageQuantity ?? data.lessons_count,
    programKind: null,
    extraHalfHourPrice: null,
  };
}

async function rollbackPurchase(
  supabase: Awaited<ReturnType<typeof createAdminDataClient>>,
  enrollmentId: string,
  paymentId?: string
) {
  if (paymentId) {
    await supabase.from("payments").delete().eq("id", paymentId);
  }
  await supabase
    .from("private_lesson_slots")
    .delete()
    .eq("enrollment_id", enrollmentId);
  await supabase
    .from("activity_bookings")
    .delete()
    .eq("enrollment_id", enrollmentId);
  await supabase
    .from("pool_pass_bookings")
    .delete()
    .eq("enrollment_id", enrollmentId);
  await supabase.from("enrollments").delete().eq("id", enrollmentId);
}

/** מוצרים פעילים שאפשר לקנות ללקוח מכרטיס הלקוח. */
export async function listProductsForCustomerPurchase(): Promise<
  PurchaseProductOption[]
> {
  const supabase = await createAdminDataClient();
  const [programs, passes, lessons] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, title, price, kind, duration_months, duration_minutes, price_tiers"
      )
      .eq("status", "active"),
    supabase
      .from("pool_passes")
      .select("id, title, price, entries_count, price_tiers")
      .eq("status", "active"),
    supabase
      .from("private_lessons")
      .select("id, title, price, lessons_count, duration_minutes, price_tiers")
      .eq("status", "active"),
  ]);

  return buildPurchaseCatalog({
    programs: (programs.data ?? []).map((row) => ({
      ...row,
      price: Number(row.price),
    })),
    poolPasses: (passes.data ?? []).map((row) => ({
      ...row,
      price: Number(row.price),
    })),
    privateLessons: (lessons.data ?? []).map((row) => ({
      ...row,
      price: Number(row.price),
    })),
  });
}

/**
 * רוכש מנוי, פעילות, כרטיסייה או שיעור עבור לקוח — מסגירה בטלפון.
 * ההרשמה נשמרת על החשבון שלו, והחיוב נפתח בגבייה.
 */
export async function purchaseProductForCustomer(
  input: PurchaseInput
): Promise<CustomerPurchaseResult> {
  const supabase = await createAdminDataClient();

  if (!isPlanKind(input.kind)) {
    return { success: false, error: "המוצר שנבחר אינו תקין." };
  }
  if (!isCollectionPaymentMethod(input.method)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו תקין." };
  }
  if (input.method === "credit_card" && !isCardcomConfigured()) {
    return {
      success: false,
      error: "קארדקום אינו מוגדר — לא ניתן לחייב באשראי.",
    };
  }

  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) {
    return { success: false, error: "נא להזין סכום חיוב חיובי." };
  }
  if (amount > 99_999_999.99) {
    return { success: false, error: "הסכום גבוה מדי." };
  }

  const description = input.description.trim();
  const customText = input.customText.trim();
  if (description.length > TEXT_MAX || customText.length > TEXT_MAX) {
    return {
      success: false,
      error: `התיאור והטקסט המותאם יכולים להכיל עד ${TEXT_MAX} תווים.`,
    };
  }

  const packageQuantity =
    input.packageQuantity == null
      ? null
      : Math.floor(Number(input.packageQuantity));
  if (
    input.packageQuantity != null &&
    (!Number.isInteger(packageQuantity) || (packageQuantity ?? 0) < 1)
  ) {
    return { success: false, error: "החבילה שנבחרה אינה תקינה." };
  }

  const { data: parent } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", input.parentId)
    .maybeSingle();
  if (!parent || parent.role !== "parent") {
    return { success: false, error: "הלקוח לא נמצא." };
  }

  const loaded = await loadPurchase(
    supabase,
    input.kind,
    input.planId,
    packageQuantity
  );
  if (!loaded) {
    return { success: false, error: "המוצר לא נמצא או שאינו זמין לרכישה." };
  }

  const childId = input.childId?.trim() || null;
  if (childId) {
    const { data: child } = await supabase
      .from("children")
      .select("id")
      .eq("id", childId)
      .eq("parent_id", parent.id)
      .maybeSingle();
    if (!child) {
      return { success: false, error: "הילד שנבחר אינו שייך ללקוח הזה." };
    }
  }

  let peopleCount: number | null = null;
  if (loaded.option.pricing === "people") {
    peopleCount = Math.floor(Number(input.peopleCount));
    if (purchaseChargeAmount(loaded.option, peopleCount) == null) {
      return {
        success: false,
        error: "נא לבחור מספר משתתפים שמופיע במחירון.",
      };
    }
  } else if (loaded.option.group === "activity") {
    peopleCount = 1;
  } else if (loaded.option.packageQuantity != null) {
    peopleCount = loaded.option.packageQuantity;
  }

  if (loaded.option.group === "membership") {
    const today = todayInIsrael();
    let existingQuery = supabase
      .from("enrollments")
      .select("id, ends_on")
      .eq("program_id", loaded.option.planId)
      .eq("parent_id", parent.id)
      .eq("status", "active");
    existingQuery = childId
      ? existingQuery.eq("child_id", childId)
      : existingQuery.is("child_id", null);
    const { data: existing } = await existingQuery;
    const taken = (existing ?? []).some(
      (row) => !row.ends_on || row.ends_on >= today
    );
    if (taken) {
      return {
        success: false,
        error: childId
          ? "הילד כבר רשום למנוי הזה."
          : "הלקוח כבר רשום למנוי הזה.",
      };
    }
  }

  const resolved = await resolveReceiptLabelForCheckout(
    supabase,
    input.receiptLabelId
  );
  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }

  const participantCount =
    loaded.option.group === "activity" ? (peopleCount ?? 1) : 1;
  const generated = chargeDescriptionForCheckout({
    productTitle: loaded.option.title,
    participantCount,
    kind: "plan",
    customLabel: resolved.description,
  });
  const receiptDescription = clip(
    resolved.description ?? (description || generated)
  );

  const isActivity = isActivityProgram(loaded.programKind);
  const membershipStart =
    loaded.option.group === "membership" ? todayInIsrael() : null;
  const membershipEnd =
    membershipStart && loaded.durationMonths
      ? addMonths(membershipStart, loaded.durationMonths)
      : null;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert({
      parent_id: parent.id,
      child_id: childId,
      class_id: null,
      program_id: input.kind === "program" ? loaded.option.planId : null,
      pool_pass_id: input.kind === "pool_pass" ? loaded.option.planId : null,
      private_lesson_id:
        input.kind === "private_lesson" ? loaded.option.planId : null,
      type: input.kind,
      status: "active",
      payment_status: "unpaid",
      starts_on: membershipStart,
      ends_on: membershipEnd,
      people_count: peopleCount,
      admin_assigned: true,
    })
    .select("id")
    .single();

  if (enrollmentError || !enrollment) {
    return { success: false, error: "לא הצלחנו לרשום את הרכישה. נסו שוב." };
  }

  if (input.kind === "private_lesson" && loaded.requiresSchedule) {
    const lessonCount = loaded.lessonsCount ?? 1;
    const slotCount = isPrivateLessonSeries(lessonCount)
      ? privateLessonCount(lessonCount)
      : 1;
    const { error: slotsError } = await supabase
      .from("private_lesson_slots")
      .insert(
        Array.from({ length: slotCount }, () => ({
          enrollment_id: enrollment.id,
          parent_id: parent.id,
          child_id: childId,
          private_lesson_id: loaded.option.planId,
          status: "awaiting_schedule" as const,
        }))
      );
    if (slotsError) {
      await rollbackPurchase(supabase, enrollment.id);
      return {
        success: false,
        error: "לא הצלחנו לשריין את השיעורים לתיאום. נסו שוב.",
      };
    }
  }

  if (input.kind === "program" && loaded.requiresSchedule) {
    const { error: bookingError } = await supabase
      .from("activity_bookings")
      .insert({
        enrollment_id: enrollment.id,
        parent_id: parent.id,
        child_id: childId,
        program_id: loaded.option.planId,
        people_count: isActivity ? participantCount : 1,
        status: "awaiting_schedule" as const,
      });
    if (bookingError) {
      await rollbackPurchase(supabase, enrollment.id);
      return {
        success: false,
        error: "לא הצלחנו לשריין את הפעילות לתיאום. נסו שוב.",
      };
    }
  }

  if (input.kind === "pool_pass" && loaded.requiresSchedule) {
    const bookingCount = Math.max(1, loaded.entriesCount ?? 1);
    const { error: passError } = await supabase.from("pool_pass_bookings").insert(
      Array.from({ length: bookingCount }, () => ({
        enrollment_id: enrollment.id,
        parent_id: parent.id,
        child_id: childId,
        pool_pass_id: loaded.option.planId,
        status: "awaiting_schedule" as const,
      }))
    );
    if (passError) {
      await rollbackPurchase(supabase, enrollment.id);
      return {
        success: false,
        error: "לא הצלחנו לשריין את הכרטיסייה לתיאום. נסו שוב.",
      };
    }
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      parent_id: parent.id,
      enrollment_id: enrollment.id,
      amount,
      payment_method: input.method,
      status: "pending",
      office_collection: true,
      receipt_label_id: resolved.labelId,
      receipt_description: receiptDescription,
      receipt_custom_text: customText || null,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    await rollbackPurchase(supabase, enrollment.id);
    return { success: false, error: "יצירת החיוב נכשלה. נסו שוב." };
  }

  await syncEnrollmentPaymentStatus(supabase, enrollment.id);

  if (input.method === "credit_card") {
    const charge = await getPaymentProvider().createCharge({
      amount,
      description: clip(customText || receiptDescription),
      parentId: parent.id,
      method: "credit_card",
      paymentIds: [payment.id],
      metadata: { collections: true, adminAssigned: true },
      installments: planInstallmentOptions({
        kind: input.kind,
        programKind: loaded.programKind,
        title: loaded.option.title,
        entriesCount: loaded.entriesCount,
        extraHalfHourPrice: loaded.extraHalfHourPrice,
      }),
    });

    if (!charge.success || !charge.redirectUrl) {
      await rollbackPurchase(supabase, enrollment.id, payment.id);
      return {
        success: false,
        error: charge.error || "לא הצלחנו לפתוח את דף הסליקה.",
      };
    }

    await revalidateAfterEnrollmentChange();
    return { success: true, checkoutUrl: charge.redirectUrl };
  }

  await revalidateAfterEnrollmentChange();
  return { success: true };
}
