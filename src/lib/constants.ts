import type { Enums } from "@/types/database.types";

export const BRAND = {
  name: "על הגובה",
  tagline: "חוגים, מסלולים וכניסות לבריכה",
  phone: "03-5556677",
  email: "office@al-hagova.co.il",
};

export const CONTACT = {
  phone: BRAND.phone,
  email: BRAND.email,
  address: "דרך הגת, מצודת יהודה",
};

export const MIN_PASSWORD_LENGTH = 8;

/** תמונת רקע קבועה להירו — בריכה עם המבנה המקושת. */
export const HERO_POOL_IMAGE = "/images/carousel/slide-03.jpg";

/** תמונות גלריית הבית (מתוך assets/carusle). */
export const HERO_CAROUSEL_IMAGES = [
  "/images/carousel/slide-01.jpg",
  "/images/carousel/slide-02.jpg",
  "/images/carousel/slide-03.jpg",
  "/images/carousel/slide-04.jpg",
  "/images/carousel/slide-06.jpg",
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
  not_required: { label: "הרשמת עניין", tone: "info" },
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
  if (paymentStatus === "not_required") {
    return ENROLLMENT_PAYMENT_STATUS.not_required;
  }
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

/** אשראי שנפתח לדף סליקה ולא הושלם — עגלה נטושה, לא עסקה. */
export function isAbandonedCardcomCharge(
  status: Enums<"payment_status">,
  paymentMethod: Enums<"payment_method"> | null | undefined,
  cardcomReference?: string | null
): boolean {
  return (
    paymentMethod === "credit_card" &&
    (status === "pending" || status === "failed") &&
    !cardcomReference
  );
}

/**
 * "ממתין לסליקה" רק אחרי עסקת אשראי שאושרה בקארדקום ועדיין לא סומנה כשולמה.
 * כניסה לדף תשלום בלי סליקה היא פשוט חוב פתוח — "לא שולם".
 */
export function adminPaymentBadge(
  status: Enums<"payment_status">,
  paymentMethod: Enums<"payment_method"> | null | undefined,
  options?: { cardcomReference?: string | null }
): { label: string; tone: BadgeTone } {
  if (
    status === "pending" &&
    paymentMethod === "credit_card" &&
    Boolean(options?.cardcomReference)
  ) {
    return { label: "ממתין לסליקה", tone: "warning" };
  }
  return PAYMENT_STATUS[status];
}

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
  cash: "התשלום יימסר במזומן למורית.",
  bank_transfer: "העבירו לפי פרטי החשבון הבאים. התשלום יסומן עם קליטתו.",
  maccabi: "התשלום יבוצע דרך אפליקציית מכבי.",
  amit: "התשלום יבוצע דרך עמית.",
};

export const BANK_TRANSFER_ACCOUNT = {
  title: "פרטי חשבון בנק חדש",
  bank: "מזרחי מרכז מסחרי ערד",
  branch: "489",
  account: "450892",
  holder: "מורית שפירא",
} as const;

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
  program: "מנוי",
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

export function isGenderType(
  value: string | null | undefined
): value is Enums<"gender_type"> {
  return value === "male" || value === "female" || value === "other";
}

export const ROLE_LABEL: Record<Enums<"user_role">, string> = {
  admin: "מנהל",
  instructor: "מדריכה",
  parent: "הורה",
};
