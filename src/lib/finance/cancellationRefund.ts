import { isElapsedClassSession } from "@/lib/finance/proratedClassPrice";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export type CancellationRefundPlan = {
  amount: number;
  remainingNow: number;
  remainingAtJoin: number;
  billableCount: number;
  note: string;
};

export function proratedRefundAmount(input: {
  paidRemaining: number;
  remainingAtJoin: number;
  remainingNow: number;
}): number {
  if (input.paidRemaining <= 0) return 0;
  if (input.remainingAtJoin <= 0) return 0;
  if (input.remainingNow >= input.remainingAtJoin) return round2(input.paidRemaining);
  if (input.remainingNow <= 0) return 0;
  return round2(
    (input.paidRemaining * input.remainingNow) / input.remainingAtJoin
  );
}

export function planClassCancellationRefund(input: {
  paidRemaining: number;
  sessions: { session_date: string; start_time?: string | null; status: string }[];
  joinedOn: string;
  today: string;
}): CancellationRefundPlan | null {
  const paidRemaining = round2(Math.max(0, input.paidRemaining));
  if (paidRemaining <= 0) return null;

  const billable = input.sessions.filter((session) => session.status !== "cancelled");
  if (billable.length === 0) {
    return {
      amount: paidRemaining,
      remainingNow: 0,
      remainingAtJoin: 0,
      billableCount: 0,
      note: "הסרה מחוג · זיכוי מלא",
    };
  }

  const remainingAtJoin = billable.filter(
    (session) => !isElapsedClassSession(session, input.joinedOn)
  ).length;
  const remainingNow = billable.filter(
    (session) => !isElapsedClassSession(session, input.today)
  ).length;
  const amount = proratedRefundAmount({
    paidRemaining,
    remainingAtJoin,
    remainingNow,
  });
  if (amount <= 0) return null;

  const attended = Math.max(0, remainingAtJoin - remainingNow);
  const note =
    remainingAtJoin > 0 && remainingNow < remainingAtJoin
      ? `הסרה מחוג · זיכוי יחסי (${remainingNow} מפגשים נותרים מתוך ${remainingAtJoin}, ${attended} כבר התקיימו)`
      : "הסרה מחוג · זיכוי מלא";

  return {
    amount,
    remainingNow,
    remainingAtJoin,
    billableCount: billable.length,
    note,
  };
}
