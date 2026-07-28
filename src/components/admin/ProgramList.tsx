"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSection } from "@/components/admin/AdminSection";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/client";
import { LISTING_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

export type AdminProgramRow = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: keyof typeof LISTING_STATUS;
};

interface ProgramListProps {
  programs: AdminProgramRow[];
  query?: string;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesProgram(item: AdminProgramRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(item.title).includes(q) ||
    normalizeSearch(item.description ?? "").includes(q)
  );
}

export function ProgramList({ programs, query = "" }: ProgramListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminProgramRow | "new" | null>(null);

  const filtered = useMemo(
    () => programs.filter((p) => matchesProgram(p, query)),
    [programs, query]
  );

  return (
    <>
      <AdminSection
        id="programs"
        icon="🎫"
        title="מסלולים"
        count={filtered.length}
        totalCount={programs.length}
        onNew={() => setEditing("new")}
        newLabel="+ מסלול חדש"
      >
        {programs.length === 0 ? (
          <SectionMessage>
            אין מסלולים עדיין — צרו את המסלול הראשון שלכם.
          </SectionMessage>
        ) : filtered.length === 0 ? (
          <SectionMessage>לא נמצאו מסלולים התואמים לחיפוש.</SectionMessage>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>שם המסלול</TH>
                <TH>מחיר</TH>
                <TH>סטטוס</TH>
                <TH className="w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="font-semibold text-ink-900">
                    {p.title}
                    {p.description && (
                      <span className="block text-xs font-normal text-ink-400">
                        {p.description}
                      </span>
                    )}
                  </TD>
                  <TD className="font-medium">{formatCurrency(p.price)}</TD>
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
                          "programs",
                          p.id
                        );
                        if (!result.error) router.refresh();
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
        title={editing === "new" ? "מסלול חדש" : "עריכת מסלול"}
        description={
          editing === "new" ? "המסלול ייווצר כפעיל ויוצג באתר." : undefined
        }
      >
        {editing !== null && (
          <ProgramForm
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
