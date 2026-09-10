"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSection } from "@/components/admin/AdminSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import {
  CLASS_PROSPECT_STATUS,
  isClassProspectStatus,
} from "@/lib/constants";
import {
  deleteProspect,
  saveProspect,
  updateProspectStatus,
} from "@/lib/admin/prospectActions";
import type { Enums } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatDate, formatDateShort } from "@/utils/format";

export type ProspectRow = {
  id: string;
  created_at: string;
  full_name: string;
  phone: string | null;
  child_name: string | null;
  class_id: string;
  trial_date: string;
  status: Enums<"class_prospect_status">;
  notes: string | null;
  classTitle: string;
};

export type ProspectClassOption = {
  id: string;
  title: string;
  inactive: boolean;
};

type StatusFilter = "all" | Enums<"class_prospect_status">;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "scheduled", label: CLASS_PROSPECT_STATUS.scheduled.label },
  { id: "arrived", label: CLASS_PROSPECT_STATUS.arrived.label },
  { id: "no_show", label: CLASS_PROSPECT_STATUS.no_show.label },
  { id: "cancelled", label: CLASS_PROSPECT_STATUS.cancelled.label },
];

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function telHref(phone: string | null) {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

export function ProspectList({
  prospects,
  classes,
  today,
}: {
  prospects: ProspectRow[];
  classes: ProspectClassOption[];
  today: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("scheduled");
  const [classId, setClassId] = useState("all");
  const [editing, setEditing] = useState<ProspectRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const rows = prospects.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (classId !== "all" && row.class_id !== classId) return false;
      if (!q) return true;
      return [
        row.full_name,
        row.phone ?? "",
        row.child_name ?? "",
        row.classTitle,
        row.notes ?? "",
      ].some((value) => normalizeSearch(value).includes(q));
    });

    return rows.sort((a, b) => {
      if (status === "scheduled") {
        return a.trial_date.localeCompare(b.trial_date);
      }
      return b.trial_date.localeCompare(a.trial_date);
    });
  }, [prospects, query, status, classId]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleStatus(id: string, next: Enums<"class_prospect_status">) {
    const result = await updateProspectStatus(id, next);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    refresh();
  }

  return (
    <>
      <AdminSection
        id="prospects"
        icon="👋"
        title="שיעורי ניסיון"
        count={filtered.length}
        totalCount={prospects.length}
        onNew={() => setEditing("new")}
        newLabel="+ מתעניינת"
      >
        <div className="flex flex-col gap-3 border-b border-ink-100 px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם, טלפון או חוג..."
                className="h-11 border-ink-100 bg-ink-50/50 focus:bg-white md:h-10"
                aria-label="חיפוש מתעניינים"
              />
            </div>
            <Select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-11 border-ink-100 bg-ink-50/50 md:h-10 md:w-64"
              aria-label="סינון לפי חוג"
            >
              <option value="all">כל החוגים</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.inactive ? `${item.title} (לא פעיל)` : item.title}
                </option>
              ))}
            </Select>
          </div>
          <div
            role="tablist"
            aria-label="סינון לפי סטטוס"
            className="flex w-full flex-wrap gap-1 rounded-2xl bg-ink-100 p-1 md:w-fit md:rounded-full"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={status === filter.id}
                onClick={() => setStatus(filter.id)}
                className={cn(
                  "min-w-0 flex-1 whitespace-nowrap rounded-full px-2 py-2 text-center text-[13px] font-semibold transition-colors md:flex-none md:px-3 md:py-1.5 md:text-sm",
                  status === filter.id
                    ? "bg-white text-brand-700 shadow-soft"
                    : "text-ink-500 hover:text-ink-800"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {prospects.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="עדיין אין מתעניינים"
              description="הוסיפו מי שמתעניינת בחוג וקבעו לה מועד לשיעור ניסיון."
              icon="👋"
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            לא נמצאו רשומות לפי הסינון.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-ink-100 md:hidden">
              {filtered.map((row) => (
                <ProspectCard
                  key={row.id}
                  row={row}
                  today={today}
                  pending={pending}
                  onEdit={() => setEditing(row)}
                  onStatus={handleStatus}
                  onDelete={async () => {
                    const result = await deleteProspect(row.id);
                    if (!result.error) refresh();
                    return result;
                  }}
                />
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>שם</TH>
                    <TH>חוג</TH>
                    <TH>מועד ניסיון</TH>
                    <TH>סטטוס</TH>
                    <TH className="w-36"> </TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((row) => {
                    const meta = CLASS_PROSPECT_STATUS[row.status];
                    const overdue =
                      row.status === "scheduled" && row.trial_date < today;
                    return (
                      <TR key={row.id}>
                        <TD>
                          <p className="font-semibold text-ink-900">
                            {row.full_name}
                          </p>
                          <p className="text-xs text-ink-500">
                            {[row.child_name, row.phone].filter(Boolean).join(" · ") ||
                              "—"}
                          </p>
                        </TD>
                        <TD className="max-w-[14rem] truncate text-sm text-ink-700">
                          {row.classTitle}
                        </TD>
                        <TD>
                          <span
                            className={cn(
                              "text-sm",
                              overdue ? "font-semibold text-amber-700" : "text-ink-700"
                            )}
                          >
                            {formatDate(row.trial_date)}
                            {overdue ? " · עבר" : ""}
                          </span>
                        </TD>
                        <TD>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </TD>
                        <TD>
                          <div className="flex items-center justify-end gap-1.5">
                            {row.status === "scheduled" && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={pending}
                                  onClick={() => handleStatus(row.id, "arrived")}
                                >
                                  הגיעה
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={pending}
                                  onClick={() => handleStatus(row.id, "no_show")}
                                >
                                  לא הגיעה
                                </Button>
                              </>
                            )}
                            <AdminRowActions
                              onEdit={() => setEditing(row)}
                              itemLabel={row.full_name}
                              extraMenuItems={
                                row.status === "scheduled"
                                  ? [
                                      {
                                        label: "ביטול",
                                        onClick: () =>
                                          handleStatus(row.id, "cancelled"),
                                      },
                                    ]
                                  : [
                                      {
                                        label: "החזרה למתוכנן",
                                        onClick: () =>
                                          handleStatus(row.id, "scheduled"),
                                      },
                                    ]
                              }
                              onDelete={async () => {
                                const result = await deleteProspect(row.id);
                                if (!result.error) refresh();
                                return result;
                              }}
                            />
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </AdminSection>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "מתעניינת חדשה" : "עריכת מתעניינת"}
        description="פרטים כמו בנייר: מי מגיעה, לאיזה חוג, ומתי שיעור הניסיון."
      >
        {editing !== null && (
          <ProspectForm
            existing={editing === "new" ? undefined : editing}
            classes={classes}
            today={today}
            onClose={() => setEditing(null)}
            onSaved={refresh}
          />
        )}
      </Modal>
    </>
  );
}

function ProspectCard({
  row,
  today,
  pending,
  onEdit,
  onStatus,
  onDelete,
}: {
  row: ProspectRow;
  today: string;
  pending: boolean;
  onEdit: () => void;
  onStatus: (id: string, status: Enums<"class_prospect_status">) => Promise<void>;
  onDelete: () => Promise<{ error?: string }>;
}) {
  const meta = CLASS_PROSPECT_STATUS[row.status];
  const overdue = row.status === "scheduled" && row.trial_date < today;
  const phoneLink = telHref(row.phone);

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 text-right"
        >
          <p className="truncate font-semibold text-ink-900">{row.full_name}</p>
          <p className="mt-0.5 text-sm text-ink-600">{row.classTitle}</p>
          <p
            className={cn(
              "mt-0.5 text-xs",
              overdue ? "font-semibold text-amber-700" : "text-ink-500"
            )}
          >
            {formatDateShort(row.trial_date)}
            {row.child_name ? ` · ${row.child_name}` : ""}
            {overdue ? " · עבר" : ""}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <AdminRowActions
            onEdit={onEdit}
            itemLabel={row.full_name}
            extraMenuItems={
              row.status === "scheduled"
                ? [
                    {
                      label: "ביטול",
                      onClick: () => onStatus(row.id, "cancelled"),
                    },
                  ]
                : [
                    {
                      label: "החזרה למתוכנן",
                      onClick: () => onStatus(row.id, "scheduled"),
                    },
                  ]
            }
            onDelete={async () => {
              const result = await onDelete();
              return result;
            }}
          />
        </div>
      </div>
      {phoneLink && (
        <a
          href={phoneLink}
          className="mt-2 inline-block text-sm font-medium text-brand-600"
        >
          {row.phone}
        </a>
      )}
      {row.status === "scheduled" && (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => onStatus(row.id, "arrived")}
          >
            הגיעה
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => onStatus(row.id, "no_show")}
          >
            לא הגיעה
          </Button>
        </div>
      )}
    </li>
  );
}

function ProspectForm({
  existing,
  classes,
  today,
  onClose,
  onSaved,
}: {
  existing?: ProspectRow;
  classes: ProspectClassOption[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(existing?.full_name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [childName, setChildName] = useState(existing?.child_name ?? "");
  const [classId, setClassId] = useState(existing?.class_id ?? "");
  const [trialDate, setTrialDate] = useState(existing?.trial_date ?? today);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<Enums<"class_prospect_status">>(
    existing?.status ?? "scheduled"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveProspect({
      id: existing?.id,
      fullName,
      phone,
      childName,
      classId,
      trialDate,
      notes,
      status,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="שם המתעניינת" htmlFor="prospect-name" required>
        <Input
          id="prospect-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="טלפון" htmlFor="prospect-phone">
          <Input
            id="prospect-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </Field>
        <Field
          label="שם הילד/ה"
          htmlFor="prospect-child"
          hint="רק אם שונה משם המתעניינת"
        >
          <Input
            id="prospect-child"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
          />
        </Field>
      </div>
      <Field label="חוג" htmlFor="prospect-class" required>
        <Select
          id="prospect-class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          required
        >
          <option value="">בחירת חוג</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.inactive ? `${item.title} (לא פעיל)` : item.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="מועד שיעור ניסיון" htmlFor="prospect-date" required>
          <Input
            id="prospect-date"
            type="date"
            value={trialDate}
            onChange={(e) => setTrialDate(e.target.value)}
            required
          />
        </Field>
        <Field label="סטטוס" htmlFor="prospect-status">
          <Select
            id="prospect-status"
            value={status}
            onChange={(e) => {
              if (isClassProspectStatus(e.target.value)) {
                setStatus(e.target.value);
              }
            }}
          >
            {(
              Object.keys(CLASS_PROSPECT_STATUS) as Enums<"class_prospect_status">[]
            ).map((value) => (
              <option key={value} value={value}>
                {CLASS_PROSPECT_STATUS[value].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="הערה" htmlFor="prospect-notes">
        <Textarea
          id="prospect-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </Field>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ביטול
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "שומר..." : existing ? "שמירה" : "הוספה"}
        </Button>
      </div>
    </form>
  );
}
