/** תוויות שאפשר לרשום על הקבלה במקום שם החוג/המוצר. */

export type ReceiptLabelOption = {
  id: string;
  label: string;
};

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
