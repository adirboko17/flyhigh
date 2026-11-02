/** תוויות שאפשר לרשום על הקבלה במקום שם החוג/המוצר. */

export type ReceiptLabelOption = {
  id: string;
  label: string;
  /** הערה/תגית ליד התווית בבחירה — לא נכתבת על הקבלה. */
  note?: string | null;
};

export function receiptLabelNote(note: string | null | undefined) {
  const trimmed = note?.trim() ?? "";
  return trimmed || null;
}

export type ReceiptLabelChoice = {
  /** האם הלקוח ביקש טקסט אחר על הקבלה. */
  enabled: boolean;
  labelId: string | null;
};

export const EMPTY_RECEIPT_LABEL_CHOICE: ReceiptLabelChoice = {
  enabled: false,
  labelId: null,
};

/** בונה את טקסט הקבלה: תווית שנבחרה, או ברירת המחדל של המוצר. */
export function buildReceiptDescription(input: {
  productTitle: string;
  participantCount: number;
  kind: "class" | "plan";
  customLabel?: string | null;
}): string {
  const custom = input.customLabel?.trim();
  if (custom) return custom;

  if (input.kind === "class") {
    return `הרשמה ל${input.productTitle} (${input.participantCount} ילדים)`;
  }

  return `רכישת ${input.productTitle} (${input.participantCount} משתתפים)`;
}

/**
 * טקסט לחשבונית של עגלה: מה שהלקוח ביקש על הקבלה,
 * ואם לא ביקש — תיאור כל חוג או מוצר.
 */
export function checkoutReceiptText(
  lineDescriptions: readonly string[],
  customLabel?: string | null
): string {
  const custom = customLabel?.trim();
  if (custom) return custom;
  return lineDescriptions
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" · ");
}

/** שם סופי על הקבלה: טקסט מותאם מחליף לגמרי, אחרת תווית/תיאור, אחרת ברירת מחדל. */
export function composeReceiptLine(input: {
  base: string | null | undefined;
  customText?: string | null;
  fallback: string;
}): string {
  const custom = input.customText?.trim() || "";
  if (custom) return custom;
  const base = input.base?.trim() || "";
  return base || input.fallback;
}
