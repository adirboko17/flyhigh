"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSection } from "@/components/admin/AdminSection";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { PrivateLessonForm } from "@/components/admin/PrivateLessonForm";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { LISTING_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

export type AdminPrivateLessonRow = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  status: keyof typeof LISTING_STATUS;
};

interface PrivateLessonListProps {
  lessons: AdminPrivateLessonRow[];
  query?: string;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesLesson(item: AdminPrivateLessonRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(item.title).includes(q) ||
    normalizeSearch(item.description ?? "").includes(q)
  );
}

export function PrivateLessonList({
  lessons,
  query = "",
}: PrivateLessonListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPrivateLessonRow | "new" | null>(
    null
  );

  const filtered = useMemo(
    () => lessons.filter((item) => matchesLesson(item, query)),
    [lessons, query]
  );

  return (
    <>
      <AdminSection
        id="private-lessons"
        icon="🎯"
        title="שיעורים פרטיים"
        count={filtered.length}
        totalCount={lessons.length}
        onNew={() => setEditing("new")}
        newLabel="+ שיעור פרטי"
      >
        {lessons.length === 0 ? (
          <SectionMessage>
            אין שיעורים פרטיים — הוסיפו שיעור ראשון עם מחיר ומשך.
          </SectionMessage>
        ) : filtered.length === 0 ? (
          <SectionMessage>לא נמצאו שיעורים התואמים לחיפוש.</SectionMessage>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH className="hidden sm:table-cell">משך</TH>
                <TH>מחיר</TH>
                <TH>סטטוס</TH>
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((lesson) => (
                <TR key={lesson.id}>
                  <TD className="max-w-[11rem] font-semibold text-ink-900 sm:max-w-none">
                    {lesson.title}
                    {lesson.description && (
                      <span className="block line-clamp-2 text-xs font-normal text-ink-400">
                        {lesson.description}
                      </span>
                    )}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {lesson.duration_minutes} דק׳
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {formatCurrency(lesson.price)}
                  </TD>
                  <TD>
                    <Badge tone={LISTING_STATUS[lesson.status].tone}>
                      {LISTING_STATUS[lesson.status].label}
                    </Badge>
                  </TD>
                  <TD>
                    <AdminRowActions
                      onEdit={() => setEditing(lesson)}
                      itemLabel={lesson.title}
                      onDelete={async () => {
                        const result = await deleteAdminRow(
                          createClient(),
                          "private_lessons",
                          lesson.id
                        );
                        if (!result.error) {
                          await revalidatePublicCatalog();
                          router.refresh();
                        }
                        return result;
                      }}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </AdminSection>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "שיעור פרטי" : "עריכת שיעור פרטי"}
        description={
          editing === "new" ? "השיעור ייווצר כפעיל ויוצג בעמוד הבריכה." : undefined
        }
      >
        {editing !== null && (
          <PrivateLessonForm
            existing={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}

function SectionMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-ink-400">{children}</p>
  );
}
