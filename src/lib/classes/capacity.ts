/** ערך `available` שמוחזר לציבור כשאין מכסה — גדול מספיק שלא ייחשב כמלא. */
export const UNLIMITED_AVAILABLE_SENTINEL = 1_000_000;

export function isUnlimitedCapacity(
  capacity: number | null | undefined
): boolean {
  return capacity == null;
}

export function classIsSoldOut(cls: {
  capacity?: number | null;
  available?: number | null;
  status?: string | null;
}): boolean {
  if (isUnlimitedCapacity(cls.capacity)) return false;
  if (cls.status === "full") return true;
  return (cls.available ?? 0) <= 0;
}

/** כמה מקומות נשארו. `null` = אין הגבלה. */
export function remainingClassSpots(
  capacity: number | null | undefined,
  taken: number
): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - taken);
}

export function formatClassOccupancy(
  registered: number,
  capacity: number | null | undefined
): string {
  if (isUnlimitedCapacity(capacity)) {
    return `${registered} · ללא הגבלה`;
  }
  return `${registered} מתוך ${capacity}`;
}
