/** מספר השיעורים במוצר. 1 = שיעור בודד. יותר מ-1 = כרטיסייה במחיר קבוע. */
export function privateLessonCount(value: number | null | undefined) {
  const count = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(count) || count < 1) return 1;
  return count;
}

/** כרטיסייה: מספר השיעורים קבוע, והמחיר הוא המחיר הכולל של הסדרה. */
export function isPrivateLessonSeries(value: number | null | undefined) {
  return privateLessonCount(value) > 1;
}
