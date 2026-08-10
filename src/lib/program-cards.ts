import type { IconName } from "@/components/icons/paths";

export interface PlanCardTemplate {
  icon: IconName;
  accent: string;
  period?: string;
  featured?: boolean;
  badge?: string;
  features: string[];
}

export const PROGRAM_CARD_TEMPLATES: PlanCardTemplate[] = [
  {
    icon: "drop",
    accent: "var(--logo-cyan)",
    period: "/ לחודש",
    features: [
      "כניסה חופשית לבריכה כל החודש",
      "גישה בכל שעות הפעילות",
      "ביטול בכל עת, ללא קנס",
      "הטבות במחירי חוגים",
    ],
  },
  {
    icon: "family",
    accent: "var(--logo-magenta)",
    period: "/ 3 חודשים",
    featured: true,
    badge: "הכי משתלם",
    features: [
      "עד 4 בני משפחה במנוי אחד",
      "שחייה חופשית למשך 3 חודשים",
      "חיסכון משמעותי לעומת חודשי",
      "עדיפות בהרשמה לחוגים חדשים",
    ],
  },
];

/** מספר חודשים לקצה התלישה בכרטיס הטיקט של מנוי. */
export function programStubMonths(period?: string, index = 0): number {
  if (period) {
    const match = period.match(/(\d+)/);
    if (match) return Number(match[1]);
    if (period.includes("חודש") && !period.includes("חודשים")) return 1;
  }
  return index === 0 ? 1 : 3;
}

export const POOL_PASS_CARD_TEMPLATES: PlanCardTemplate[] = [
  {
    icon: "badge",
    accent: "var(--logo-orange)",
    features: [
      "כניסה אחת לבריכה",
      "ללא מנוי וללא התחייבות",
      "מושלם לאורחים ולניסיון",
    ],
  },
  {
    icon: "ticket",
    accent: "var(--logo-cyan)",
    featured: true,
    badge: "חיסכון ₪50",
    features: [
      "10 כניסות לבריכה",
      "תוקף לשנה מיום הרכישה",
      "חיסכון משמעותי",
      "ניתן לשיתוף בין בני המשפחה",
    ],
  },
];
