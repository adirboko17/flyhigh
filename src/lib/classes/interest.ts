/** חוג הרשמת עניין: בלי מועדים ובלי תשלום, רק כדי לבדוק ביקוש. */
export function isInterestClass(cls: {
  interest_only?: boolean | null;
} | null | undefined) {
  return Boolean(cls?.interest_only);
}
