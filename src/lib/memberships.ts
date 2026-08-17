import { addDays } from "@/lib/scheduling/monthGrid";

/** כמה ימים לפני תום המנוי המנהל מקבל התראה בדשבורד. */
export const MEMBERSHIP_EXPIRY_WARNING_DAYS = 14;

export type MembershipExpiryStatus = "expired" | "ending_soon" | "active";

export function membershipExpiryStatus(
  endsOn: string,
  today: string
): MembershipExpiryStatus {
  if (endsOn < today) return "expired";
  if (endsOn <= addDays(today, MEMBERSHIP_EXPIRY_WARNING_DAYS)) {
    return "ending_soon";
  }
  return "active";
}

export function daysUntilMembershipEnds(endsOn: string, today: string): number {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function membershipExpiryLabel(endsOn: string, today: string): string {
  const days = daysUntilMembershipEnds(endsOn, today);
  if (days < 0) {
    const passed = Math.abs(days);
    return passed === 1 ? "הסתיים אתמול" : `הסתיים לפני ${passed} ימים`;
  }
  if (days === 0) return "מסתיים היום";
  if (days === 1) return "מסתיים מחר";
  return `מסתיים בעוד ${days} ימים`;
}
