/**
 * פריסת אשראי בדף קארדקום.
 * מספר התשלומים נפרד מתמחור החוג: חוג במחיר לתקופה (שחייה) עדיין נפרס.
 */

import type { ProgramKind } from "@/lib/programs";

type PlanKind = "program" | "pool_pass" | "private_lesson";

export type InstallmentOptions = {
  min: number;
  max: number;
  selected: number;
};

const MEMBERSHIP_INSTALLMENTS = 6;
const POOL_RENTAL_INSTALLMENTS = 6;
const MULTI_ENTRY_PASS_INSTALLMENTS = 3;

export function installmentOptions(
  max?: number | null
): InstallmentOptions | null {
  const n = Math.floor(Number(max));
  if (!Number.isFinite(n) || n < 2 || n > 12) return null;
  return { min: 1, max: n, selected: n };
}

export function planInstallmentsMax(input: {
  kind: PlanKind;
  programKind?: ProgramKind | null;
  title?: string | null;
  entriesCount?: number | null;
  extraHalfHourPrice?: number | null;
}): number | null {
  if (input.kind === "private_lesson") return null;

  if (input.kind === "pool_pass") {
    const entries = Math.floor(Number(input.entriesCount));
    return Number.isFinite(entries) && entries >= 10
      ? MULTI_ENTRY_PASS_INSTALLMENTS
      : null;
  }

  if (input.kind === "program") {
    if (input.programKind === "membership") return MEMBERSHIP_INSTALLMENTS;
    if (isPoolRental(input.title, input.extraHalfHourPrice)) {
      return POOL_RENTAL_INSTALLMENTS;
    }
    return null;
  }

  return null;
}

export function planInstallmentOptions(input: {
  kind: PlanKind;
  programKind?: ProgramKind | null;
  title?: string | null;
  entriesCount?: number | null;
  extraHalfHourPrice?: number | null;
}) {
  return installmentOptions(planInstallmentsMax(input));
}

function isPoolRental(
  title?: string | null,
  extraHalfHourPrice?: number | null
) {
  if (extraHalfHourPrice != null && Number(extraHalfHourPrice) > 0) return true;
  return (title ?? "").includes("השכרת");
}
