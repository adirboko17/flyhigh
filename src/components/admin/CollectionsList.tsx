"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/icons/Icon";
import {
  addPaymentReceipt,
  approveCollectionPassCharge,
  deleteCollectionCharge,
  deletePaymentReceipt,
  reopenCollectionCharge,
  splitCollectionCharge,
  settleChargeRemaining,
  settleParentCharges,
  startCollectionCardcomCheckout,
  updateCollectionChargeAmount,
  updateCollectionPaymentMethod,
  updatePaymentReceiptCustomText,
  updatePaymentReceiptLabel,
} from "@/lib/collections/actions";
import {
  composeReceiptLine,
  type ReceiptLabelOption,
} from "@/lib/receipt-labels";
import {
  PaymentSplitEditor,
  emptySplitDrafts,
  type PaymentSplitDraft,
} from "@/components/admin/PaymentSplitEditor";
import {
  COLLECTION_PAYMENT_METHODS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  isManualReceiptMethod,
  isReceiptlessCollectionMethod,
  type CollectionPaymentMethod,
  type ReceiptlessCollectionMethod,
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
  method: CollectionPaymentMethod;
  status: Enums<"payment_status">;
  paidAt: string | null;
  createdAt: string;
  childName: string | null;
  /** על מה החיוב — שם החוג, המסלול או הכרטיסייה. */
  subject: string;
  subjectType: "class" | "program" | "pool_pass" | "private_lesson" | null;
  enrollmentCancelled: boolean;
  /** תווית קבלה שנבחרה — null אם נשאר שם המוצר כרגיל. */
  receiptLabelId: string | null;
  receiptLabel: string | null;
  receiptDescription: string | null;
  receiptCustomText: string | null;
  receipts: CollectionReceipt[];
};

export type CollectionParent = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  adminNote: string | null;
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

function openCheckoutTab() {
  const tab = window.open("about:blank", "cardcom-checkout");
  if (!tab) return null;
  try {
    tab.document.write(
      `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>סליקה</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#334155">פותחים את דף הסליקה...</body></html>`
    );
    tab.document.close();
  } catch {
    // אם אי אפשר לכתוב לכרטיסייה — עדיין ננווט אליה בהמשך.
  }
  return tab;
}

function goToCheckout(url: string, tab: Window | null) {
  if (tab && !tab.closed) {
    tab.location.replace(url);
    return true;
  }
  window.location.assign(url);
  return false;
}

function isOpen(charge: CollectionCharge) {
  return charge.remaining > 0;
}

function canRemoveCharge(charge: CollectionCharge) {
  return charge.receipts.length === 0 && isOpen(charge);
}

function chargeStatusBadge(charge: CollectionCharge) {
  if (charge.remaining <= 0) return PAYMENT_STATUS.paid;
  if (charge.amountPaid > 0) return PAYMENT_STATUS.partial;
  return PAYMENT_STATUS.pending;
}

function normalize(value: string | null) {
  return (value ?? "").toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function receiptPreview(charge: CollectionCharge) {
  return composeReceiptLine({
    base: charge.receiptDescription ?? charge.receiptLabel,
    customText: charge.receiptCustomText,
    fallback: charge.subject,
  });
}

function receiptlessCopy(method: ReceiptlessCollectionMethod) {
  if (method === "maccabi") {
    return {
      openTitle: "אישור תשלום ממכבי",
      closedTitle: "תשלום ממכבי",
      hint: "האישור מסמן שהכסף התקבל ממכבי ומעביר את החיוב ל״שולם״. לא מופקת קבלה — הלקוח מקבל אותה ישירות ממכבי.",
      paidNote: "אושר שהכסף התקבל ממכבי. לא הופקה קבלה או חשבונית.",
    };
  }
  if (method === "amit") {
    return {
      openTitle: "אישור תשלום מעמית",
      closedTitle: "תשלום מעמית",
      hint: "האישור מסמן שהכסף התקבל מעמית ומעביר את החיוב ל״שולם״. לא מופקת קבלה — הלקוח מקבל אותה ישירות מעמית.",
      paidNote: "אושר שהכסף התקבל מעמית. לא הופקה קבלה או חשבונית.",
    };
  }
  return {
    openTitle: "אישור תשלום בכרטיסייה",
    closedTitle: "תשלום בכרטיסייה",
    hint: "האישור מסמן שהלקוח שילם בכרטיסייה ומעביר את החיוב ל״שולם״. לא מופקת קבלה, חשבונית או תקבול.",
    paidNote: "אושר תשלום בכרטיסייה. לא הופקה קבלה או חשבונית.",
  };
}

function todayDateInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

interface CollectionsListProps {
  parents: CollectionParent[];
  receiptLabels: ReceiptLabelOption[];
}

export function CollectionsList({
  parents,
  receiptLabels,
}: CollectionsListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [methodFilter, setMethodFilter] = useState<CollectionPaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeCharge, setActiveCharge] = useState<CollectionCharge | null>(null);
  const [noteParent, setNoteParent] = useState<CollectionParent | null>(null);
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
          normalize(parent.email).includes(q) ||
          normalize(parent.adminNote).includes(q);

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
            normalize(charge.subject).includes(q) ||
            normalize(charge.receiptLabel).includes(q) ||
            normalize(charge.receiptCustomText).includes(q)
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
    setActiveCharge(next ?? null);
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
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function toggleMethod(method: CollectionPaymentMethod) {
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
            תשלומים שנגבים מול המשרד — מזומן, העברה, מכבי, עמית, פייבוקס, כרטיסייה, או אשראי במעמד הגבייה
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
            {COLLECTION_PAYMENT_METHODS.map((method) => {
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
          description="הרשמות שמשולמות במזומן, בהעברה בנקאית, במכבי או בעמית יופיעו כאן אוטומטית. אפשר לשנות אמצעי תשלום לפייבוקס, לכרטיסייה או לאשראי."
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
              receiptLabels={receiptLabels}
              busyId={busyId}
              disabled={isPending}
              onOpenCharge={setActiveCharge}
              onOpenNote={() => setNoteParent(parent)}
              onChangeLabel={(paymentId, receiptLabelId) =>
                runAction(`label:${paymentId}`, () =>
                  updatePaymentReceiptLabel({ paymentId, receiptLabelId })
                )
              }
              onChangeCustomText={(paymentId, customText) =>
                runAction(`custom:${paymentId}`, () =>
                  updatePaymentReceiptCustomText({ paymentId, customText })
                )
              }
              onChangeMethod={(paymentId, method) =>
                runAction(`method:${paymentId}`, () =>
                  updateCollectionPaymentMethod({ paymentId, method })
                )
              }
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
          receiptLabels={receiptLabels}
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
          onChangeLabel={(paymentId, receiptLabelId) =>
            runAction(`label:${paymentId}`, () =>
              updatePaymentReceiptLabel({ paymentId, receiptLabelId })
            )
          }
          onChangeCustomText={(paymentId, customText) =>
            runAction(`custom:${paymentId}`, () =>
              updatePaymentReceiptCustomText({ paymentId, customText })
            )
          }
        />
      )}

      {noteParent?.adminNote && (
        <Modal
          open
          onClose={() => setNoteParent(null)}
          title={`הערה · ${noteParent.name}`}
          description="הערת מנהל פנימית. הלקוח לא רואה את זה."
          className="max-w-lg"
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
              {noteParent.adminNote}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ParentCard({
  parent,
  receiptLabels,
  busyId,
  disabled,
  onOpenCharge,
  onOpenNote,
  onChangeLabel,
  onChangeCustomText,
  onChangeMethod,
  onSettleAll,
}: {
  parent: CollectionParent;
  receiptLabels: ReceiptLabelOption[];
  busyId: string | null;
  disabled: boolean;
  onOpenCharge: (charge: CollectionCharge) => void;
  onOpenNote: () => void;
  onChangeLabel: (paymentId: string, receiptLabelId: string | null) => void;
  onChangeCustomText: (paymentId: string, customText: string) => void;
  onChangeMethod: (paymentId: string, method: CollectionPaymentMethod) => void;
  onSettleAll: () => void;
}) {
  const openCharges = parent.charges.filter(isOpen);
  const deferredOpen = openCharges.filter((charge) =>
    isManualReceiptMethod(charge.method)
  );
  const hasDebt = parent.openAmount > 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={parent.name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display font-bold text-ink-900">
                {parent.name}
              </p>
              {parent.adminNote && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  onClick={onOpenNote}
                >
                  הערה
                </Button>
              )}
            </div>
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
          {deferredOpen.length > 1 && (
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
            receiptLabels={receiptLabels}
            disabled={disabled}
            onOpen={() => onOpenCharge(charge)}
            onChangeLabel={onChangeLabel}
            onChangeCustomText={onChangeCustomText}
            onChangeMethod={onChangeMethod}
          />
        ))}
      </ul>
    </Card>
  );
}

function ChargeRow({
  charge,
  receiptLabels,
  disabled,
  onOpen,
  onChangeLabel,
  onChangeCustomText,
  onChangeMethod,
}: {
  charge: CollectionCharge;
  receiptLabels: ReceiptLabelOption[];
  disabled: boolean;
  onOpen: () => void;
  onChangeLabel: (paymentId: string, receiptLabelId: string | null) => void;
  onChangeCustomText: (paymentId: string, customText: string) => void;
  onChangeMethod: (paymentId: string, method: CollectionPaymentMethod) => void;
}) {
  const open = isOpen(charge);
  const status = chargeStatusBadge(charge);
  const [method, setMethod] = useState(charge.method);
  const isReceiptless = isReceiptlessCollectionMethod(method);

  useEffect(() => {
    setMethod(charge.method);
  }, [charge.method]);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5">
      <div className="w-full min-w-0 sm:flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {open ? (
            <select
              value={method}
              disabled={disabled}
              aria-label="אמצעי תשלום"
              onChange={(e) => {
                const next = e.target.value as CollectionPaymentMethod;
                setMethod(next);
                onChangeMethod(charge.id, next);
              }}
              className="h-8 max-w-full cursor-pointer rounded-full border border-ink-200 bg-white px-3 text-sm font-bold text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50"
            >
              {COLLECTION_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD[method]}
                </option>
              ))}
            </select>
          ) : (
            <PaymentMethodBadge method={charge.method} />
          )}
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
          {!isReceiptless &&
            (charge.receiptLabel ? (
              <Badge tone="info" className="text-sm">
                קבלה: {charge.receiptLabel}
              </Badge>
            ) : (
              <Badge tone="neutral" className="text-sm">
                קבלה: כרגיל
              </Badge>
            ))}
          {!isReceiptless && charge.receiptCustomText && (
            <Badge tone="warning" className="text-sm">
              מותאם: {charge.receiptCustomText}
            </Badge>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <p className="min-w-0 break-words font-medium text-ink-900">
            {charge.subject}
          </p>
          {canRemoveCharge(charge) && (
            <RemoveChargeButton charge={charge} disabled={disabled} iconOnly />
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-400">
          נרשם {formatDate(charge.createdAt)}
          {charge.receipts.length > 0 &&
            ` · ${charge.receipts.length} תקבולים`}
        </p>
        {open && !isReceiptless && (
          <>
            <ReceiptLabelSelect
              charge={charge}
              labels={receiptLabels}
              disabled={disabled}
              compact
              onChange={(labelId) => onChangeLabel(charge.id, labelId)}
            />
            <ReceiptCustomTextField
              charge={charge}
              disabled={disabled}
              compact
              onSave={(text) => onChangeCustomText(charge.id, text)}
            />
          </>
        )}
      </div>

      <div className="min-w-[7.5rem] text-end">
        <EditChargeAmountButton charge={charge} disabled={disabled} />
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

      <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
        {open && (
          <SplitChargeButton charge={charge} disabled={disabled} />
        )}
        {!open && (
          <ReopenChargeButton charge={charge} disabled={disabled} />
        )}
        <Button
          type="button"
          size="sm"
          variant={open ? "primary" : "outline"}
          disabled={disabled}
          onClick={onOpen}
        >
          {open ? (isReceiptless ? "אישור" : "רישום תקבול") : "היסטוריה"}
        </Button>
      </div>
    </li>
  );
}

function ChargeReceiptDialog({
  charge,
  receiptLabels,
  customerEmail,
  busyId,
  disabled,
  onClose,
  onError,
  onBusy,
  onDone,
  onChangeLabel,
  onChangeCustomText,
}: {
  charge: CollectionCharge;
  receiptLabels: ReceiptLabelOption[];
  customerEmail: string | null;
  busyId: string | null;
  disabled: boolean;
  onClose: () => void;
  onError: (message: string | null) => void;
  onBusy: (id: string | null) => void;
  onDone: () => void;
  onChangeLabel: (paymentId: string, receiptLabelId: string | null) => void;
  onChangeCustomText: (paymentId: string, customText: string) => void;
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
  const isCard = charge.method === "credit_card";
  const receiptless = isReceiptlessCollectionMethod(charge.method)
    ? receiptlessCopy(charge.method)
    : null;
  const isReceiptless = receiptless !== null;

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

  function submitCardcom() {
    if (!open) return;
    const tab = openCheckoutTab();
    setLocalError(null);
    onError(null);
    onBusy(`cardcom:${charge.id}`);
    void (async () => {
      const result = await startCollectionCardcomCheckout({
        paymentId: charge.id,
      });
      onBusy(null);
      if (!result.success || !result.checkoutUrl) {
        try {
          tab?.close();
        } catch {
          // הכרטיסייה אולי כבר נסגרה.
        }
        const message = result.success
          ? "לא הצלחנו לפתוח את דף הסליקה."
          : (result.error ?? "לא הצלחנו לפתוח את דף הסליקה.");
        setLocalError(message);
        onError(message);
        return;
      }
      goToCheckout(result.checkoutUrl, tab);
      onDone();
      onClose();
    })();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        isReceiptless && receiptless
          ? open
            ? receiptless.openTitle
            : receiptless.closedTitle
          : open
            ? "רישום תקבול"
            : "היסטוריית תקבולים"
      }
      description={`${charge.subject}${charge.childName ? ` · ${charge.childName}` : ""}`}
      className="max-w-lg"
    >
      <div className="space-y-5">
        {!isReceiptless && (
          <>
            <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
              <p className="text-xs text-ink-500">שם על הקבלה</p>
              <p className="mt-0.5 font-semibold text-ink-900">
                {receiptPreview(charge)}
              </p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
              <p className="text-xs text-ink-500">הקבלה תישלח לאימייל</p>
              {customerEmail ? (
                <p
                  dir="ltr"
                  className="mt-0.5 text-right font-semibold text-ink-900"
                >
                  {customerEmail}
                </p>
              ) : (
                <p className="mt-0.5 font-medium text-amber-700">
                  אין אימייל בחשבון הלקוח — המסמך יופק בלי שליחה
                </p>
              )}
            </div>
          </>
        )}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink-50 p-3 text-center">
          <div>
            <p className="text-xs text-ink-500">סכום חיוב</p>
            <EditChargeAmountButton
              charge={charge}
              disabled={busy}
              compact
            />
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
            {isReceiptless && receiptless ? (
              <p className="text-sm leading-relaxed text-ink-600">
                {receiptless.hint}
              </p>
            ) : isCard ? (
              <>
                <ReceiptLabelSelect
                  charge={charge}
                  labels={receiptLabels}
                  disabled={busy}
                  onChange={(labelId) => onChangeLabel(charge.id, labelId)}
                />
                <ReceiptCustomTextField
                  charge={charge}
                  disabled={busy}
                  onSave={(text) => onChangeCustomText(charge.id, text)}
                />
                <p className="text-xs leading-relaxed text-ink-500">
                  רישום התקבול יפתח את דף הסליקה של קארדקום על היתרה
                  ({formatCurrency(charge.remaining)}) עבור הלקוח הזה.
                </p>
              </>
            ) : (
              <>
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
                <ReceiptLabelSelect
                  charge={charge}
                  labels={receiptLabels}
                  disabled={busy}
                  onChange={(labelId) => onChangeLabel(charge.id, labelId)}
                />
                <ReceiptCustomTextField
                  charge={charge}
                  disabled={busy}
                  onSave={(text) => onChangeCustomText(charge.id, text)}
                />
                <p className="text-xs leading-relaxed text-ink-500">
                  עם הרישום תופק חשבונית מס-קבלה בקארדקום כאמצעי תשלום{" "}
                  {PAYMENT_METHOD[charge.method]}, תישלח למייל הלקוח, ותישלח
                  התראה גם אליכם.
                </p>
              </>
            )}

            {localError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {localError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {isReceiptless ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(`pass:${charge.id}`, async () => {
                      const result = await approveCollectionPassCharge({
                        paymentId: charge.id,
                      });
                      if (result.success) onClose();
                      return result;
                    })
                  }
                >
                  {busyId === `pass:${charge.id}` ? "מאשר..." : "אישור"}
                </Button>
              ) : isCard ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={submitCardcom}
                >
                  {busyId === `cardcom:${charge.id}`
                    ? "פותח סליקה..."
                    : "רישום תקבול"}
                </Button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        )}

        {!isReceiptless && (
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
                  <DeleteReceiptButton
                    charge={charge}
                    receipt={receipt}
                    disabled={busy}
                    onError={onError}
                    onDone={onDone}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        {isReceiptless && receiptless && !open && (
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
            {receiptless.paidNote}
          </p>
        )}

        {open && (
          <div className="border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs text-ink-500">
              אפשר לפצל את היתרה לכמה אמצעי תשלום — כל חלק ייגבה בנפרד
              ותופק לו חשבונית עם התקבול.
            </p>
            <SplitChargeButton charge={charge} disabled={busy} />
          </div>
        )}

        {!open && (
          <div className="border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs text-ink-500">
              אם החיוב סומן כשולם בטעות, אפשר להחזיר אותו לחוב פתוח ולבחור
              אילו תקבולים נשארים תקפים.
            </p>
            <ReopenChargeButton
              charge={charge}
              disabled={busy}
              onReopened={onClose}
            />
          </div>
        )}

        {canRemoveCharge(charge) && (
          <div className="border-t border-ink-100 pt-4">
            <p className="mb-2 text-xs text-ink-500">
              חיוב שנפתח בטעות אפשר להסיר כל עוד לא נרשמו תקבולים.
            </p>
            <RemoveChargeButton
              charge={charge}
              disabled={busy}
              onRemoved={onClose}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function labelsForCharge(
  charge: CollectionCharge,
  labels: ReceiptLabelOption[]
): ReceiptLabelOption[] {
  if (
    charge.receiptLabelId &&
    !labels.some((label) => label.id === charge.receiptLabelId)
  ) {
    return [
      ...labels,
      {
        id: charge.receiptLabelId,
        label: charge.receiptLabel ?? "תווית לא פעילה",
        note: null,
      },
    ];
  }
  return labels;
}

function ReceiptLabelSelect({
  charge,
  labels,
  disabled,
  compact = false,
  onChange,
}: {
  charge: CollectionCharge;
  labels: ReceiptLabelOption[];
  disabled: boolean;
  compact?: boolean;
  onChange: (labelId: string | null) => void;
}) {
  const options = labelsForCharge(charge, labels);
  if (options.length === 0) return null;

  const select = (
    <Select
      value={charge.receiptLabelId ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      className={compact ? "h-9 max-w-xs text-sm" : undefined}
      aria-label="שם על הקבלה"
    >
      <option value="">כרגיל — {charge.subject}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.note?.trim()
            ? `${option.label} · ${option.note.trim()}`
            : option.label}
        </option>
      ))}
    </Select>
  );

  if (compact) {
    return <div className="mt-2 max-w-xs">{select}</div>;
  }

  return (
    <Field
      label="שם על הקבלה"
      hint="הטקסט יופיע על החשבונית שמופקת בקארדקום."
    >
      {select}
    </Field>
  );
}

function ReceiptCustomTextField({
  charge,
  disabled,
  compact = false,
  onSave,
}: {
  charge: CollectionCharge;
  disabled: boolean;
  compact?: boolean;
  onSave: (text: string) => void;
}) {
  const [value, setValue] = useState(charge.receiptCustomText ?? "");

  useEffect(() => {
    setValue(charge.receiptCustomText ?? "");
  }, [charge.id, charge.receiptCustomText]);

  const saved = (charge.receiptCustomText ?? "").trim();
  const current = value.trim();
  const dirty = current !== saved;

  function save() {
    if (!dirty) return;
    onSave(value);
  }

  function clear() {
    setValue("");
    if (saved) onSave("");
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        disabled={disabled || !dirty}
        onClick={save}
      >
        שמור
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || (!saved && !current)}
        onClick={clear}
      >
        נקה
      </Button>
    </div>
  );

  const input = (
    <Input
      value={value}
      disabled={disabled}
      placeholder="לדוגמה: על שם חברה / שם שלא בתוויות"
      onChange={(e) => setValue(e.target.value)}
      className={compact ? "h-9 text-sm" : undefined}
      aria-label="טקסט מותאם לקבלה"
    />
  );

  if (compact) {
    return (
      <div className="mt-2 max-w-sm space-y-2">
        {input}
        {actions}
      </div>
    );
  }

  return (
    <Field
      label="טקסט מותאם אישית"
      hint="מחליף את שם הקבלה לחיוב הזה בלבד. לא נשמר ברשימת התוויות."
    >
      <div className="space-y-2">
        {input}
        {actions}
      </div>
    </Field>
  );
}

const METHOD_BADGE: Record<
  CollectionPaymentMethod,
  { tone: "warning" | "info" | "brand" | "success"; ring: string }
> = {
  cash: { tone: "warning", ring: "ring-amber-200" },
  bank_transfer: { tone: "info", ring: "ring-sky-200" },
  maccabi: { tone: "brand", ring: "ring-brand-200" },
  amit: { tone: "success", ring: "ring-aqua-200" },
  paybox: { tone: "brand", ring: "ring-fuchsia-200" },
  pool_pass: { tone: "success", ring: "ring-emerald-200" },
  credit_card: { tone: "brand", ring: "ring-violet-200" },
};

function PaymentMethodBadge({ method }: { method: CollectionPaymentMethod }) {
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

function receiptTotal(charge: CollectionCharge) {
  return round2(
    charge.receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function EditChargeAmountButton({
  charge,
  disabled,
  compact = false,
}: {
  charge: CollectionCharge;
  disabled: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(charge.amount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = receiptTotal(charge);
  const receiptlessPaid =
    isReceiptlessCollectionMethod(charge.method) && !isOpen(charge);
  const typedAmount = Number(value);
  const previewRemaining =
    Number.isFinite(typedAmount) && typedAmount > 0
      ? round2(Math.max(0, typedAmount - paid))
      : null;

  function openEditor() {
    setValue(String(charge.amount));
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("נא להזין סכום חיוב חיובי.");
      return;
    }
    if (paid > 0 && amount < paid) {
      setError(
        `לא ניתן להוריד את הסכום מתחת לתקבולים שכבר נרשמו (${formatCurrency(paid)}).`
      );
      return;
    }

    setLoading(true);
    setError(null);
    const result = await updateCollectionChargeAmount({
      paymentId: charge.id,
      amount,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  const who = charge.childName
    ? `${charge.subject} · ${charge.childName}`
    : charge.subject;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openEditor}
        title="שינוי סכום"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg text-ink-900 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-50",
          compact ? "justify-center px-1 py-0.5" : "justify-end px-1.5 py-0.5"
        )}
      >
        <span
          className={cn(
            "font-display font-bold tabular-nums",
            compact ? "text-base" : "text-lg"
          )}
        >
          {formatCurrency(charge.amount)}
        </span>
        <Icon
          name="edit"
          size={14}
          className="shrink-0 text-ink-400"
        />
        <span className="sr-only">שינוי סכום החיוב</span>
      </button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="שינוי סכום החיוב"
        description={who}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            אפשר להזין כל סכום שתרצו, בלי קשר לסכום שרשום עכשיו. היתרה לגבייה
            תתעדכן בהתאם.
          </p>
          <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
            <p className="text-xs text-ink-500">סכום נוכחי</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink-900">
              {formatCurrency(charge.amount)}
            </p>
            {paid > 0 && (
              <p className="mt-1 text-xs text-ink-500">
                כבר נרשמו תקבולים של {formatCurrency(paid)} — הסכום לא יכול
                להיות נמוך מזה.
              </p>
            )}
            {receiptlessPaid && (
              <p className="mt-1 text-xs text-ink-500">
                החיוב כבר אושר. הסכום הרשום ישתנה והסטטוס יישאר שולם.
              </p>
            )}
            {!receiptlessPaid && previewRemaining !== null && (
              <p className="mt-1 text-xs text-ink-500">
                יתרה חדשה: {formatCurrency(previewRemaining)}
              </p>
            )}
          </div>
          <Field label="סכום חדש (₪)" required>
            <Input
              type="number"
              min={paid > 0 ? paid : 0.01}
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </Field>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void handleSave()}
            >
              {loading ? "שומר..." : "שמירת הסכום"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function SplitChargeButton({
  charge,
  disabled,
}: {
  charge: CollectionCharge;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<PaymentSplitDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = charge.remaining > 0 ? charge.remaining : charge.amount;
  const hasReceipts = charge.receipts.length > 0;

  function openEditor() {
    setParts(emptySplitDrafts(target, charge.method));
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    const parsed = parts.map((part) => ({
      method: part.method,
      amount: Number(part.amount),
    }));
    const sum = parsed.reduce((acc, part) => acc + (part.amount || 0), 0);
    if (parts.length < 2) {
      setError("פיצול תשלום דורש לפחות שני חלקים.");
      return;
    }
    if (Math.abs(sum - target) > 0.05) {
      setError(`סכום החלקים חייב להיות ${formatCurrency(target)}.`);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await splitCollectionCharge({
      paymentId: charge.id,
      parts: parsed,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  const who = charge.childName
    ? `${charge.subject} · ${charge.childName}`
    : charge.subject;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={openEditor}
      >
        פיצול תשלום
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="פיצול תשלום"
        description={who}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            {hasReceipts
              ? `כבר נרשמו תקבולים של ${formatCurrency(charge.amountPaid)}. מפצלים רק את היתרה (${formatCurrency(target)}) לחיובים נפרדים — כל אחד עם אמצעי תשלום משלו.`
              : "מפצלים את החיוב לכמה חיובים נפרדים. כל חלק יופיע בגבייה, וחשבונית מס-קבלה תופק עם רישום כל תקבול."}
          </p>
          <PaymentSplitEditor
            parts={parts}
            onChange={setParts}
            total={target}
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void handleSave()}
            >
              {loading ? "מפצל..." : "פיצול החיוב"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function receiptIssuedTaxInvoice(method: CollectionPaymentMethod) {
  return isManualReceiptMethod(method) || method === "credit_card";
}

function ReopenChargeButton({
  charge,
  disabled,
  onReopened,
}: {
  charge: CollectionCharge;
  disabled: boolean;
  onReopened?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keepIds, setKeepIds] = useState<string[]>(() =>
    charge.receipts.map((receipt) => receipt.id)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receiptlessPaid =
    (isReceiptlessCollectionMethod(charge.method) ||
      charge.receipts.length === 0) &&
    !isOpen(charge);
  const needsInvoice = receiptIssuedTaxInvoice(charge.method);
  const removeIds = charge.receipts
    .map((receipt) => receipt.id)
    .filter((id) => !keepIds.includes(id));
  const removeTotal = charge.receipts
    .filter((receipt) => removeIds.includes(receipt.id))
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const keepTotal = charge.receipts
    .filter((receipt) => keepIds.includes(receipt.id))
    .reduce((sum, receipt) => sum + receipt.amount, 0);
  const nextRemaining = receiptlessPaid
    ? charge.amount
    : round2(Math.max(0, charge.amount - keepTotal));

  function openEditor() {
    setKeepIds(charge.receipts.map((receipt) => receipt.id));
    setError(null);
    setOpen(true);
  }

  function toggleReceipt(id: string) {
    setKeepIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleSave() {
    if (!receiptlessPaid && removeIds.length === 0) {
      setError("בטלו סימון של לפחות תקבול אחד כדי לפתוח מחדש יתרה.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await reopenCollectionCharge({
      paymentId: charge.id,
      removeReceiptIds: receiptlessPaid ? [] : removeIds,
      issueCreditInvoices: needsInvoice && removeIds.length > 0,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    onReopened?.();
    router.refresh();
  }

  const who = charge.childName
    ? `${charge.subject} · ${charge.childName}`
    : charge.subject;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={openEditor}
      >
        החזרה לחוב פתוח
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="החזרה לחוב פתוח"
        description={who}
        className="max-w-lg"
      >
        <div className="space-y-4">
          {receiptlessPaid ? (
            <p className="text-sm leading-relaxed text-ink-600">
              החיוב אושר בלי תקבול ובלי חשבונית. ההחזרה תפתח אותו מחדש כחוב
              פתוח על {formatCurrency(charge.amount)}.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink-600">
                סמנו תקבולים שנותרים תקפים. הסירו סימון מתקבול שנרשם בטעות —
                הוא יורד מהחיוב והיתרה תחזור לחובות פתוחים.
              </p>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
                {charge.receipts.map((receipt) => {
                  const kept = keepIds.includes(receipt.id);
                  return (
                    <li key={receipt.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={kept}
                          disabled={loading}
                          onChange={() => toggleReceipt(receipt.id)}
                          className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-300"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium tabular-nums text-ink-900">
                              {formatCurrency(receipt.amount)}
                            </span>
                            {needsInvoice && (
                              <Badge tone="info" className="text-xs">
                                חשבונית מס קבלה
                              </Badge>
                            )}
                            {!kept && (
                              <Badge tone="warning" className="text-xs">
                                יוסר
                              </Badge>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-500">
                            {formatDate(receipt.receivedAt)}
                            {receipt.note ? ` · ${receipt.note}` : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                <p className="text-xs text-ink-500">יתרה חדשה לחוב פתוח</p>
                <p className="font-display text-lg font-bold tabular-nums text-red-600">
                  {formatCurrency(nextRemaining)}
                </p>
                {removeIds.length > 0 && (
                  <p className="mt-1 text-xs text-ink-500">
                    מוסרים {removeIds.length} תקבולים בסך{" "}
                    {formatCurrency(removeTotal)}
                  </p>
                )}
              </div>
              {needsInvoice && removeIds.length > 0 && (
                <p className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600">
                  {charge.method === "credit_card"
                    ? "על כל תקבול שיוסר תופק חשבונית זיכוי. בלי זה אי אפשר להחזיר לחוב פתוח — החשבונית אומרת שהכסף התקבל. הכסף לא יוחזר אוטומטית לכרטיס; לזיכוי כרטיס יש לעבור לעמוד הזיכויים."
                    : "על כל תקבול שיוסר תופק חשבונית זיכוי. בלי זה אי אפשר להחזיר לחוב פתוח — חשבונית מס-קבלה אומרת שהכסף התקבל."}
                </p>
              )}
            </>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void handleSave()}
            >
              {loading ? "מחזיר..." : "החזרה לחוב פתוח"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function DeleteReceiptButton({
  charge,
  receipt,
  disabled,
  onError,
  onDone,
}: {
  charge: CollectionCharge;
  receipt: CollectionReceipt;
  disabled: boolean;
  onError: (message: string | null) => void;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsInvoice = receiptIssuedTaxInvoice(charge.method);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    onError(null);
    const result = await deletePaymentReceipt({
      receiptId: receipt.id,
      issueCreditInvoice: needsInvoice,
    });
    setLoading(false);

    if (!result.success) {
      const message = result.error ?? "מחיקת התקבול נכשלה.";
      setError(message);
      onError(message);
      return;
    }

    setOpen(false);
    onDone();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        מחק
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="מחיקת תקבול"
        description={`${formatCurrency(receipt.amount)} · ${formatDate(receipt.receivedAt)}`}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            התקבול יוסר והיתרה תחושב מחדש. אם זו הייתה הסגירה האחרונה של
            החיוב, הוא יחזור לחובות פתוחים.
          </p>
          {needsInvoice && (
            <p className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm leading-relaxed text-ink-600">
              {charge.method === "credit_card"
                ? "תופק חשבונית זיכוי על התקבול. בלי זה אי אפשר להסיר אותו — החשבונית אומרת שהכסף התקבל. הכסף לא יוחזר אוטומטית לכרטיס; לזיכוי כרטיס יש לעבור לעמוד הזיכויים."
                : "תופק חשבונית זיכוי על התקבול. בלי זה אי אפשר להסיר אותו — חשבונית מס-קבלה אומרת שהכסף התקבל."}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading}
              onClick={() => void handleDelete()}
            >
              {loading ? "מוחק..." : "מחיקת התקבול"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function RemoveChargeButton({
  charge,
  disabled,
  iconOnly = false,
  onRemoved,
}: {
  charge: CollectionCharge;
  disabled: boolean;
  iconOnly?: boolean;
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    const result = await deleteCollectionCharge({ paymentId: charge.id });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    onRemoved?.();
    router.refresh();
  }

  const who = charge.childName
    ? `${charge.subject} · ${charge.childName}`
    : charge.subject;

  function openConfirm() {
    setError(null);
    setOpen(true);
  }

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          disabled={disabled}
          onClick={openConfirm}
          aria-label="הסרת חיוב מהגבייה"
          title="הסרה"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
        >
          <Icon name="trash" size={16} />
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-700 hover:bg-red-50"
          disabled={disabled}
          onClick={openConfirm}
        >
          <Icon name="trash" size={15} />
          הסרת חיוב
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="הסרת חיוב מהגבייה"
        description={who}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-600">
            החיוב יוסר מרשימת הגבייה. אם יש הרשמה מקושרת שעדיין פעילה, היא
            תבוטל גם כן — למשל שיבוץ שנעשה בטעות.
          </p>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading}
              onClick={() => void handleRemove()}
            >
              {loading ? "מסיר..." : "הסרת החיוב"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
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
