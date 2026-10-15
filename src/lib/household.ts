export type HouseholdRelationship = "child" | "partner";

export function isPartnerRelationship(
  value: string | null | undefined,
): value is "partner" {
  return value === "partner";
}

/** בן או בת הזוג הם תמיד המגדר ההפוך — זוג הוא גבר ואישה. */
export function oppositeAdultGender(
  gender: string | null | undefined,
): "male" | "female" | null {
  if (gender === "male") return "female";
  if (gender === "female") return "male";
  return null;
}

export function coupleGenderError(
  accountGender: string | null | undefined,
  partnerGender: string | null | undefined,
): string | null {
  const opposite = oppositeAdultGender(accountGender);
  if (!opposite) {
    return "רישום כזוג מיועד לגבר ואישה. בחרו מגדר זכר או נקבה לבעל או בעלת החשבון.";
  }
  if (partnerGender !== opposite) {
    return opposite === "female"
      ? "בן או בת הזוג צריכה להיות אישה."
      : "בן או בת הזוג צריך להיות גבר.";
  }
  return null;
}

export function partnerRoleLabel(gender: string | null | undefined): string {
  if (gender === "female") return "אישה";
  if (gender === "male") return "בעל";
  return "בן/בת זוג";
}
