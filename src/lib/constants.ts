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

export const HERO_POOL_IMAGE =
  "https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=1200&q=80";

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

export const PAYMENT_STATUS: Record<
  Enums<"payment_status">,
  { label: string; tone: BadgeTone }
> = {
  pending: { label: "ממתין", tone: "warning" },
  paid: { label: "שולם", tone: "success" },
  failed: { label: "נכשל", tone: "danger" },
  refunded: { label: "הוחזר", tone: "neutral" },
};

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
