import type { IconName } from "@/components/icons/paths";
import type { PlanTicketStub } from "@/components/programs/PlanTicketCard";
import {
  activityStartingPrice,
  extraHalfHourLabel,
  parseActivityPriceTiers,
  shortActivityPeopleRange,
  usesGroupPricing,
} from "@/lib/finance/activityPricing";
import { formatCurrency } from "@/utils/format";
import type { Json } from "@/types/database.types";

export type ActivityPriceRow = {
  range: string;
  price: string;
  note: string | null;
};

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

export function activityCardPresentation(program: {
  price: number;
  price_tiers?: Json | null;
  extra_half_hour_price?: number | null;
}) {
  const tiers = parseActivityPriceTiers(program.price_tiers);
  const extra = extraHalfHourLabel(program.extra_half_hour_price);
  const features = extra
    ? [...ACTIVITY_CARD_TEMPLATE.features, extra]
    : ACTIVITY_CARD_TEMPLATE.features;

  if (!usesGroupPricing(tiers)) {
    return {
      price: formatCurrency(program.price),
      period: ACTIVITY_CARD_TEMPLATE.period,
      pricePrefix: null as string | null,
      hint: "פעילות בבריכה לפי מספר המשתתפים",
      priceRows: [] as ActivityPriceRow[],
      extraLine: extra,
      stub: { kind: "people", label: "למשתתף" } satisfies PlanTicketStub,
      features,
    };
  }

  const starting = activityStartingPrice(tiers, program.price);
  const stubValue = Number.isInteger(starting)
    ? String(starting)
    : starting.toFixed(2);

  return {
    price: formatCurrency(starting),
    period: "/ לקבוצה",
    pricePrefix: "החל מ־",
    hint: "המחיר לפי מספר המשתתפים",
    priceRows: tiers.map((tier) => ({
      range: shortActivityPeopleRange(tier),
      price: formatCurrency(tier.price),
      note: tier.note,
    })),
    extraLine: extra,
    stub: {
      kind: "people",
      eyebrow: "החל מ־",
      value: stubValue,
      unit: "₪",
    } satisfies PlanTicketStub,
    features,
  };
}

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

/** כניסה בודדת מקבלת את התבנית הראשונה; כרטיסייה — את השנייה. */
export function poolPassCardTemplate(entriesCount: number): PlanCardTemplate {
  return entriesCount > 1
    ? POOL_PASS_CARD_TEMPLATES[1]
    : POOL_PASS_CARD_TEMPLATES[0];
}

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
