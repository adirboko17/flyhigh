/**
 * עיצוב מטבע בשקלים.
 */
export function formatCurrency(amount: number | null | undefined): string {
  const value = typeof amount === "number" ? amount : 0;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/**
 * עיצוב תאריך בעברית.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * עיצוב תאריך קצר (יום/חודש/שנה).
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * עיצוב שעה מתוך ערך time של Postgres (HH:MM:SS).
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

/**
 * חישוב גיל מתאריך לידה.
 */
export function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * ראשי תיבות מתוך שם מלא (לאווטאר).
 */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}
