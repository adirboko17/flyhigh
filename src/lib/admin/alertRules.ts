/** חיוב פתוח שבוע ומעלה נחשב ממתין, ושבועיים ומעלה באיחור. */
export const COLLECTION_WAITING_DAYS = 7;
export const COLLECTION_OVERDUE_DAYS = 14;

/** מנוי שפג ועדיין פעיל נשאר בהתראות תקופה קצרה אחרי תאריך הסיום. */
export const MEMBERSHIP_EXPIRED_LOOKBACK_DAYS = 30;

/** היעדרות ברצף שהמפגש האחרון שלה ישן מדי לא נשארת על המסך. */
export const ABSENCE_FRESH_DAYS = 60;

export type CollectionUrgency = "overdue" | "waiting" | "recent";

export function collectionUrgency(ageDays: number): CollectionUrgency {
  if (ageDays >= COLLECTION_OVERDUE_DAYS) return "overdue";
  if (ageDays >= COLLECTION_WAITING_DAYS) return "waiting";
  return "recent";
}

export function collectionAgeLabel(ageDays: number): string {
  if (ageDays <= 0) return "נפתח היום";
  if (ageDays === 1) return "נפתח אתמול";
  return `פתוח כבר ${ageDays} ימים`;
}

/**
 * תאריכי ההיעדרות הרצופים בסוף הרשימה.
 * יום עם סימון שאינו היעדרות שובר את הרצף, גם אם באותו יום סומן גם היעדר.
 */
export function trailingAbsentDates(
  marks: { date: string; status: string }[]
): string[] {
  const byDate = new Map<string, string>();

  for (const mark of marks) {
    const current = byDate.get(mark.date);
    if (!current) {
      byDate.set(mark.date, mark.status);
      continue;
    }
    if (current === "absent" && mark.status !== "absent") {
      byDate.set(mark.date, mark.status);
    }
  }

  const dates = [...byDate.keys()].sort();
  const streak: string[] = [];

  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const date = dates[index];
    if (!date || byDate.get(date) !== "absent") break;
    streak.push(date);
  }

  streak.reverse();
  return streak;
}
