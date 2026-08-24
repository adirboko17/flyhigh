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
    period: "/ 6 חודשים",
    featured: true,
    badge: "הכי משתלם",
    features: [
      "כניסה חופשית לבריכה למשך חצי שנה",
      "גישה בכל שעות הפעילות",
      "בלי התחייבות ארוכה מעבר לתקופה",
    ],
  },
];

export const ACTIVITY_CARD_TEMPLATE: PlanCardTemplate = {
  icon: "family",
  accent: "var(--logo-magenta)",
  period: "/ למשתתף",
  features: [
    "פעילות בבריכה לפי מספר המשתתפים",
    "מתאים לילדים ולמשפחות",
    "משלמים, ואז מתאמים מועד מול המשרד",
  ],
};

export function programDurationLabel(months: number): string {
  return months === 1 ? "/ חודש" : `/ ${months} חודשים`;
}

/** מספר חודשים שמוצג בשבב התוקף על כרטיס המנוי. */
export function programStubMonths(period?: string, index = 0): number {
  if (period) {
    if (period.includes("הפוגה")) return 1;
    const match = period.match(/(\d+)/);
    if (match) return Number(match[1]);
    if (period.includes("חודש") && !period.includes("חודשים")) return 1;
    if (period.includes("חצי")) return 6;
  }
  return index === 0 ? 6 : 1;
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
      "חיסכון משמעותי לעומת כניסה בודדת",
      "ניתן לשיתוף בין בני המשפחה",
    ],
  },
];

export const PRIVATE_LESSON_CARD_TEMPLATES: PlanCardTemplate[] = [
  {
    icon: "drop",
    accent: "var(--logo-magenta)",
    features: [
      "שיעור אישי עם מדריכה",
      "תיאום תאריך ושעה מול המשרד",
      "אפשר לרכוש כמה שיעורים בבת אחת",
    ],
  },
];
