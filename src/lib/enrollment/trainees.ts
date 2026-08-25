/** מזהה פנימי לבחירת ההורה כמתאמן/ת בחוג. */
export const PARENT_TRAINEE_ID = "__parent__";

export function resolveClassParticipants(
  childIds: string[],
  includeSelf: boolean
) {
  const uniqueChildIds = [...new Set(childIds.filter(Boolean))];
  const participants: (string | null)[] = [...uniqueChildIds];
  if (includeSelf) participants.push(null);
  return { uniqueChildIds, participants, includeSelf };
}
