export function resolveSessionInstructorId(input: {
  substituteInstructorId?: string | null;
  slotInstructorId?: string | null;
  classInstructorId?: string | null;
}): string | null {
  return (
    input.substituteInstructorId ||
    input.slotInstructorId ||
    input.classInstructorId ||
    null
  );
}

export function uniqueClassInstructorIds(
  classInstructorId: string | null | undefined,
  slotInstructorIds: Array<string | null | undefined>
): string[] {
  const ids =
    slotInstructorIds.length > 0
      ? slotInstructorIds.map((id) => id || classInstructorId)
      : [classInstructorId];
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}
