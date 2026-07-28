import type { Enums } from "@/types/database.types";

/** ההרשמה כפי שהיא נשלפת יחד עם חיוב, לצורך תיאור "על מה שילמו". */
export type EnrollmentSubject = {
  type: Enums<"enrollment_type">;
  classes: { title: string } | null;
  programs: { title: string } | null;
  pool_passes: { title: string } | null;
};

export type SubjectKind = Enums<"enrollment_type"> | null;

/** תיאור קריא של מה שנרכש — שם החוג, המסלול או הכרטיסייה. */
export function subjectLabel(enrollment: EnrollmentSubject | null): string {
  if (!enrollment) return "חיוב כללי";

  switch (enrollment.type) {
    case "class":
      return enrollment.classes?.title ?? "חוג שנמחק";
    case "program":
      return enrollment.programs?.title ?? "מסלול שנמחק";
    case "pool_pass":
      return enrollment.pool_passes?.title ?? "כרטיסייה שנמחקה";
  }
}

export function subjectKind(enrollment: EnrollmentSubject | null): SubjectKind {
  return enrollment?.type ?? null;
}
