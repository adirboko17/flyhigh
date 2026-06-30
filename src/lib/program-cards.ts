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
