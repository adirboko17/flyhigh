import type { Enums } from "@/types/database.types";

export const BRAND = {
  name: "על הגובה",
  tagline: "חוגים, מסלולים וכניסות לבריכה",
  phone: "03-5556677",
  email: "info@al-hagova.co.il",
};

/** Demo contact details — replace with real values when ready. */
export const CONTACT = {
  phone: BRAND.phone,
  email: BRAND.email,
  address: "רחוב הבריכה 12, רמת גן",
  hours: [
    { days: "א׳–ה׳", time: "08:00–21:00" },
    { days: "ו׳", time: "08:00–14:00" },
  ],
};

export const MIN_PASSWORD_LENGTH = 8;

/** תמונת הירו — בריכה ריקה (בלי דמויות), צנועה ומתאימה לקהל דתי. */
export const HERO_POOL_IMAGE = "/images/hero-pool.jpg";

/** תמונות קרוסלת ההירו (מתוך assets/carusle). */
export const HERO_CAROUSEL_IMAGES = [
  "/images/carousel/slide-01.jpg",
  "/images/carousel/slide-02.jpg",
  "/images/carousel/slide-03.jpg",
  "/images/carousel/slide-04.jpg",
  "/images/carousel/slide-05.jpg",
  "/images/carousel/slide-06.jpg",
  "/images/carousel/slide-07.jpg",
  "/images/carousel/slide-08.jpg",
  "/images/carousel/slide-09.jpg",
  "/images/carousel/slide-10.jpg",
] as const;

export const DAYS_OF_WEEK = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

export const DAY_ABBR = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

export function dayLabel(day: number | null | undefined): string {
  if (day === null || day === undefined) return "-";
  return DAYS_OF_WEEK[day] ?? "-";
}

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export const CLASS_STATUS: Record<
  Enums<"class_status">,
  { label: string; tone: BadgeTone }
> = {
  active: { label: "פעיל", tone: "success" },
  inactive: { label: "לא פעיל", tone: "neutral" },
  full: { label: "מלא", tone: "warning" },
};

export const LISTING_STATUS: Record<
  Enums<"listing_status">,
  { label: string; tone: BadgeTone }
> = {
  draft: { label: "טיוטה", tone: "neutral" },
  active: { label: "פעיל", tone: "success" },
  inactive: { label: "לא פעיל", tone: "danger" },
};

export const CLASS_SESSION_STATUS: Record<
  Enums<"class_session_status">,
  { label: string; tone: BadgeTone }
> = {
  scheduled: { label: "מתוכנן", tone: "info" },
  cancelled: { label: "בוטל", tone: "danger" },
  completed: { label: "התקיים", tone: "success" },
};

export const ENROLLMENT_STATUS: Record<
  Enums<"enrollment_status">,
  { label: string; tone: BadgeTone }
> = {
  pending: { label: "ממתין", tone: "warning" },
  active: { label: "פעיל", tone: "success" },
  cancelled: { label: "בוטל", tone: "danger" },
  completed: { label: "הושלם", tone: "info" },
};

export const ENROLLMENT_PAYMENT_STATUS: Record<
  Enums<"enrollment_payment_status">,
  { label: string; tone: BadgeTone }
> = {
  unpaid: { label: "לא שולם", tone: "danger" },
  partial: { label: "שולם חלקית", tone: "warning" },
  paid: { label: "שולם", tone: "success" },
  refunded: { label: "הוחזר", tone: "neutral" },
};

/** תווית ללקוח כשהתשלום לא בוצע בכרטיס אשראי — נגבה/מאושר מול המשרד. */
export const PARENT_PENDING_MANAGER_APPROVAL = {
  label: "ממתין לאישור",
  tone: "warning" as const satisfies BadgeTone,
};

export function isNonImmediatePaymentMethod(
  method: Enums<"payment_method"> | null | undefined
): boolean {
  return method != null && method !== "credit_card";
}

/** תצוגת סטטוס תשלום להרשמה באזור האישי — לא בניהול. */
export function parentEnrollmentPaymentBadge(
  paymentStatus: Enums<"enrollment_payment_status">,
  paymentMethod: Enums<"payment_method"> | null | undefined
): { label: string; tone: BadgeTone } {
  if (
    paymentStatus === "unpaid" &&
    isNonImmediatePaymentMethod(paymentMethod)
  ) {
    return PARENT_PENDING_MANAGER_APPROVAL;
  }
  return ENROLLMENT_PAYMENT_STATUS[paymentStatus];
}

/** תצוגת סטטוס הרשמה יחידה ללקוח — פעיל (אשראי/מאושר) או ממתין לאישור (מזומן/עמית וכו'). */
export function parentEnrollmentDisplayBadge(
  paymentStatus: Enums<"enrollment_payment_status">,
  paymentMethod: Enums<"payment_method"> | null | undefined,
  options?: {
    enrollmentStatus?: Enums<"enrollment_status">;
    chargeStatus?: Enums<"payment_status"> | null;
  }
): { label: string; tone: BadgeTone } {
  if (paymentStatus === "paid") {
    return ENROLLMENT_STATUS.active;
  }

  if (paymentStatus === "unpaid" || paymentStatus === "partial") {
    if (options?.enrollmentStatus === "active") {
      return PARENT_PENDING_MANAGER_APPROVAL;
    }
    if (isNonImmediatePaymentMethod(paymentMethod)) {
      return PARENT_PENDING_MANAGER_APPROVAL;
    }
    if (options?.chargeStatus === "pending") {
      return PARENT_PENDING_MANAGER_APPROVAL;
    }
  }

  return parentEnrollmentPaymentBadge(paymentStatus, paymentMethod);
}

export const PAYMENT_STATUS: Record<
  Enums<"payment_status">,
  { label: string; tone: BadgeTone }
> = {
  pending: { label: "לא שולם", tone: "danger" },
  partial: { label: "שולם חלקית", tone: "warning" },
  paid: { label: "שולם", tone: "success" },
  failed: { label: "נכשל", tone: "danger" },
  refunded: { label: "הוחזר", tone: "neutral" },
};

/** תצוגת סטטוס חיוב באזור האישי — לא בניהול. */
export function parentPaymentBadge(
  status: Enums<"payment_status">,
  paymentMethod: Enums<"payment_method"> | null | undefined
): { label: string; tone: BadgeTone } {
  if (
    (status === "pending" || status === "partial") &&
    isNonImmediatePaymentMethod(paymentMethod)
  ) {
    return status === "partial"
      ? PAYMENT_STATUS.partial
      : PARENT_PENDING_MANAGER_APPROVAL;
  }
  return PAYMENT_STATUS[status];
}

export const PAYMENT_METHOD: Record<Enums<"payment_method">, string> = {
  credit_card: "כרטיס אשראי",
  bit: "ביט",
  paybox: "פייבוקס",
  standing_order: "הוראת קבע",
  cash: "מזומן",
  bank_transfer: "העברה בנקאית",
  maccabi: "מכבי",
  amit: "עמית",
  external: "חיצוני",
};

/**
 * אמצעי תשלום שלא נגבים במעמד ההרשמה — ההרשמה נקלטת כחוב פתוח,
 * והמנהל מסמן אותה כשולמה בעמוד הגבייה.
 */
export const DEFERRED_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "maccabi",
  "amit",
] as const satisfies readonly Enums<"payment_method">[];

export type DeferredPaymentMethod = (typeof DEFERRED_PAYMENT_METHODS)[number];

export const DEFERRED_PAYMENT_HINT: Record<DeferredPaymentMethod, string> = {
  cash: "התשלום יימסר במזומן במשרד.",
  bank_transfer: "פרטי החשבון להעברה יישלחו אליכם, והתשלום יסומן עם קליטתו.",
  maccabi: "התשלום יבוצע דרך אפליקציית מכבי מול המשרד.",
  amit: "התשלום יבוצע דרך עמית מול המשרד.",
};

export function isDeferredPaymentMethod(
  method: Enums<"payment_method"> | null
): method is DeferredPaymentMethod {
  return (
    method !== null &&
    (DEFERRED_PAYMENT_METHODS as readonly string[]).includes(method)
  );
}

export const WAITLIST_STATUS: Record<
  Enums<"waitlist_status">,
  { label: string; tone: BadgeTone }
> = {
  waiting: { label: "ממתין", tone: "warning" },
  offered: { label: "הוצע מקום", tone: "info" },
  expired: { label: "פג תוקף", tone: "neutral" },
  joined: { label: "הצטרף", tone: "success" },
  cancelled: { label: "בוטל", tone: "danger" },
};

export const ATTENDANCE_STATUS: Record<
  Enums<"attendance_status">,
  { label: string; tone: BadgeTone }
> = {
  present: { label: "נוכח", tone: "success" },
  absent: { label: "נעדר", tone: "danger" },
  late: { label: "איחור", tone: "warning" },
};

export const ENROLLMENT_TYPE: Record<Enums<"enrollment_type">, string> = {
  class: "חוג",
  program: "מסלול",
  pool_pass: "כניסה לבריכה",
  private_lesson: "שיעור פרטי",
};

export const PRIVATE_LESSON_SLOT_STATUS: Record<
  Enums<"private_lesson_slot_status">,
  { label: string; tone: BadgeTone }
> = {
  awaiting_schedule: { label: "ממתין לתיאום", tone: "warning" },
  scheduled: { label: "מתוזמן", tone: "info" },
  cancelled: { label: "בוטל", tone: "danger" },
  completed: { label: "הושלם", tone: "success" },
};

export const GENDER: Record<Enums<"gender_type">, string> = {
  male: "זכר",
  female: "נקבה",
  other: "אחר",
};

export const ROLE_LABEL: Record<Enums<"user_role">, string> = {
  admin: "מנהל",
  instructor: "מדריכה",
  parent: "הורה",
};
