import { composeReceiptLine } from "@/lib/receipt-labels";
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
      return enrollment.programs?.title ?? "מנוי שנמחק";
    case "pool_pass":
      return enrollment.pool_passes?.title ?? "כרטיסייה שנמחקה";
    case "private_lesson":
      return enrollment.private_lessons?.title ?? "שיעור פרטי שנמחק";
  }
}

export function subjectKind(enrollment: EnrollmentSubject | null): SubjectKind {
  return enrollment?.type ?? null;
}

/**
 * שם החיוב ברשימות: מוצר ההרשמה, או בחיוב משרדי בלי הרשמה — הטקסט שעל הקבלה.
 */
export function chargeDisplaySubject(input: {
  enrollment: EnrollmentSubject | null;
  receiptDescription?: string | null;
  receiptCustomText?: string | null;
}): string {
  if (input.enrollment) return subjectLabel(input.enrollment);
  return composeReceiptLine({
    base: input.receiptDescription,
    customText: input.receiptCustomText,
    fallback: "חיוב כללי",
  });
}

/** קטגוריית חוג להכנסות — רק לחיובים מסוג חוג. */
export function subjectClassCategory(
  enrollment: EnrollmentSubject | null
): string | null {
  if (!enrollment || enrollment.type !== "class") return null;
  const category = enrollment.classes?.category?.trim();
  return category || "ללא קטגוריה";
}

export const POOL_INCOME_CATEGORY = "בריכה";
export const PRIVATE_LESSON_INCOME_CATEGORY = "שיעורים פרטיים";
export const OTHER_INCOME_CATEGORY = "אחר";

export type AssignedIncomeClass = {
  title: string;
  category?: string | null;
};

/** כרטיסייה או מנוי שאפשר לשייך לחוג, כדי שהכסף ייספר על הקטגוריה של החוג. */
export function canAssignIncomeClass(type: SubjectKind): boolean {
  return type === "pool_pass" || type === "program";
}

/** קטגוריית חוג שנבחרה ידנית. בלי קטגוריה נשאר שם החוג, כדי שהסכום לא ייבלע ב«בריכה». */
export function assignedClassIncomeCategory(assigned: AssignedIncomeClass): string {
  const category = assigned.category?.trim();
  if (category) return category;
  const title = assigned.title.trim();
  return title || "ללא קטגוריה";
}

/** קטגוריית ההכנסה לסיכום בעמוד הכספים, בלי פירוט הפריט. */
export function paymentIncomeCategory(
  enrollment: EnrollmentSubject | null,
  assignedClass?: AssignedIncomeClass | null
): string {
  if (
    assignedClass &&
    enrollment &&
    canAssignIncomeClass(enrollment.type)
  ) {
    return assignedClassIncomeCategory(assignedClass);
  }
  if (!enrollment) return OTHER_INCOME_CATEGORY;

  switch (enrollment.type) {
    case "class":
      return subjectClassCategory(enrollment) ?? "ללא קטגוריה";
    case "program":
    case "pool_pass":
      return POOL_INCOME_CATEGORY;
    case "private_lesson":
      return PRIVATE_LESSON_INCOME_CATEGORY;
    default: {
      const unreachable: never = enrollment.type;
      return unreachable;
    }
  }
}
