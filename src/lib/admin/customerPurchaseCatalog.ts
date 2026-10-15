import { packagesFromProduct } from "@/lib/catalog/quantityPackages";
import {
  activityDefaultPeopleCount,
  activityPeopleCap,
  parseActivityPriceTiers,
  quoteActivityPrice,
  type ActivityPriceTier,
} from "@/lib/finance/activityPricing";
import {
  isActivityProgram,
  isSessionActivity,
  type ProgramKind,
} from "@/lib/programs";
import { formatCurrency } from "@/utils/format";
import type { Json } from "@/types/database.types";

export type PurchasePlanKind = "program" | "pool_pass" | "private_lesson";

export type PurchaseProductGroup =
  | "membership"
  | "activity"
  | "pool_pass"
  | "private_lesson";

export const PURCHASE_GROUP_LABEL: Record<PurchaseProductGroup, string> = {
  membership: "מנויים",
  activity: "פעילויות",
  pool_pass: "כניסות וכרטיסיות",
  private_lesson: "שיעורים פרטיים",
};

export const PURCHASE_GROUP_ORDER: PurchaseProductGroup[] = [
  "membership",
  "activity",
  "pool_pass",
  "private_lesson",
];

export type PurchaseProductOption = {
  key: string;
  kind: PurchasePlanKind;
  planId: string;
  title: string;
  group: PurchaseProductGroup;
  /** מחיר קבוע, או מחיר ברירת המחדל כשהמחיר תלוי במספר משתתפים. */
  price: number;
  packageQuantity: number | null;
  detail: string | null;
  pricing: "fixed" | "people";
  perPersonPrice: number;
  priceTiers: ActivityPriceTier[];
  defaultPeople: number;
  maxPeople: number;
};

type ProgramRow = {
  id: string;
  title: string;
  price: number;
  kind: ProgramKind;
  duration_months: number;
  duration_minutes: number | null;
  price_tiers: Json;
};

type PassRow = {
  id: string;
  title: string;
  price: number;
  entries_count: number;
  price_tiers: Json;
};

type LessonRow = {
  id: string;
  title: string;
  price: number;
  lessons_count: number;
  duration_minutes: number;
  price_tiers: Json;
};

function quantityLabel(unit: "entries" | "lessons", count: number) {
  if (unit === "lessons") {
    return count === 1 ? "שיעור אחד" : `${count} שיעורים`;
  }
  return count === 1 ? "כניסה אחת" : `${count} כניסות`;
}

function monthsLabel(months: number) {
  if (months === 1) return "חודש אחד";
  return `${months} חודשים`;
}

export function purchaseOptionKey(
  kind: PurchasePlanKind,
  planId: string,
  packageQuantity: number | null
) {
  return packageQuantity == null
    ? `${kind}:${planId}`
    : `${kind}:${planId}:${packageQuantity}`;
}

export function purchaseOptionLabel(option: PurchaseProductOption) {
  const parts = [option.title];
  if (option.detail) parts.push(option.detail);
  parts.push(
    option.pricing === "people" ? "לפי משתתפים" : formatCurrency(option.price)
  );
  return parts.join(" · ");
}

export function purchaseChargeAmount(
  option: Pick<
    PurchaseProductOption,
    "pricing" | "price" | "perPersonPrice" | "priceTiers"
  >,
  peopleCount: number
): number | null {
  if (option.pricing === "fixed") return option.price;
  return (
    quoteActivityPrice(peopleCount, option.perPersonPrice, option.priceTiers)
      ?.amount ?? null
  );
}

function fixedOption(
  input: Omit<
    PurchaseProductOption,
    | "pricing"
    | "perPersonPrice"
    | "priceTiers"
    | "defaultPeople"
    | "maxPeople"
  > & { perPersonPrice?: number }
): PurchaseProductOption {
  return {
    ...input,
    pricing: "fixed",
    perPersonPrice: input.perPersonPrice ?? input.price,
    priceTiers: [],
    defaultPeople: 1,
    maxPeople: 1,
  };
}

export function buildPurchaseCatalog(input: {
  programs: ProgramRow[];
  poolPasses: PassRow[];
  privateLessons: LessonRow[];
}): PurchaseProductOption[] {
  const options: PurchaseProductOption[] = [];

  for (const program of input.programs) {
    const tiers = parseActivityPriceTiers(program.price_tiers);
    if (isActivityProgram(program.kind)) {
      const session = isSessionActivity({
        kind: program.kind,
        durationMinutes: program.duration_minutes,
        hasGroupPricing: tiers.length > 0,
      });
      if (session) {
        options.push(
          fixedOption({
            key: purchaseOptionKey("program", program.id, null),
            kind: "program",
            planId: program.id,
            title: program.title,
            group: "activity",
            price: Number(program.price),
            packageQuantity: null,
            detail: program.duration_minutes
              ? `${program.duration_minutes} דק׳`
              : null,
          })
        );
        continue;
      }

      const defaultPeople = activityDefaultPeopleCount(tiers);
      const quoted = quoteActivityPrice(
        defaultPeople,
        Number(program.price),
        tiers
      );
      options.push({
        key: purchaseOptionKey("program", program.id, null),
        kind: "program",
        planId: program.id,
        title: program.title,
        group: "activity",
        price: quoted?.amount ?? Number(program.price),
        packageQuantity: null,
        detail: program.duration_minutes
          ? `${program.duration_minutes} דק׳`
          : null,
        pricing: "people",
        perPersonPrice: Number(program.price),
        priceTiers: tiers,
        defaultPeople,
        maxPeople: activityPeopleCap(tiers),
      });
      continue;
    }

    options.push(
      fixedOption({
        key: purchaseOptionKey("program", program.id, null),
        kind: "program",
        planId: program.id,
        title: program.title,
        group: "membership",
        price: Number(program.price),
        packageQuantity: null,
        detail:
          program.duration_months > 0
            ? monthsLabel(program.duration_months)
            : null,
      })
    );
  }

  for (const pass of input.poolPasses) {
    const packages = packagesFromProduct(
      pass.entries_count,
      pass.price,
      pass.price_tiers
    );
    const multi = packages.length > 1;
    for (const pack of packages) {
      const quantity = multi ? pack.quantity : null;
      options.push(
        fixedOption({
          key: purchaseOptionKey("pool_pass", pass.id, quantity),
          kind: "pool_pass",
          planId: pass.id,
          title: pass.title,
          group: "pool_pass",
          price: pack.price,
          packageQuantity: quantity,
          detail: quantityLabel(
            "entries",
            multi ? pack.quantity : pass.entries_count
          ),
        })
      );
    }
  }

  for (const lesson of input.privateLessons) {
    const packages = packagesFromProduct(
      lesson.lessons_count,
      lesson.price,
      lesson.price_tiers
    );
    const multi = packages.length > 1;
    for (const pack of packages) {
      const quantity = multi ? pack.quantity : null;
      const count = multi ? pack.quantity : lesson.lessons_count;
      const detail = [
        lesson.duration_minutes ? `${lesson.duration_minutes} דק׳` : null,
        quantityLabel("lessons", count),
      ]
        .filter(Boolean)
        .join(" · ");
      options.push(
        fixedOption({
          key: purchaseOptionKey("private_lesson", lesson.id, quantity),
          kind: "private_lesson",
          planId: lesson.id,
          title: lesson.title,
          group: "private_lesson",
          price: pack.price,
          packageQuantity: quantity,
          detail: detail || null,
        })
      );
    }
  }

  return options.sort((a, b) => a.title.localeCompare(b.title, "he"));
}
