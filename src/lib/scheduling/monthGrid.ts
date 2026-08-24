/**
 * עזרי לוח שנה חודשי. כל התאריכים מיוצגים כמחרוזות "YYYY-MM-DD" והחישובים
 * נעשים ב־UTC, כדי שהרינדור בשרת ובדפדפן יצא זהה ללא תלות באזור הזמן של המכונה.
 */

export type CalendarDay = {
  /** YYYY-MM-DD */
  date: string;
  dayOfMonth: number;
  /** האם היום שייך לחודש המוצג (ולא לחודש הסמוך שממלא את השורה). */
  inMonth: boolean;
  isToday: boolean;
  /** שישי ושבת. */
  isWeekend: boolean;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthParts(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, monthIndex: monthNumber - 1 };
}

/** התאריך הנוכחי לפי שעון ישראל, כדי ש"היום" לא יזוז בגלל אזור הזמן של השרת. */
export function todayInIsrael(): string {
  return israelDateOf(new Date().toISOString());
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** מזיז תאריך "YYYY-MM-DD" במספר ימים, לחישוב טווחים כמו "השבוע הקרוב". */
export function addDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return toIsoDate(shifted);
}

/** מזיז תאריך "YYYY-MM-DD" במספר חודשים, בלי לחרוג מיום סוף החודש. */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
  return toIsoDate(
    new Date(Date.UTC(year, targetMonthIndex, Math.min(day, lastDay)))
  );
}

/** מאמת פרמטר חודש מה־URL; מחזיר את ברירת המחדל אם הוא לא תקין. */
export function parseMonthParam(value: string | undefined, fallback: string): string {
  return value && MONTH_PATTERN.test(value) ? value : fallback;
}

export function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = monthParts(month);
  const shifted = new Date(Date.UTC(year, monthIndex + delta, 1));
  return toIsoDate(shifted).slice(0, 7);
}

/** טווח התאריכים המלא של החודש, לשאילתות מסד נתונים. */
export function monthRange(month: string): { start: string; end: string } {
  const { year, monthIndex } = monthParts(month);
  return {
    start: toIsoDate(new Date(Date.UTC(year, monthIndex, 1))),
    end: toIsoDate(new Date(Date.UTC(year, monthIndex + 1, 0))),
  };
}

/** רשימת חודשים רצופה שמסתיימת ב־endMonth (כולל), לגרפי מגמה. */
export function listMonths(endMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftMonth(endMonth, index - (count - 1))
  );
}

/**
 * התאריך המקומי בישראל של חותמת זמן, לשיוך תשלומים לחודש הנכון
 * גם כשהחותמת נשמרה ב־UTC סמוך לחצות.
 */
export function israelDateOf(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function monthLabel(month: string): string {
  const { year, monthIndex } = monthParts(month);
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

/** שם החודש בלבד, לתוויות צירים בגרפים. */
export function shortMonthLabel(month: string): string {
  const { year, monthIndex } = monthParts(month);
  return new Intl.DateTimeFormat("he-IL", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function dayLabelLong(date: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function isValidIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  return toIsoDate(new Date(`${value}T00:00:00Z`)) === value;
}

/** יום ראשון של השבוע שמכיל את התאריך, בהתאם ללוח שמתחיל בראשון. */
export function weekStartOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -weekday);
}

export function weekRange(weekStart: string): { start: string; end: string } {
  return { start: weekStart, end: addDays(weekStart, 6) };
}

export function shiftWeek(weekStart: string, delta: number): string {
  return addDays(weekStart, delta * 7);
}

/** מאמת פרמטר שבוע מה־URL ומנרמל ליום ראשון של אותו שבוע. */
export function parseWeekParam(value: string | undefined, fallback: string): string {
  const source = value && isValidIsoDate(value) ? value : fallback;
  return weekStartOf(source);
}

export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const startDate = new Date(`${weekStart}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const sameMonth =
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCFullYear() === endDate.getUTCFullYear();

  if (sameMonth) {
    const monthYear = new Intl.DateTimeFormat("he-IL", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(startDate);
    return `${startDate.getUTCDate()}–${endDate.getUTCDate()} ב${monthYear}`;
  }

  const full = new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${full.format(startDate)} – ${full.format(endDate)}`;
}

/** שבעת ימי השבוע שמתחיל ב־weekStart (יום ראשון). */
export function buildWeekGrid(weekStart: string, today: string): CalendarDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const iso = addDays(weekStart, index);
    const date = new Date(`${iso}T00:00:00Z`);
    const weekday = date.getUTCDay();

    return {
      date: iso,
      dayOfMonth: date.getUTCDate(),
      inMonth: true,
      isToday: iso === today,
      isWeekend: weekday === 5 || weekday === 6,
    };
  });
}

/**
 * בונה את תאי הלוח — שבועות שלמים מיום ראשון, כולל ימי הגלישה מהחודשים הסמוכים.
 */
export function buildMonthGrid(month: string, today: string): CalendarDay[] {
  const { year, monthIndex } = monthParts(month);
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const leadingDays = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, 1 - leadingDays + index));
    const iso = toIsoDate(date);
    const weekday = date.getUTCDay();

    return {
      date: iso,
      dayOfMonth: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
      isToday: iso === today,
      isWeekend: weekday === 5 || weekday === 6,
    };
  });
}
