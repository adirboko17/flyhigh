"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { CancelEnrollmentButton } from "@/components/admin/CancelEnrollmentButton";
import { loadCustomerRegistrations } from "@/lib/admin/customerRegistrations";
import {
  REGISTRATION_KIND_LABEL,
  REGISTRATION_KIND_ORDER,
  REGISTRATION_KIND_TONE,
  type CustomerRegistration,
  type CustomerRegistrationKind,
} from "@/lib/admin/customerRegistrationTypes";

export function CustomerRegistrations({
  parentId,
  parentName,
}: {
  parentId: string;
  parentName: string;
}) {
  const [rows, setRows] = useState<CustomerRegistration[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    loadCustomerRegistrations(parentId, parentName).then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [parentId, parentName]);

  function reload() {
    loadCustomerRegistrations(parentId, parentName).then(setRows);
  }

  const current = useMemo(
    () => (rows ?? []).filter((row) => !row.muted),
    [rows]
  );
  const cancelledRows = useMemo(
    () => (rows ?? []).filter((row) => row.muted),
    [rows]
  );
  const sections = useMemo(() => {
    const grouped = new Map<CustomerRegistrationKind, CustomerRegistration[]>();
    for (const row of current) {
      const list = grouped.get(row.kind) ?? [];
      list.push(row);
      grouped.set(row.kind, list);
    }
    return REGISTRATION_KIND_ORDER.flatMap((kind) => {
      const items = grouped.get(kind);
      return items?.length ? [{ kind, items }] : [];
    });
  }, [current]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">הרשמות</h3>
        {current.length > 0 && <Badge tone="brand">{current.length}</Badge>}
      </div>
      <p className="mb-3 text-sm text-ink-500">
        חוגים, מנויים, כניסות ושיעורים — של הלקוח ושל הילדים
      </p>

      {rows === null ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-400">
            טוען הרשמות...
          </CardContent>
        </Card>
      ) : current.length === 0 && cancelledRows.length === 0 ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-500">
            אין הרשמות ללקוח זה
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <Card key={section.kind} className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/70 px-4 py-2">
                <p className="text-sm font-semibold text-ink-800">
                  {section.kind === "pool_pass"
                    ? "כניסות"
                    : section.kind === "class"
                      ? "חוגים"
                      : section.kind === "membership"
                        ? "מנויים"
                        : section.kind === "private_lesson"
                          ? "שיעורים פרטיים"
                          : section.kind === "activity"
                            ? "פעילויות"
                            : "המתנה לחוג"}
                </p>
                <Badge tone={REGISTRATION_KIND_TONE[section.kind]}>
                  {section.items.length}
                </Badge>
              </div>
              <ul className="divide-y divide-ink-100">
                {section.items.map((row) => (
                  <RegistrationRow
                    key={row.id}
                    row={row}
                    onRemoved={reload}
                  />
                ))}
              </ul>
            </Card>
          ))}

          {cancelledRows.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-ink-100 bg-ink-50/70 px-4 py-2">
                <p className="text-sm font-semibold text-ink-500">
                  הרשמות שבוטלו · {cancelledRows.length}
                </p>
              </div>
              <ul className="divide-y divide-ink-100">
                {cancelledRows.map((row) => (
                  <RegistrationRow key={row.id} row={row} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function RegistrationRow({
  row,
  onRemoved,
}: {
  row: CustomerRegistration;
  onRemoved?: () => void;
}) {
  const canRemove = !row.muted && row.kind !== "waitlist" && onRemoved;

  return (
    <li
      className={`flex items-start justify-between gap-3 px-4 py-3 ${
        row.muted ? "opacity-55" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink-900">{row.title}</p>
          <Badge
            tone={REGISTRATION_KIND_TONE[row.kind]}
            className="px-1.5 py-0 text-[10px]"
          >
            {REGISTRATION_KIND_LABEL[row.kind]}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-500">
          {row.participant}
          {row.detail ? ` · ${row.detail}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={row.statusTone} className="px-1.5 py-0 text-[10px]">
          {row.statusLabel}
        </Badge>
        {row.paymentLabel && row.paymentTone && (
          <Badge tone={row.paymentTone} className="px-1.5 py-0 text-[10px]">
            {row.paymentLabel}
          </Badge>
        )}
        {canRemove && (
          <CancelEnrollmentButton
            enrollmentId={row.id}
            title={row.title}
            participantName={row.participant}
            actionLabel={row.kind === "class" ? "הסרה מהחוג" : "ביטול הרשמה"}
            compact
            onRemoved={onRemoved}
          />
        )}
      </div>
    </li>
  );
}
