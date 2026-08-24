"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Input";
import {
  SessionNavigator,
  defaultSessionIndex,
  type ClassSessionOption,
} from "@/components/instructor/SessionNavigator";
import { createClient } from "@/lib/supabase/client";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";

export type SessionNoteView = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  authorName: string | null;
};

function formatNoteStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function mapNoteRows(
  rows: Array<{
    id: string;
    body: string;
    created_at: string;
    created_by: string | null;
    profiles: { full_name: string } | { full_name: string }[] | null;
  }>
): SessionNoteView[] {
  return rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      created_by: row.created_by,
      authorName: profile?.full_name ?? null,
    };
  });
}

export function SessionNotesList({
  notes,
  emptyLabel,
}: {
  notes: SessionNoteView[];
  emptyLabel?: string;
}) {
  if (notes.length === 0) {
    return emptyLabel ? (
      <p className="text-xs text-ink-400">{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"
        >
          <p className="whitespace-pre-wrap text-sm text-ink-800">{note.body}</p>
          <p className="mt-1 text-[11px] text-ink-500">
            {[note.authorName, formatNoteStamp(note.created_at)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SessionNotesPanel({
  sessionId,
  classId,
}: {
  sessionId: string;
  classId: string;
}) {
  const [notes, setNotes] = useState<SessionNoteView[]>([]);
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const [{ data: auth }, { data: rows, error: loadError }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("class_session_notes")
            .select("id, body, created_at, created_by, profiles(full_name)")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false }),
        ]);

      if (cancelled) return;

      const uid = auth.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();
        if (!cancelled) setIsAdmin(profile?.role === "admin");
      }

      if (loadError) {
        setError("לא ניתן לטעון את ההערות.");
        setNotes([]);
      } else {
        setNotes(mapNoteRows(rows ?? []));
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !userId) {
      setError(!userId ? "יש להתחבר כדי להוסיף הערה." : "יש להזין הערה.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("class_session_notes")
      .insert({
        session_id: sessionId,
        class_id: classId,
        body: trimmed,
        created_by: userId,
      })
      .select("id, body, created_at, created_by, profiles(full_name)")
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError("שמירת ההערה נכשלה. נסו שוב.");
      return;
    }

    setNotes((current) => [...mapNoteRows([data]), ...current]);
    setBody("");
  }

  async function removeNote(note: SessionNoteView) {
    const confirmed = window.confirm("למחוק את ההערה? פעולה זו אינה ניתנת לביטול.");
    if (!confirmed) return;

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("class_session_notes")
      .delete()
      .eq("id", note.id);

    if (deleteError) {
      setError("מחיקת ההערה נכשלה.");
      return;
    }

    setNotes((current) => current.filter((item) => item.id !== note.id));
  }

  return (
    <section className="space-y-3 rounded-xl border border-ink-100 bg-white p-3 sm:p-4">
      <div>
        <h3 className="font-display text-sm font-bold text-ink-900">
          הערות למפגש
        </h3>
        <p className="mt-0.5 text-xs text-ink-500">
          דיווח פציעה, אירוע חריג או כל הערה שקשורה למפגש זה. גלוי למדריכה
          ולמנהל בלבד.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-500">טוען הערות...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-ink-400">עדיין אין הערות למפגש זה.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => {
            const canDelete = isAdmin || note.created_by === userId;
            return (
              <li
                key={note.id}
                className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm text-ink-800">
                    {note.body}
                  </p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void removeNote(note)}
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                    >
                      מחיקה
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  {[note.authorName, formatNoteStamp(note.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={addNote} className="space-y-2">
        <Field
          label="הערה חדשה"
          hint="למשל: תלמיד נחבל בברך במהלך החימום"
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            disabled={saving}
            placeholder="כתבו כאן הערה למפגש..."
          />
        </Field>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving || !body.trim()}>
            {saving ? "שומר..." : "הוספת הערה"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function SessionNotesWorkspace({ classId }: { classId: string }) {
  const [sessions, setSessions] = useState<ClassSessionOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("class_sessions")
        .select("id, session_date, start_time, end_time, status")
        .eq("class_id", classId)
        .neq("status", "cancelled")
        .order("session_date")
        .order("start_time");

      if (cancelled) return;

      const list = (data ?? []) as ClassSessionOption[];
      setSessions(list);
      setSelectedIndex(defaultSessionIndex(list, todayInIsrael()));
      setLoading(false);
    }

    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const selectedSession = sessions[selectedIndex];

  if (loading) {
    return (
      <p className="rounded-xl bg-ink-50 py-8 text-center text-sm text-ink-500">
        טוען מפגשים...
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-sm text-ink-500">
        אין מפגשים מתוכננים לחוג זה.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <SessionNavigator
        sessions={sessions}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
      />
      {selectedSession && (
        <SessionNotesPanel sessionId={selectedSession.id} classId={classId} />
      )}
    </div>
  );
}

export function useClassSessionNotesByDate(classId: string) {
  const [notesByDate, setNotesByDate] = useState<
    Record<string, SessionNoteView[]>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("class_session_notes")
        .select(
          "id, body, created_at, created_by, profiles(full_name), class_sessions!class_session_notes_session_id_fkey(session_date)"
        )
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const grouped: Record<string, SessionNoteView[]> = {};
      for (const row of data ?? []) {
        const session = Array.isArray(row.class_sessions)
          ? row.class_sessions[0]
          : row.class_sessions;
        const date = session?.session_date;
        if (!date) continue;
        const list = grouped[date] ?? [];
        list.push(...mapNoteRows([row]));
        grouped[date] = list;
      }
      setNotesByDate(grouped);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  return notesByDate;
}
