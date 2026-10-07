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
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { LISTING_STATUS } from "@/lib/constants";
import { packageOffer } from "@/lib/catalog/quantityPackages";
import { isPrivateLessonSeries } from "@/lib/private-lessons/series";
import type { Json } from "@/types/database.types";
import { formatCurrency } from "@/utils/format";

export type AdminPrivateLessonRow = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  lessons_count: number;
  price: number;
  price_tiers?: Json | null;
  status: keyof typeof LISTING_STATUS;
  requires_schedule: boolean;
  instructor_id: string | null;
};

interface PrivateLessonListProps {
  lessons: AdminPrivateLessonRow[];
  instructors?: ClassInstructorOption[];
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
  instructors = [],
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
            אין שיעורים פרטיים — הוסיפו שיעור בודד או כרטיסייה של כמה שיעורים.
          </SectionMessage>
        ) : filtered.length === 0 ? (
          <SectionMessage>לא נמצאו שיעורים התואמים לחיפוש.</SectionMessage>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH className="hidden sm:table-cell">משך</TH>
                <TH className="hidden md:table-cell">שיעורים</TH>
                <TH>מחיר</TH>
                <TH>סטטוס</TH>
                <TH className="w-28 sm:w-40">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((lesson) => {
                const offer = packageOffer(
                  lesson.lessons_count,
                  lesson.price,
                  lesson.price_tiers,
                  "lessons"
                );
                return (
                <TR
                  key={lesson.id}
                  className="cursor-pointer"
                  onClick={() => setEditing(lesson)}
                >
                  <TD className="max-w-[11rem] font-semibold text-ink-900 sm:max-w-none">
                    {lesson.title}
                    <span className="mt-1 flex flex-wrap gap-1">
                      {offer.multi ? (
                        <Badge tone="brand" className="px-1.5 py-0 text-[10px]">
                          {offer.packages.length} חבילות
                        </Badge>
                      ) : (
                        isPrivateLessonSeries(lesson.lessons_count) && (
                          <Badge tone="brand" className="px-1.5 py-0 text-[10px]">
                            כרטיסייה · {lesson.lessons_count}
                          </Badge>
                        )
                      )}
                      {lesson.requires_schedule && (
                        <Badge tone="info" className="px-1.5 py-0 text-[10px]">
                          תיאום מועדים
                        </Badge>
                      )}
                      {lesson.instructor_id && (
                        <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                          {instructors.find((row) => row.id === lesson.instructor_id)
                            ?.full_name ?? "מדריכה"}
                        </Badge>
                      )}
                    </span>
                    {lesson.description && (
                      <span className="block line-clamp-2 text-xs font-normal text-ink-400">
                        {lesson.description}
                      </span>
                    )}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {lesson.duration_minutes} דק׳
                  </TD>
                  <TD className="hidden md:table-cell">
                    {offer.multi
                      ? offer.packages.map((pack) => pack.quantity).join(" / ")
                      : lesson.lessons_count}
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {offer.multi ? (
                      <>
                        החל מ־{formatCurrency(offer.fromPrice)}
                        <span className="block text-xs font-normal text-ink-400">
                          {offer.packages
                            .map(
                              (pack) =>
                                `${pack.quantity} · ${formatCurrency(pack.price)}`
                            )
                            .join(" · ")}
                        </span>
                      </>
                    ) : (
                      formatCurrency(lesson.price)
                    )}
                  </TD>
                  <TD>
                    <Badge tone={LISTING_STATUS[lesson.status].tone}>
                      {LISTING_STATUS[lesson.status].label}
                    </Badge>
                  </TD>
                  <TD>
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                    <button
                      type="button"
                      onClick={() => setEditing(lesson)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      עריכה
                    </button>
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
                    </div>
                  </TD>
                </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </AdminSection>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "שיעור פרטי" : "עריכת שיעור פרטי"}
        description={
          editing === "new"
            ? "שיעור בודד, כרטיסייה, או כמה חבילות מחיר — למשל 5 שיעורים ב-750 ו-10 ב-1,000."
            : undefined
        }
      >
        {editing !== null && (
          <PrivateLessonForm
            existing={editing === "new" ? undefined : editing}
            instructors={instructors}
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
