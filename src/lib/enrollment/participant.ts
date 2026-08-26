/** שם מי שנרשם: הילד/ה, או ההורה כשנרשם לעצמו. */
export function participantDisplayName(
  childName: string | null | undefined,
  parentName: string | null | undefined,
  fallback = ""
): string {
  const child = childName?.trim();
  if (child) return child;
  const parent = parentName?.trim();
  if (parent) return parent;
  return fallback;
}

/**
 * שורת משנה ליד השם.
 * כשיש ילד — שם ההורה והטלפון. כשההורה נרשם לעצמו — רק הטלפון, בלי לחזור על השם.
 */
export function participantSecondaryLine(
  childName: string | null | undefined,
  parentName: string | null | undefined,
  phone: string | null | undefined
): string | null {
  const child = childName?.trim();
  const parent = parentName?.trim();
  const tel = phone?.trim();
  if (child) {
    const parts = [parent, tel].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  return tel || null;
}
