"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import {
  CLASS_WAITLIST_REQUEST_STATUS,
  CLASS_WAITLIST_SKILL_LEVEL,
  GENDER,
  isClassWaitlistRequestStatus,
} from "@/lib/constants";
import {
  deleteClassWaitlistRequest,
  updateClassWaitlistRequestStatus,
} from "@/lib/waitlist-requests/actions";
import type { Enums, Tables } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatDate, formatDateShort } from "@/utils/format";

type RequestRow = Tables<"class_waitlist_requests">;
type StatusFilter = "all" | Enums<"class_waitlist_request_status">;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "pending", label: CLASS_WAITLIST_REQUEST_STATUS.pending.label },
  { id: "contacted", label: CLASS_WAITLIST_REQUEST_STATUS.contacted.label },
  { id: "closed", label: CLASS_WAITLIST_REQUEST_STATUS.closed.label },
];

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function genderLabel(value: RequestRow["child_gender"]) {
  return value === "male" || value === "female" ? GENDER[value] : "—";
}

function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

export function WaitlistRequestList({ requests }: { requests: RequestRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return requests.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return [
        row.full_name,
        row.phone,
        row.child_name,
        String(row.child_age),
        genderLabel(row.child_gender),
        CLASS_WAITLIST_SKILL_LEVEL[row.skill_level],
        row.desired_class_name,
        row.preferred_times,
      ].some((value) => normalizeSearch(value).includes(q));
    });
  }, [requests, query, status]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleStatusChange(
    id: string,
    nextStatus: string
  ) {
    if (!isClassWaitlistRequestStatus(nextStatus)) return;
    const result = await updateClassWaitlistRequestStatus(id, nextStatus);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    setSelected((current) =>
      current && current.id === id ? { ...current, status: nextStatus } : current
    );
    refresh();
  }

  async function handleDelete(row: RequestRow) {
    const confirmed = window.confirm(
      `למחוק את הפנייה של ${row.full_name}? הפעולה לא ניתנת לביטול.`
    );
    if (!confirmed) return;
    const result = await deleteClassWaitlistRequest(row.id);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    if (selected?.id === row.id) setSelected(null);
    refresh();
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-3 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם, טלפון, ילד או חוג..."
              className="h-11 border-ink-100 bg-ink-50/50 focus:bg-white md:h-10"
              aria-label="חיפוש פניות"
            />
          </div>
          <div
            role="tablist"
            aria-label="סינון לפי סטטוס"
            className="flex w-full shrink-0 gap-1 rounded-2xl bg-ink-100 p-1 md:w-auto md:rounded-full"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={status === filter.id}
                onClick={() => setStatus(filter.id)}
                className={cn(
                  "min-w-0 flex-1 whitespace-nowrap rounded-full px-1.5 py-2 text-center text-[13px] font-semibold transition-colors md:flex-none md:px-3 md:py-1.5 md:text-sm",
                  status === filter.id
                    ? "bg-white text-brand-700 shadow-soft"
                    : "text-ink-500 hover:text-ink-800"
                )}
              >
                {filter.id === "contacted" ? (
                  <>
                    <span className="md:hidden">בקשר</span>
                    <span className="hidden md:inline">{filter.label}</span>
                  </>
                ) : (
                  filter.label
                )}
              </button>
            ))}
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="עדיין אין פניות"
              description="כשלקוחות ישאירו פרטים באתר, הם יופיעו כאן."
              icon="⏳"
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            לא נמצאו פניות התואמות לחיפוש.
          </p>
        ) : (
          <>
          <ul className="divide-y divide-ink-100 md:hidden">
            {filtered.map((row) => {
              const statusMeta = CLASS_WAITLIST_REQUEST_STATUS[row.status];
              return (
                <li key={row.id}>
                  <article
                    className="cursor-pointer px-4 py-3.5 text-right transition-colors hover:bg-ink-50/70"
                    onClick={() => setSelected(row)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">
                          {row.full_name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {formatDateShort(row.created_at)}
                        </p>
                      </div>
                      <Badge tone={statusMeta.tone} className="shrink-0">
                        {statusMeta.label}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-ink-600">
                      <p>
                        <span className="font-medium text-ink-800">
                          {row.child_name}
                        </span>
                        <span className="text-ink-400"> · </span>
                        {row.child_age} · {genderLabel(row.child_gender)} ·{" "}
                        {CLASS_WAITLIST_SKILL_LEVEL[row.skill_level]}
                      </p>
                      <PhoneLink phone={row.phone} />
                      <p className="line-clamp-2">
                        <span className="text-ink-400">חוג: </span>
                        {row.desired_class_name}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>תאריך</TH>
                  <TH>שם</TH>
                  <TH>טלפון</TH>
                  <TH>ילד/ה</TH>
                  <TH className="hidden lg:table-cell">חוג מבוקש</TH>
                  <TH className="hidden xl:table-cell">מועדים</TH>
                  <TH>סטטוס</TH>
                  <TH className="w-20">פעולות</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((row) => {
                  const statusMeta = CLASS_WAITLIST_REQUEST_STATUS[row.status];
                  return (
                    <TR
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(row)}
                    >
                      <TD className="whitespace-nowrap text-ink-500">
                        {formatDate(row.created_at)}
                      </TD>
                      <TD className="font-semibold text-ink-900">
                        {row.full_name}
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <PhoneLink phone={row.phone} />
                      </TD>
                      <TD>
                        <div className="font-medium text-ink-900">
                          {row.child_name}
                        </div>
                        <div className="text-xs text-ink-500">
                          {row.child_age} · {genderLabel(row.child_gender)} ·{" "}
                          {CLASS_WAITLIST_SKILL_LEVEL[row.skill_level]}
                        </div>
                      </TD>
                      <TD className="hidden max-w-[14rem] truncate lg:table-cell">
                        {row.desired_class_name}
                      </TD>
                      <TD className="hidden max-w-[14rem] truncate xl:table-cell">
                        {row.preferred_times}
                      </TD>
                      <TD>
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                        >
                          פירוט
                        </button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
          </>
        )}
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.full_name ?? "פנייה"}
        description={
          selected ? `התקבלה ב־${formatDate(selected.created_at)}` : undefined
        }
        footer={
          selected ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => void handleDelete(selected)}
            >
              מחיקת פנייה
            </Button>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="טלפון">
                <PhoneLink phone={selected.phone} />
              </Detail>
              <Detail label="ילד/ה">
                {selected.child_name}, {selected.child_age} ·{" "}
                {genderLabel(selected.child_gender)}
              </Detail>
              <Detail label="רמה">
                {CLASS_WAITLIST_SKILL_LEVEL[selected.skill_level]}
              </Detail>
              <Detail label="סטטוס">
                <Select
                  value={selected.status}
                  onChange={(e) =>
                    void handleStatusChange(selected.id, e.target.value)
                  }
                  aria-label="סטטוס פנייה"
                >
                  {STATUS_FILTERS.filter((item) => item.id !== "all").map(
                    (item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    )
                  )}
                </Select>
              </Detail>
              <Detail label="חוג מבוקש" className="sm:col-span-2">
                {selected.desired_class_name}
              </Detail>
              <Detail label="מועדים מתאימים" className="sm:col-span-2">
                {selected.preferred_times}
              </Detail>
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}

function PhoneLink({ phone }: { phone: string }) {
  const href = telHref(phone);
  if (!href) return <span dir="ltr">{phone}</span>;
  return (
    <a
      href={href}
      dir="ltr"
      className="inline-block font-medium text-brand-700 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {phone}
    </a>
  );
}

function Detail({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className="mt-1 text-sm text-ink-900">{children}</dd>
    </div>
  );
}
