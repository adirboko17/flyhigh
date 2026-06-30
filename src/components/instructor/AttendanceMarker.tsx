"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";
import type { Enums } from "@/types";

type Status = Enums<"attendance_status">;

interface ClassOption {
  id: string;
  title: string;
  children: { id: string; full_name: string }[];
}

const STATUS_OPTIONS: { value: Status; label: string; active: string }[] = [
  { value: "present", label: "נוכח", active: "bg-aqua-500 text-white" },
  { value: "late", label: "איחור", active: "bg-amber-500 text-white" },
  { value: "absent", label: "נעדר", active: "bg-red-500 text-white" },
];

export function AttendanceMarker({
  classes,
  instructorId,
}: {
  classes: ClassOption[];
  instructorId: string;
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selected = classes.find((c) => c.id === classId);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const rows = selected.children.map((child) => ({
      class_id: classId,
      child_id: child.id,
      instructor_id: instructorId,
      date,
      status: marks[child.id] ?? ("present" as Status),
    }));
    if (rows.length > 0) {
      await supabase.from("attendance").insert(rows);
    }
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  if (classes.length === 0) {
    return <EmptyState title="אין חוגים לסימון נוכחות" icon="✅" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>סימון נוכחות</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="בחירת חוג">
            <Select value={classId} onChange={(e) => { setClassId(e.target.value); setMarks({}); setSaved(false); }}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="תאריך">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        {selected && selected.children.length > 0 ? (
          <div className="space-y-2">
            {selected.children.map((child) => {
              const current = marks[child.id] ?? "present";
              return (
                <div
                  key={child.id}
                  className="flex flex-col gap-2 rounded-xl border border-ink-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-ink-800">{child.full_name}</span>
                  <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMarks((m) => ({ ...m, [child.id]: opt.value }))}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors",
                          current === opt.value
                            ? opt.active
                            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "שומר..." : "שמירת נוכחות"}
              </Button>
              {saved && (
                <span className="text-sm font-medium text-aqua-600">
                  ✓ הנוכחות נשמרה
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500">
            אין תלמידים רשומים בחוג זה.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
