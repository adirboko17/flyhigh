"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSection } from "@/components/admin/AdminSection";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { PoolPassForm } from "@/components/admin/PoolPassForm";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { packageOffer } from "@/lib/catalog/quantityPackages";
import { LISTING_STATUS } from "@/lib/constants";
import type { Json } from "@/types/database.types";
import { formatCurrency } from "@/utils/format";

export type AdminPoolPassRow = {
  id: string;
  title: string;
  description: string | null;
  entries_count: number;
  price: number;
  price_tiers?: Json | null;
  status: keyof typeof LISTING_STATUS;
  requires_schedule: boolean;
  instructor_id: string | null;
};

interface PoolPassListProps {
  passes: AdminPoolPassRow[];
  instructors?: ClassInstructorOption[];
  query?: string;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesPass(item: AdminPoolPassRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(item.title).includes(q) ||
    normalizeSearch(item.description ?? "").includes(q)
  );
}

export function PoolPassList({
  passes,
  instructors = [],
  query = "",
}: PoolPassListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPoolPassRow | "new" | null>(null);

  const filtered = useMemo(
    () => passes.filter((p) => matchesPass(p, query)),
    [passes, query]
  );

  return (
    <>
      <AdminSection
        id="pool-passes"
        icon="🪪"
        title="כניסות לבריכה"
        count={filtered.length}
        totalCount={passes.length}
        onNew={() => setEditing("new")}
        newLabel="+ כניסה לבריכה"
      >
        {passes.length === 0 ? (
          <SectionMessage>
            אין כניסות מוגדרות — הוסיפו כרטיס כניסה או כרטיסייה ראשונה.
          </SectionMessage>
        ) : filtered.length === 0 ? (
          <SectionMessage>לא נמצאו כניסות התואמות לחיפוש.</SectionMessage>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH className="hidden sm:table-cell">מספר כניסות</TH>
                <TH>מחיר</TH>
                <TH>סטטוס</TH>
                <TH className="w-28 sm:w-40">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => {
                const offer = packageOffer(
                  p.entries_count,
                  p.price,
                  p.price_tiers,
                  "entries"
                );
                return (
                <TR
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setEditing(p)}
                >
                  <TD className="max-w-[11rem] font-semibold text-ink-900 sm:max-w-none">
                    {p.title}
                    <span className="mt-1 flex flex-wrap gap-1">
                      {offer.multi && (
                        <Badge tone="brand" className="px-1.5 py-0 text-[10px]">
                          {offer.packages.length} חבילות
                        </Badge>
                      )}
                      {p.requires_schedule && (
                        <Badge tone="info" className="px-1.5 py-0 text-[10px]">
                          תיאום מועדים
                        </Badge>
                      )}
                      {p.instructor_id && (
                        <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                          {instructors.find((row) => row.id === p.instructor_id)
                            ?.full_name ?? "מדריכה"}
                        </Badge>
                      )}
                    </span>
                    {p.description && (
                      <span className="block line-clamp-2 text-xs font-normal text-ink-400">
                        {p.description}
                      </span>
                    )}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {offer.multi
                      ? offer.packages.map((pack) => pack.quantity).join(" / ")
                      : p.entries_count}
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
                      formatCurrency(p.price)
                    )}
                  </TD>
                  <TD>
                    <Badge tone={LISTING_STATUS[p.status].tone}>
                      {LISTING_STATUS[p.status].label}
                    </Badge>
                  </TD>
                  <TD>
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      עריכה
                    </button>
                    <AdminRowActions
                      onEdit={() => setEditing(p)}
                      itemLabel={p.title}
                      onDelete={async () => {
                        const result = await deleteAdminRow(
                          createClient(),
                          "pool_passes",
                          p.id
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
        title={editing === "new" ? "כניסה לבריכה" : "עריכת כניסה לבריכה"}
        description={
          editing === "new"
            ? "אפשר להגדיר כניסה אחת, כרטיסייה, או כמה חבילות מחיר לאותו מוצר."
            : undefined
        }
      >
        {editing !== null && (
          <PoolPassForm
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
  return <p className="px-5 py-10 text-center text-sm text-ink-400">{children}</p>;
}
