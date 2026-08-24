"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/icons/Icon";
import {
  addPaymentReceipt,
  deletePaymentReceipt,
  settleChargeRemaining,
  settleParentCharges,
} from "@/lib/collections/actions";
import {
  DEFERRED_PAYMENT_METHODS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  type DeferredPaymentMethod,
} from "@/lib/constants";
import type { Enums } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";

export type CollectionReceipt = {
  id: string;
  amount: number;
  receivedAt: string;
  note: string | null;
};

export type CollectionCharge = {
  id: string;
  amount: number;
  amountPaid: number;
  remaining: number;
  method: DeferredPaymentMethod;
  status: Enums<"payment_status">;
  paidAt: string | null;
  createdAt: string;
  childName: string | null;
  /** על מה החיוב — שם החוג, המסלול או הכרטיסייה. */
  subject: string;
  subjectType: "class" | "program" | "pool_pass" | "private_lesson" | null;
  enrollmentCancelled: boolean;
  receipts: CollectionReceipt[];
};

export type CollectionParent = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  charges: CollectionCharge[];
  openAmount: number;
  paidAmount: number;
};

type StatusFilter = "open" | "paid" | "all";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "open", label: "חובות פתוחים" },
  { id: "paid", label: "שולמו" },
  { id: "all", label: "הכל" },
];

function isOpen(charge: CollectionCharge) {
  return charge.remaining > 0;
}

function chargeStatusBadge(charge: CollectionCharge) {
  if (charge.remaining <= 0) return PAYMENT_STATUS.paid;
  if (charge.amountPaid > 0) return PAYMENT_STATUS.partial;
  return PAYMENT_STATUS.pending;
}

function normalize(value: string | null) {
  return (value ?? "").toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function todayDateInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

interface CollectionsListProps {
  parents: CollectionParent[];
}

export function CollectionsList({ parents }: CollectionsListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [methodFilter, setMethodFilter] = useState<DeferredPaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeCharge, setActiveCharge] = useState<CollectionCharge | null>(null);
  const [isPending, startTransition] = useTransition();

  const totals = useMemo(() => {
    const allCharges = parents.flatMap((parent) => parent.charges);
    return {
      openAmount: parents.reduce((sum, parent) => sum + parent.openAmount, 0),
      paidAmount: parents.reduce((sum, parent) => sum + parent.paidAmount, 0),
      debtorCount: parents.filter((parent) => parent.openAmount > 0).length,
      openCount: allCharges.filter(isOpen).length,
    };
  }, [parents]);

  const visibleParents = useMemo(() => {
    const q = normalize(query);

    return parents
      .map((parent) => {
        const parentMatches =
          q === "" ||
          normalize(parent.name).includes(q) ||
          normalize(parent.phone).includes(q) ||
          normalize(parent.email).includes(q);

        const charges = parent.charges.filter((charge) => {
          if (statusFilter === "open" && !isOpen(charge)) return false;
          if (statusFilter === "paid" && isOpen(charge)) return false;
          if (methodFilter.length > 0 && !methodFilter.includes(charge.method)) {
            return false;
          }
          if (q === "") return true;
          return (
            parentMatches ||
            normalize(charge.childName).includes(q) ||
            normalize(charge.subject).includes(q)
          );
        });

        return { ...parent, charges };
      })
      .filter((parent) => parent.charges.length > 0);
  }, [parents, query, statusFilter, methodFilter]);

  // אחרי refresh — מעדכנים את החלון עם הנתונים החדשים של אותו חיוב.
  useEffect(() => {
    const chargeId = activeCharge?.id;
    if (!chargeId) return;
    const next = parents
      .flatMap((parent) => parent.charges)
      .find((charge) => charge.id === chargeId);
    if (next) setActiveCharge(next);
  }, [parents, activeCharge?.id]);

  function runAction(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setError(null);
    setBusyId(key);
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (!result.success) {
        setError(result.error ?? "הפעולה נכשלה. נסו שוב.");
        return;
      }
      router.refresh();
    });
  }

  function toggleMethod(method: DeferredPaymentMethod) {
    setMethodFilter((current) =>
      current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method]
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-brand-gradient px-5 py-4 text-white">
          <p className="text-xs font-medium text-white/70">
            תשלומים שנגבים מול המשרד — מזומן, העברה בנקאית, מכבי ועמית
          </p>
          <h1 className="font-display text-2xl font-bold leading-tight">גבייה</h1>
        </div>

        <div className="grid grid-cols-2 gap-px bg-ink-100 lg:grid-cols-4">
          <StatTile
            label="סך חוב פתוח"
            value={formatCurrency(totals.openAmount)}
            tone={totals.openAmount > 0 ? "danger" : "muted"}
          />
          <StatTile label="לקוחות חייבים" value={totals.debtorCount} />
          <StatTile label="חיובים פתוחים" value={totals.openCount} />
          <StatTile
            label="נגבה"
            value={formatCurrency(totals.paidAmount)}
            tone="success"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם הורה, אימייל, טלפון, ילד/ה או חוג..."
                className="h-12 border-ink-100 bg-ink-50/50 ps-11 shadow-soft focus:bg-white"
                aria-label="חיפוש ברשימת הגבייה"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-ink-100 p-1 sm:flex-nowrap sm:rounded-full">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  aria-pressed={statusFilter === filter.id}
                  className={cn(
                    "flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-4",
                    statusFilter === filter.id
                      ? "bg-white text-brand-700 shadow-soft"
                      : "text-ink-500 hover:text-ink-800"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {DEFERRED_PAYMENT_METHODS.map((method) => {
              const active = methodFilter.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => toggleMethod(method)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800"
                  )}
                >
                  {PAYMENT_METHOD[method]}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}

      {parents.length === 0 ? (
        <EmptyState
          title="אין עדיין חיובים לגבייה"
          description="הרשמות שמשולמות במזומן, בהעברה בנקאית, במכבי או בעמית יופיעו כאן אוטומטית."
        />
      ) : visibleParents.length === 0 ? (
        <EmptyState
          title="לא נמצאו תוצאות"
          description="נסו לשנות את הסינון או את מונח החיפוש."
        />
      ) : (
        <div className="space-y-4">
          {visibleParents.map((parent) => (
            <ParentCard
              key={parent.id}
              parent={parent}
              busyId={busyId}
              disabled={isPending}
              onOpenCharge={setActiveCharge}
              onSettleAll={() =>
                runAction(`parent:${parent.id}`, () =>
                  settleParentCharges({ parentId: parent.id })
                )
              }
            />
          ))}
        </div>
      )}

      {activeCharge && (
        <ChargeReceiptDialog
          charge={activeCharge}
          customerEmail={
            parents.find((parent) =>
              parent.charges.some((charge) => charge.id === activeCharge.id)
            )?.email ?? null
          }
          busyId={busyId}
          disabled={isPending}
          onClose={() => setActiveCharge(null)}
          onError={setError}
          onBusy={setBusyId}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

function ParentCard({
  parent,
  busyId,
  disabled,
  onOpenCharge,
  onSettleAll,
}: {
  parent: CollectionParent;
  busyId: string | null;
  disabled: boolean;
  onOpenCharge: (charge: CollectionCharge) => void;
  onSettleAll: () => void;
}) {
  const openCharges = parent.charges.filter(isOpen);
  const hasDebt = parent.openAmount > 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={parent.name} />
          <div className="min-w-0">
            <p className="truncate font-display font-bold text-ink-900">
              {parent.name}
            </p>
            {parent.email ? (
              <a
                href={`mailto:${parent.email}`}
                dir="ltr"
                className="block truncate text-right text-xs text-ink-500 transition-colors hover:text-brand-600"
              >
                {parent.email}
              </a>
            ) : (
              <p className="text-xs text-ink-400">אין אימייל לשליחת קבלה</p>
            )}
            {parent.phone ? (
              <a
                href={`tel:${parent.phone}`}
                dir="ltr"
                className="block text-right text-xs text-ink-500 transition-colors hover:text-brand-600"
              >
                {parent.phone}
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:gap-4">
          <div className="text-end">
            <p className="text-xs text-ink-500">
              {hasDebt ? "חוב פתוח" : "אין חוב פתוח"}
            </p>
            <p
              className={cn(
                "font-display text-xl font-bold tabular-nums",
                hasDebt ? "text-red-600" : "text-aqua-600"
              )}
            >
              {formatCurrency(parent.openAmount)}
            </p>
          </div>
          {openCharges.length > 1 && (
            <Button
              type="button"
              size="sm"
              className="ms-auto sm:ms-0"
              disabled={disabled}
              onClick={onSettleAll}
            >
              {busyId === `parent:${parent.id}`
                ? "סוגר..."
                : "סגירת כל היתרות"}
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-ink-100">
        {parent.charges.map((charge) => (
          <ChargeRow
            key={charge.id}
            charge={charge}
            disabled={disabled}
            onOpen={() => onOpenCharge(charge)}
          />
        ))}
      </ul>
    </Card>
  );
}

function ChargeRow({
  charge,
  disabled,
  onOpen,
}: {
  charge: CollectionCharge;
  disabled: boolean;
  onOpen: () => void;
}) {
  const open = isOpen(charge);
  const status = chargeStatusBadge(charge);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5">
      <div className="w-full min-w-0 sm:flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PaymentMethodBadge method={charge.method} />
          {charge.childName ? (
            <Badge tone="brand" className="gap-1.5 text-sm">
              <Icon name="child" size={14} className="shrink-0 opacity-80" />
              {charge.childName}
            </Badge>
          ) : (
            <Badge tone="neutral" className="gap-1.5 text-sm">
              <Icon name="user" size={14} className="shrink-0 opacity-80" />
              עבור ההורה
            </Badge>
          )}
          {charge.enrollmentCancelled && (
            <Badge tone="warning">ההרשמה בוטלה</Badge>
          )}
        </div>

        <p className="mt-2 break-words font-medium text-ink-900">
          {charge.subject}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          נרשם {formatDate(charge.createdAt)}
          {charge.receipts.length > 0 &&
            ` · ${charge.receipts.length} תקבולים`}
        </p>
      </div>

      <div className="min-w-[7.5rem] text-end">
        <p className="font-display text-lg font-bold tabular-nums text-ink-900">
          {formatCurrency(charge.amount)}
        </p>
        {open ? (
          <p className="text-xs text-ink-500">
            שולם {formatCurrency(charge.amountPaid)} · נותר{" "}
            <span className="font-semibold text-red-600">
              {formatCurrency(charge.remaining)}
            </span>
          </p>
        ) : (
          <p className="text-xs text-aqua-700">שולם במלואו</p>
        )}
      </div>

      <Badge tone={status.tone}>{status.label}</Badge>

      <Button
        type="button"
        size="sm"
        variant={open ? "primary" : "outline"}
        className="ms-auto"
        disabled={disabled}
        onClick={onOpen}
      >
        {open ? "רישום תקבול" : "היסטוריה"}
      </Button>
    </li>
  );
}

function ChargeReceiptDialog({
  charge,
  customerEmail,
  busyId,
  disabled,
  onClose,
  onError,
  onBusy,
  onDone,
}: {
  charge: CollectionCharge;
  customerEmail: string | null;
  busyId: string | null;
  disabled: boolean;
  onClose: () => void;
  onError: (message: string | null) => void;
  onBusy: (id: string | null) => void;
  onDone: () => void;
}) {
  const open = isOpen(charge);
  const [amount, setAmount] = useState(
    open ? String(charge.remaining) : ""
  );
  const [receivedDate, setReceivedDate] = useState(todayDateInput());
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(open ? String(charge.remaining) : "");
    setReceivedDate(todayDateInput());
    setNote("");
    setLocalError(null);
  }, [charge.id, charge.remaining, open]);

  const busy = disabled || busyId !== null;

  function run(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setLocalError(null);
    onError(null);
    onBusy(key);
    void (async () => {
      const result = await action();
      onBusy(null);
      if (!result.success) {
        const message = result.error ?? "הפעולה נכשלה. נסו שוב.";
        setLocalError(message);
        onError(message);
        return;
      }
      onDone();
    })();
  }

  function submitReceipt(fullRemaining: boolean) {
    if (!open) return;
    const value = fullRemaining ? charge.remaining : Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setLocalError("נא להזין סכום תקבול חיובי.");
      return;
    }
    if (value > charge.remaining) {
      setLocalError(
        `לא ניתן לרשום יותר מהיתרה (${formatCurrency(charge.remaining)}).`
      );
      return;
    }

    if (fullRemaining) {
      run(`settle:${charge.id}`, () =>
        settleChargeRemaining({
          paymentId: charge.id,
          receivedAt: `${receivedDate}T12:00:00`,
        })
      );
      return;
    }

    run(`add:${charge.id}`, () =>
      addPaymentReceipt({
        paymentId: charge.id,
        amount: value,
        receivedAt: `${receivedDate}T12:00:00`,
        note: note.trim() || null,
      })
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={open ? "רישום תקבול" : "היסטוריית תקבולים"}
      description={`${charge.subject}${charge.childName ? ` · ${charge.childName}` : ""}`}
      className="max-w-lg"
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
          <p className="text-xs text-ink-500">הקבלה תישלח לאימייל</p>
          {customerEmail ? (
            <p dir="ltr" className="mt-0.5 text-right font-semibold text-ink-900">
              {customerEmail}
            </p>
          ) : (
            <p className="mt-0.5 font-medium text-amber-700">
              אין אימייל בחשבון הלקוח — המסמך יופק בלי שליחה
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink-50 p-3 text-center">
          <div>
            <p className="text-xs text-ink-500">סכום חיוב</p>
            <p className="font-display text-base font-bold tabular-nums text-ink-900">
              {formatCurrency(charge.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-500">שולם</p>
            <p className="font-display text-base font-bold tabular-nums text-aqua-700">
              {formatCurrency(charge.amountPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-500">נותר</p>
            <p
              className={cn(
                "font-display text-base font-bold tabular-nums",
                open ? "text-red-600" : "text-aqua-700"
              )}
            >
              {formatCurrency(charge.remaining)}
            </p>
          </div>
        </div>

        {open && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="סכום שהתקבל (₪)" required>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  max={charge.remaining}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                  required
                />
              </Field>
              <Field label="תאריך קבלה" required>
                <Input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  disabled={busy}
                  required
                />
              </Field>
            </div>
            <Field label="הערה (אופציונלי)">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="למשל: מזומן במשרד"
                disabled={busy}
              />
            </Field>
            <p className="text-xs leading-relaxed text-ink-500">
              עם הרישום תופק חשבונית מס-קבלה בקארדקום על הסכום (לא אשראי),
              תישלח למייל הלקוח, ותישלח התראה גם אליכם.
            </p>

            {localError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {localError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() => submitReceipt(false)}
              >
                {busyId === `add:${charge.id}` ? "רושם..." : "רישום תקבול"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => submitReceipt(true)}
              >
                {busyId === `settle:${charge.id}`
                  ? "סוגר..."
                  : `סגירת יתרה (${formatCurrency(charge.remaining)})`}
              </Button>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-800">
            היסטוריית תקבולים
          </h3>
          {charge.receipts.length === 0 ? (
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">
              עדיין לא נרשמו תקבולים לחיוב זה.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
              {charge.receipts.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums text-ink-900">
                      {formatCurrency(receipt.amount)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatDate(receipt.receivedAt)}
                      {receipt.note ? ` · ${receipt.note}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(`del:${receipt.id}`, () =>
                        deletePaymentReceipt({ receiptId: receipt.id })
                      )
                    }
                  >
                    {busyId === `del:${receipt.id}` ? "מוחק..." : "מחק"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

const METHOD_BADGE: Record<
  DeferredPaymentMethod,
  { tone: "warning" | "info" | "brand" | "success"; ring: string }
> = {
  cash: { tone: "warning", ring: "ring-amber-200" },
  bank_transfer: { tone: "info", ring: "ring-sky-200" },
  maccabi: { tone: "brand", ring: "ring-brand-200" },
  amit: { tone: "success", ring: "ring-aqua-200" },
};

function PaymentMethodBadge({ method }: { method: DeferredPaymentMethod }) {
  const style = METHOD_BADGE[method];

  return (
    <Badge
      tone={style.tone}
      className={cn(
        "px-3 py-1 text-sm font-bold ring-1 ring-inset",
        style.ring
      )}
    >
      {PAYMENT_METHOD[method]}
    </Badge>
  );
}

function StatTile({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  tone?: "muted" | "danger" | "success";
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-display text-2xl font-bold tabular-nums",
          tone === "danger" && "text-red-600",
          tone === "success" && "text-aqua-600",
          tone === "muted" && "text-ink-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
