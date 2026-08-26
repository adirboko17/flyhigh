"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { PAYMENT_STATUS } from "@/lib/constants";
import { refundCardcomPayment } from "@/lib/payments/refundActions";
import type { Enums } from "@/types/database.types";
import { formatCurrency, formatDate } from "@/utils/format";

export type RefundLine = {
  id: string;
  amount: number;
  createdAt: string;
  note: string | null;
  documentNumber: string | null;
  documentUrl: string | null;
  sentToEmail: string | null;
};

export type RefundTransaction = {
  id: string;
  amount: number;
  refundedAmount: number;
  remaining: number;
  status: Enums<"payment_status">;
  paidAt: string | null;
  createdAt: string;
  cardcomReference: string | null;
  parentName: string;
  phone: string | null;
  email: string | null;
  subject: string;
  childName: string | null;
  refunds: RefundLine[];
  occurredAt: string;
};

function normalize(value: string | null) {
  return (value ?? "").toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function refundBadge(transaction: RefundTransaction): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  if (transaction.remaining <= 0) {
    return { label: "זוכה במלואו", tone: "neutral" };
  }
  if (transaction.refundedAmount > 0) {
    return { label: "זוכה חלקית", tone: "warning" };
  }
  return { label: PAYMENT_STATUS.paid.label, tone: "success" };
}

interface RefundsListProps {
  transactions: RefundTransaction[];
  monthTitle: string;
}

export function RefundsList({ transactions, monthTitle }: RefundsListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<RefundTransaction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = normalize(query);
    if (!q) return transactions;
    return transactions.filter(
      (row) =>
        normalize(row.parentName).includes(q) ||
        normalize(row.phone).includes(q) ||
        normalize(row.email).includes(q) ||
        normalize(row.childName).includes(q) ||
        normalize(row.subject).includes(q)
    );
  }, [transactions, query]);

  const totals = useMemo(() => {
    return visible.reduce(
      (acc, row) => ({
        charged: acc.charged + row.amount,
        refunded: acc.refunded + row.refundedAmount,
        remaining: acc.remaining + row.remaining,
      }),
      { charged: 0, refunded: 0, remaining: 0 }
    );
  }, [visible]);

  const current = active
    ? (transactions.find((row) => row.id === active.id) ?? active)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="עסקאות אשראי"
          value={String(visible.length)}
          icon="💳"
          tone="brand"
          hint={monthTitle}
        />
        <StatCard
          label="ניתן לזיכוי"
          value={formatCurrency(totals.remaining)}
          icon="↩️"
          tone="amber"
          hint={`${visible.filter((row) => row.remaining > 0).length} עסקאות פתוחות לזיכוי`}
        />
        <StatCard
          label="זוכה"
          value={formatCurrency(totals.refunded)}
          icon="✅"
          tone="aqua"
          hint="סכום שכבר הוחזר לכרטיס"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">
              עסקאות אשראי
            </h2>
            <p className="text-sm text-ink-400">
              רק עסקאות שנסלקו בהצלחה בקארדקום
            </p>
          </div>
          <div className="w-full sm:max-w-sm">
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם, טלפון או מייל"
              aria-label="חיפוש עסקאות"
            />
          </div>
        </div>

        {error && (
          <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {visible.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>הורה</TH>
                <TH className="hidden md:table-cell">עבור</TH>
                <TH>סכום</TH>
                <TH className="hidden sm:table-cell">סטטוס</TH>
                <TH className="hidden lg:table-cell">תאריך</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {visible.map((row) => {
                const badge = refundBadge(row);
                return (
                  <TR key={row.id}>
                    <TD>
                      <p className="max-w-[10rem] truncate font-semibold text-ink-900 sm:max-w-none">
                        {row.parentName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400" dir="ltr">
                        {row.phone || row.email || "—"}
                      </p>
                    </TD>
                    <TD className="hidden max-w-[14rem] truncate text-ink-600 md:table-cell">
                      {row.subject}
                      {row.childName ? ` · ${row.childName}` : ""}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <p className="font-medium">{formatCurrency(row.amount)}</p>
                      {row.refundedAmount > 0 && (
                        <p className="text-xs text-ink-400">
                          זוכה {formatCurrency(row.refundedAmount)}
                          {row.remaining > 0
                            ? ` · נותר ${formatCurrency(row.remaining)}`
                            : ""}
                        </p>
                      )}
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </TD>
                    <TD className="hidden whitespace-nowrap text-ink-500 lg:table-cell">
                      {formatDate(row.paidAt ?? row.createdAt)}
                    </TD>
                    <TD className="text-end">
                      <Button
                        type="button"
                        size="sm"
                        variant={row.remaining > 0 ? "primary" : "outline"}
                        disabled={busyId !== null}
                        onClick={() => {
                          setError(null);
                          setActive(row);
                        }}
                      >
                        {row.remaining > 0 ? "זיכוי" : "היסטוריה"}
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            title={
              query
                ? "אין תוצאות לחיפוש"
                : "אין עסקאות אשראי שנסלקו בחודש זה"
            }
            description={
              query
                ? "נסו שם, מספר טלפון או כתובת מייל אחרים."
                : "עסקאות יופיעו כאן אחרי שהלקוח סיים לשלם בהצלחה בדף קארדקום."
            }
            icon="💳"
            className="rounded-none border-0 bg-transparent"
          />
        )}
      </Card>

      {current && (
        <RefundDialog
          transaction={current}
          busy={busyId !== null}
          onClose={() => setActive(null)}
          onBusy={setBusyId}
          onError={setError}
          onDone={() => {
            setActive(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RefundDialog({
  transaction,
  busy,
  onClose,
  onBusy,
  onError,
  onDone,
}: {
  transaction: RefundTransaction;
  busy: boolean;
  onClose: () => void;
  onBusy: (id: string | null) => void;
  onError: (message: string | null) => void;
  onDone: () => void;
}) {
  const canRefund = transaction.remaining > 0;
  const [amount, setAmount] = useState(String(transaction.remaining));
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(fullRemaining: boolean) {
    const value = fullRemaining ? transaction.remaining : Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setLocalError("נא להזין סכום זיכוי חיובי.");
      return;
    }
    if (value > transaction.remaining) {
      setLocalError(
        `לא ניתן לזכות יותר מהיתרה (${formatCurrency(transaction.remaining)}).`
      );
      return;
    }

    setLocalError(null);
    onError(null);
    onBusy(transaction.id);
    const result = await refundCardcomPayment({
      paymentId: transaction.id,
      amount: value,
      note: note.trim() || null,
    });
    onBusy(null);

    if (!result.success) {
      const message = result.error ?? "הזיכוי נכשל. נסו שוב.";
      setLocalError(message);
      onError(message);
      return;
    }
    if (result.warning) {
      onError(result.warning);
    }
    onDone();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={canRefund ? "זיכוי לכרטיס אשראי" : "היסטוריית זיכויים"}
      description={`${transaction.parentName} · ${transaction.subject}`}
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-500">סכום העסקה</span>
            <span className="font-semibold text-ink-900">
              {formatCurrency(transaction.amount)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-ink-500">כבר זוכה</span>
            <span className="font-semibold text-ink-900">
              {formatCurrency(transaction.refundedAmount)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-ink-500">יתרה לזיכוי</span>
            <span className="font-display font-bold text-ink-900">
              {formatCurrency(transaction.remaining)}
            </span>
          </div>
        </div>

        {canRefund && (
          <div className="rounded-2xl border border-ink-100 px-4 py-3 text-sm">
            <p className="text-xs text-ink-500">חשבונית זיכוי והחזר כספים תישלח לאימייל</p>
            {transaction.email ? (
              <p dir="ltr" className="mt-0.5 text-right font-semibold text-ink-900">
                {transaction.email}
              </p>
            ) : (
              <p className="mt-0.5 font-medium text-amber-700">
                אין אימייל בחשבון הלקוח — המסמך יופק בלי שליחה
              </p>
            )}
          </div>
        )}

        {canRefund && (
          <>
            <Field
              label="סכום לזיכוי"
              htmlFor="refund-amount"
              hint="ניתן לזכות חלקית או את כל היתרה. זיכוי מלא מבטל את ההרשמה לחוג או למסלול ומפנה את המקום. הכסף חוזר לכרטיס, ותופק חשבונית זיכוי."
            >
              <Input
                id="refund-amount"
                type="number"
                min={0.01}
                max={transaction.remaining}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={busy}
              />
            </Field>
            <Field label="הערה (לא חובה)" htmlFor="refund-note">
              <Input
                id="refund-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="למשל: ביטול הרשמה"
                disabled={busy}
              />
            </Field>
          </>
        )}

        {transaction.refunds.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-800">
              זיכויים קודמים
            </p>
            <ul className="space-y-2">
              {transaction.refunds.map((refund) => (
                <li
                  key={refund.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink-900">
                      {formatCurrency(refund.amount)}
                    </p>
                    {refund.note && (
                      <p className="text-xs text-ink-400">{refund.note}</p>
                    )}
                    {refund.documentNumber && (
                      <p className="text-xs text-ink-500">
                        חשבונית זיכוי והחזר כספים {refund.documentNumber}
                        {refund.sentToEmail ? ` · נשלח ל־${refund.sentToEmail}` : ""}
                      </p>
                    )}
                    {refund.documentUrl && (
                      <a
                        href={refund.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        צפייה במסמך
                      </a>
                    )}
                  </div>
                  <p className="whitespace-nowrap text-xs text-ink-400">
                    {formatDate(refund.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {localError && (
          <p className="text-sm font-medium text-red-600">{localError}</p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            סגירה
          </Button>
          {canRefund && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void submit(false)}
              >
                זיכוי חלקי
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                זיכוי מלא של היתרה
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
