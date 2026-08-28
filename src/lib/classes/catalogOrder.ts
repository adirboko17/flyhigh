export const CATALOG_ORDER_SETTING_KEY = "catalog_class_order";

export function parseCatalogClassIds(value: unknown): string[] {
  const raw = Array.isArray((value as { ids?: unknown } | null)?.ids)
    ? (value as { ids: unknown[] }).ids
    : Array.isArray(value)
      ? value
      : [];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item || seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }
  return ids;
}

export function sortClassesByCategory<
  T extends { category?: string | null; title: string },
>(classes: T[]) {
  return [...classes].sort((a, b) => {
    const byCategory = (a.category ?? "\uffff").localeCompare(
      b.category ?? "\uffff",
      "he"
    );
    if (byCategory !== 0) return byCategory;
    return a.title.localeCompare(b.title, "he");
  });
}

/** סדר שמור קודם, ואחר כך חוגים חדשים לפי קטגוריה. */
export function sortByCatalogOrder<
  T extends { id: string; category?: string | null; title: string },
>(classes: T[], orderedIds: string[]): T[] {
  if (orderedIds.length === 0) return sortClassesByCategory(classes);

  const byId = new Map(classes.map((cls) => [cls.id, cls]));
  const used = new Set<string>();
  const ordered: T[] = [];

  for (const id of orderedIds) {
    const cls = byId.get(id);
    if (!cls) continue;
    ordered.push(cls);
    used.add(id);
  }

  const rest = sortClassesByCategory(classes.filter((cls) => !used.has(cls.id)));
  return [...ordered, ...rest];
}
