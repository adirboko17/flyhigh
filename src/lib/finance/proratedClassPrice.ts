/**
 * מחיר חוג קבוע לכל התקופה — גם אם כבר התקיימו מפגשים.
 * סופרים מפגשים רק כדי לדעת אם החוג הסתיים ולתצוגת לוח.
 * מפגש של היום נספר כנותר כל עוד לא סומן כהושלם.
 */

export type ClassSessionForProration = {
  session_date: string;
  start_time?: string | null;
  status: "scheduled" | "cancelled" | "completed" | string;
};

export type ProratedClassPrice = {
  /** מחיר החוג המלא לתקופה, כפי שמוגדר בחוג. */
  fullPrice: number;
  /** המחיר לילד/ה לפני הנחת אחים וקופון. */
  unitPrice: number;
  pricePerSession: number;
  /** מפגשים שלא בוטלו — המכנה לחישוב מחיר למפגש. */
  billableCount: number;
  remainingCount: number;
  elapsedCount: number;
  /** מספר המפגש הראשון שנכלל בהרשמה, מ־1. */
  firstSessionNumber: number;
  firstRemainingDate: string | null;
  isLate: boolean;
  hasEnded: boolean;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function safePrice(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function compareSessions(
  a: ClassSessionForProration,
  b: ClassSessionForProration
): number {
  return (
    a.session_date.localeCompare(b.session_date) ||
    (a.start_time ?? "").localeCompare(b.start_time ?? "")
  );
}

/** מפגש שכבר לא נכלל במחיר: תאריך שעבר, או היום שסומן כהושלם. */
export function isElapsedClassSession(
  session: ClassSessionForProration,
  today: string
): boolean {
  if (session.session_date < today) return true;
  return session.session_date === today && session.status === "completed";
}

export function billableClassSessions<T extends ClassSessionForProration>(
  sessions: T[]
): T[] {
  return sessions
    .filter((session) => session.status !== "cancelled")
    .sort(compareSessions);
}

/** מחיר לטיפול בודד — בלי פרו-רייט של סדרה. */
export function appointmentClassPrice(
  price: number,
  remainingCount: number,
  billableCount: number
): ProratedClassPrice {
  const unit = safePrice(price);
  const billable = Math.max(0, Math.floor(billableCount));
  const remaining = Math.max(0, Math.floor(remainingCount));
  return {
    fullPrice: unit,
    unitPrice: unit,
    pricePerSession: unit,
    billableCount: billable,
    remainingCount: remaining,
    elapsedCount: Math.max(0, billable - remaining),
    firstSessionNumber: 1,
    firstRemainingDate: null,
    isLate: false,
    hasEnded: billable > 0 && remaining <= 0,
  };
}

export function prorateClassPriceFromCounts(
  fullPrice: number,
  billableCount: number,
  remainingCount: number
): ProratedClassPrice {
  const price = safePrice(fullPrice);
  const billable = Math.max(0, Math.floor(billableCount));
  const remaining = Math.max(0, Math.min(billable, Math.floor(remainingCount)));
  const elapsed = Math.max(0, billable - remaining);

  if (billable === 0) {
    return {
      fullPrice: price,
      unitPrice: price,
      pricePerSession: 0,
      billableCount: 0,
      remainingCount: 0,
      elapsedCount: 0,
      firstSessionNumber: 1,
      firstRemainingDate: null,
      isLate: false,
      hasEnded: false,
    };
  }

  const pricePerSession = round2(price / billable);
  const hasEnded = remaining === 0;

  return {
    fullPrice: price,
    unitPrice: hasEnded ? 0 : price,
    pricePerSession,
    billableCount: billable,
    remainingCount: remaining,
    elapsedCount: elapsed,
    firstSessionNumber: hasEnded ? billable : elapsed + 1,
    firstRemainingDate: null,
    isLate: false,
    hasEnded,
  };
}

export function prorateClassPrice(
  fullPrice: number,
  sessions: ClassSessionForProration[],
  today: string
): ProratedClassPrice {
  const billable = billableClassSessions(sessions);
  const remainingSessions = billable.filter(
    (session) => !isElapsedClassSession(session, today)
  );
  const result = prorateClassPriceFromCounts(
    fullPrice,
    billable.length,
    remainingSessions.length
  );

  return {
    ...result,
    firstRemainingDate: remainingSessions[0]?.session_date ?? null,
  };
}

export function classPriceFromPublicCounts(
  fullPrice: number,
  billableCount: number | null | undefined,
  remainingCount: number | null | undefined
): ProratedClassPrice {
  if (billableCount == null || remainingCount == null) {
    return prorateClassPriceFromCounts(fullPrice, 0, 0);
  }
  return prorateClassPriceFromCounts(fullPrice, billableCount, remainingCount);
}
