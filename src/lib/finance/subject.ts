import type { Enums } from "@/types/database.types";

/** ההרשמה כפי שהיא נשלפת יחד עם חיוב, לצורך תיאור "על מה שילמו". */
export type EnrollmentSubject = {
  type: Enums<"enrollment_type">;
  classes: { title: string; category?: string | null } | null;
  programs: { title: string } | null;
  pool_passes: { title: string } | null;
  private_lessons?: { title: string } | null;
};

export type SubjectKind = Enums<"enrollment_type"> | null;

/** תוויות קצרות לפילוח כספים לפי סוג מוצר. */
export const SUBJECT_KIND_LABEL: Record<Enums<"enrollment_type">, string> = {
  class: "חוגים",
  program: "מנויים",
  pool_pass: "כרטיסיות",
  private_lesson: "שיעורים פרטיים",
};

/** תיאור קריא של מה שנרכש — שם החוג, המסלול, הכרטיסייה או השיעור הפרטי. */
export function subjectLabel(enrollment: EnrollmentSubject | null): string {
  if (!enrollment) return "חיוב כללי";

  switch (enrollment.type) {
    case "class":
      return enrollment.classes?.title ?? "חוג שנמחק";
    case "program":
      return enrollment.programs?.title ?? "מסלול שנמחק";
    case "pool_pass":
      return enrollment.pool_passes?.title ?? "כרטיסייה שנמחקה";
    case "private_lesson":
      return enrollment.private_lessons?.title ?? "שיעור פרטי שנמחק";
  }
}

export function subjectKind(enrollment: EnrollmentSubject | null): SubjectKind {
  return enrollment?.type ?? null;
}

/** קטגוריית חוג להכנסות — רק לחיובים מסוג חוג. */
export function subjectClassCategory(
  enrollment: EnrollmentSubject | null
): string | null {
  if (!enrollment || enrollment.type !== "class") return null;
  const category = enrollment.classes?.category?.trim();
  return category || "ללא קטגוריה";
}
