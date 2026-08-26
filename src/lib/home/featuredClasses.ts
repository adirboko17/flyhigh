export const HOME_FEATURED_LIMIT = 3;
export const HOME_FEATURED_SETTING_KEY = "home_featured_classes";

export function parseFeaturedClassIds(value: unknown): string[] {
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
    if (ids.length === HOME_FEATURED_LIMIT) break;
  }
  return ids;
}

/** מציג את החוגים שנבחרו, לפי הסדר. בלי בחירה תקפה — שלושת הראשונים. */
export function pickFeaturedClasses<T extends { id: string }>(
  classes: T[],
  featuredIds: string[]
): T[] {
  const byId = new Map(classes.map((cls) => [cls.id, cls]));
  const picked = featuredIds
    .map((id) => byId.get(id))
    .filter((cls): cls is T => Boolean(cls));

  if (picked.length > 0) return picked;
  return classes.slice(0, HOME_FEATURED_LIMIT);
}
