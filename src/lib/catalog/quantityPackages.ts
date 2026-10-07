import { formatCurrency } from "@/utils/format";

/** חבילת כמות במחיר כולל, למשל 5 שיעורים ב-750. */
export type QuantityPackage = {
  quantity: number;
  price: number;
};

const MAX_QUANTITY_PACKAGES = 8;

export function parseQuantityPackages(value: unknown): QuantityPackage[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const packages: QuantityPackage[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as { quantity?: unknown; price?: unknown };
    const quantity = Math.floor(Number(record.quantity));
    const price = Math.round(Number(record.price) * 100) / 100;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) continue;
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) continue;
    if (seen.has(quantity)) continue;
    seen.add(quantity);
    packages.push({ quantity, price });
    if (packages.length >= MAX_QUANTITY_PACKAGES) break;
  }
  packages.sort((a, b) => a.quantity - b.quantity);
  return packages;
}

/** חבילות שמורות, או השורה הבסיסית כשאין מחירון כמות. */
export function packagesFromProduct(
  baseCount: number | null | undefined,
  basePrice: number | null | undefined,
  tiers: unknown
): QuantityPackage[] {
  const parsed = parseQuantityPackages(tiers);
  if (parsed.length > 0) return parsed;
  const quantity = Math.floor(Number(baseCount ?? 1));
  const price = Math.round(Number(basePrice ?? 0) * 100) / 100;
  return [
    {
      quantity: Number.isInteger(quantity) && quantity >= 1 ? quantity : 1,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
    },
  ];
}

export function normalizePackageDraft(
  rows: { quantity: string; price: string }[]
): { ok: true; packages: QuantityPackage[] } | { ok: false; error: string } {
  if (rows.length === 0) {
    return { ok: false, error: "נא להוסיף לפחות חבילה אחת." };
  }
  if (rows.length > MAX_QUANTITY_PACKAGES) {
    return {
      ok: false,
      error: `אפשר לשמור עד ${MAX_QUANTITY_PACKAGES} חבילות.`,
    };
  }
  const seen = new Set<number>();
  const packages: QuantityPackage[] = [];
  for (const row of rows) {
    const quantity = Math.floor(Number(row.quantity));
    const price = Math.round(Number(row.price) * 100) / 100;
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: "כל חבילה צריכה כמות שלמה, לפחות 1." };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, error: "כל חבילה צריכה מחיר כולל תקין." };
    }
    if (seen.has(quantity)) {
      return { ok: false, error: "אי אפשר לשמור שתי חבילות עם אותה כמות." };
    }
    seen.add(quantity);
    packages.push({ quantity, price });
  }
  packages.sort((a, b) => a.quantity - b.quantity);
  return { ok: true, packages };
}

/** השורה הקטנה נשמרת גם בעמודות הבסיס, כדי שקוראים ישנים יראו מחיר אחד. */
export function columnsFromPackages(packages: QuantityPackage[]) {
  const base = packages[0];
  return {
    count: base.quantity,
    price: base.price,
    price_tiers: packages.length > 1 ? packages : [],
  };
}

export function chooseQuantityPackage(
  packages: QuantityPackage[],
  requested: number | null | undefined
): QuantityPackage | null {
  if (packages.length === 0) return null;
  if (packages.length === 1) return packages[0];
  const quantity = Math.floor(Number(requested));
  return packages.find((pack) => pack.quantity === quantity) ?? null;
}

function packageUnitLabel(unit: "lessons" | "entries", count: number) {
  if (unit === "lessons") {
    return count === 1 ? "שיעור אחד" : `${count} שיעורים`;
  }
  return count === 1 ? "כניסה אחת" : `${count} כניסות`;
}

export function packageOffer(
  baseCount: number | null | undefined,
  basePrice: number | null | undefined,
  tiers: unknown,
  unit: "lessons" | "entries"
) {
  const packages = packagesFromProduct(baseCount, basePrice, tiers);
  const multi = packages.length > 1;
  const lead = packages.reduce(
    (best, pack) => (pack.price < best.price ? pack : best),
    packages[0]
  );
  return {
    packages,
    multi,
    fromPrice: lead.price,
    leadCount: lead.quantity,
    pricePrefix: multi ? "החל מ־" : null,
    priceRows: multi
      ? packages.map((pack) => ({
          range: packageUnitLabel(unit, pack.quantity),
          price: formatCurrency(pack.price),
        }))
      : [],
  };
}
