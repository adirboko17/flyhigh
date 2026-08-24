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
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { LISTING_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

export type AdminPoolPassRow = {
  id: string;
  title: string;
  description: string | null;
  entries_count: number;
  price: number;
  status: keyof typeof LISTING_STATUS;
};

interface PoolPassListProps {
  passes: AdminPoolPassRow[];
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

export function PoolPassList({ passes, query = "" }: PoolPassListProps) {
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
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="max-w-[11rem] font-semibold text-ink-900 sm:max-w-none">
                    {p.title}
                    {p.description && (
                      <span className="block line-clamp-2 text-xs font-normal text-ink-400">
                        {p.description}
                      </span>
                    )}
                  </TD>
                  <TD className="hidden sm:table-cell">{p.entries_count}</TD>
                  <TD className="whitespace-nowrap font-medium">
                    {formatCurrency(p.price)}
                  </TD>
                  <TD>
                    <Badge tone={LISTING_STATUS[p.status].tone}>
                      {LISTING_STATUS[p.status].label}
                    </Badge>
                  </TD>
                  <TD>
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
        title={editing === "new" ? "כניסה לבריכה" : "עריכת כניסה לבריכה"}
        description={
          editing === "new" ? "הכניסה תיווצר כפעילה ותוצג באתר." : undefined
        }
      >
        {editing !== null && (
          <PoolPassForm
            existing={editing === "new" ? undefined : editing}
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
