import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";

export function foldPersonName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("he");
}

export function prospectMatchesRegistration(
  prospect: { full_name: string; child_name: string | null },
  person: { childName: string | null; parentName: string | null }
): boolean {
  const childOnProspect = foldPersonName(prospect.child_name);
  const prospectName = foldPersonName(prospect.full_name);
  const enrolledChild = foldPersonName(person.childName);
  const parentName = foldPersonName(person.parentName);

  if (enrolledChild) {
    if (childOnProspect && childOnProspect === enrolledChild) return true;
    if (!childOnProspect && prospectName === enrolledChild) return true;
    return false;
  }

  return childOnProspect.length === 0 && prospectName.length > 0 && prospectName === parentName;
}

type RegistrationRow = {
  class_id?: string | null;
  parent_id?: string | null;
  child_id?: string | null;
  is_trial?: boolean | null;
  session_id?: string | null;
};

/** הרשמה לחוג עצמו, לא שיעור ניסיון בתשלום ולא תור בודד. */
export function isOngoingClassRegistration(row: RegistrationRow) {
  return Boolean(row.class_id && row.parent_id && !row.is_trial && !row.session_id);
}

export async function closeProspectsForRegistration(input: {
  classId: string;
  parentId: string;
  childIds: Array<string | null>;
}): Promise<void> {
  if (!input.classId || !isAdminClientConfigured()) return;

  try {
    const admin = createAdminClient();
    const childIds = [
      ...new Set(input.childIds.filter((id): id is string => Boolean(id))),
    ];
    const includeParent = input.childIds.some((id) => !id);

    const [{ data: prospects }, { data: children }, { data: parent }] =
      await Promise.all([
        admin
          .from("class_prospects")
          .select("id, full_name, child_name")
          .eq("class_id", input.classId)
          .neq("status", "cancelled"),
        childIds.length > 0
          ? admin.from("children").select("id, full_name").in("id", childIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
        includeParent
          ? admin
              .from("profiles")
              .select("full_name")
              .eq("id", input.parentId)
              .maybeSingle()
          : Promise.resolve({ data: null as { full_name: string } | null }),
      ]);

    const people = [
      ...(children ?? []).map((child) => ({
        childName: child.full_name,
        parentName: null as string | null,
      })),
      ...(includeParent
        ? [{ childName: null, parentName: parent?.full_name ?? null }]
        : []),
    ];
    if (people.length === 0) return;

    const ids = (prospects ?? [])
      .filter((prospect) =>
        people.some((person) => prospectMatchesRegistration(prospect, person))
      )
      .map((prospect) => prospect.id);
    if (ids.length === 0) return;

    await admin
      .from("class_prospects")
      .update({ status: "cancelled" })
      .in("id", ids);
  } catch {
    // ההרשמה עצמה כבר נשמרה. מתעניינת שלא ירדה נשארת לרשימה ואפשר להוריד אותה ידנית.
  }
}

export async function closeProspectsForEnrollments(rows: RegistrationRow[]) {
  const groups = new Map<
    string,
    { classId: string; parentId: string; childIds: Array<string | null> }
  >();

  for (const row of rows) {
    if (!isOngoingClassRegistration(row) || !row.class_id || !row.parent_id) {
      continue;
    }
    const key = `${row.class_id}:${row.parent_id}`;
    const group = groups.get(key) ?? {
      classId: row.class_id,
      parentId: row.parent_id,
      childIds: [],
    };
    group.childIds.push(row.child_id ?? null);
    groups.set(key, group);
  }

  await Promise.all(
    [...groups.values()].map((group) => closeProspectsForRegistration(group))
  );
}
