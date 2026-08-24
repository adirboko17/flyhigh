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
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { LISTING_STATUS } from "@/lib/constants";
import { isActivityProgram, type ProgramKind } from "@/lib/programs";
import { formatCurrency } from "@/utils/format";

export type AdminProgramRow = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  kind: ProgramKind;
  status: keyof typeof LISTING_STATUS;
};

const SECTION = {
  membership: {
    id: "programs",
    icon: "🎫",
    title: "מנויים",
    newLabel: "+ מנוי חדש",
    empty: "אין מנויים עדיין — צרו את המנוי הראשון שלכם.",
    noMatch: "לא נמצאו מנויים התואמים לחיפוש.",
    nameCol: "שם המנוי",
    priceCol: "מחיר",
    extraCol: "משך",
    modalNew: "מנוי חדש",
    modalEdit: "עריכת מנוי",
    modalNewDesc: "המנוי ייווצר כפעיל ויוצג באתר.",
  },
  activity: {
    id: "activities",
    icon: "🎯",
    title: "פעילויות",
    newLabel: "+ פעילות חדשה",
    empty: "אין פעילויות עדיין — הוסיפו פעילות עם שם ומחיר למשתתף.",
    noMatch: "לא נמצאו פעילויות התואמות לחיפוש.",
    nameCol: "שם הפעילות",
    priceCol: "מחיר למשתתף",
    extraCol: "אחרי הרכישה",
    modalNew: "פעילות חדשה",
    modalEdit: "עריכת פעילות",
    modalNewDesc:
      "הלקוח בוחר כמה משתתפים ומשלם לפי זה. אחרי התשלום הבקשה נכנסת לתיאום מועדים כדי לתאם מועד בטלפון.",
  },
} as const;

interface ProgramListProps {
  programs: AdminProgramRow[];
  query?: string;
  kind: ProgramKind;
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

export function ProgramList({
  programs,
  query = "",
  kind,
}: ProgramListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminProgramRow | "new" | null>(null);
  const copy = SECTION[kind];

  const scoped = useMemo(
    () => programs.filter((p) => p.kind === kind),
    [programs, kind]
  );

  const filtered = useMemo(
    () => scoped.filter((p) => matchesProgram(p, query)),
    [scoped, query]
  );

  return (
    <>
      <AdminSection
        id={copy.id}
        icon={copy.icon}
        title={copy.title}
        count={filtered.length}
        totalCount={scoped.length}
        onNew={() => setEditing("new")}
        newLabel={copy.newLabel}
      >
        {scoped.length === 0 ? (
          <SectionMessage>{copy.empty}</SectionMessage>
        ) : filtered.length === 0 ? (
          <SectionMessage>{copy.noMatch}</SectionMessage>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{copy.nameCol}</TH>
                <TH>{copy.priceCol}</TH>
                <TH>{copy.extraCol}</TH>
                <TH>סטטוס</TH>
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="max-w-[12rem] font-semibold text-ink-900 sm:max-w-none">
                    {p.title}
                    {p.description && (
                      <span className="block line-clamp-2 text-xs font-normal text-ink-400">
                        {p.description}
                      </span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {formatCurrency(p.price)}
                    {isActivityProgram(p.kind) ? (
                      <span className="block text-xs font-normal text-ink-400">
                        למשתתף
                      </span>
                    ) : null}
                  </TD>
                  <TD className="whitespace-nowrap text-ink-600">
                    {isActivityProgram(p.kind)
                      ? "תיאום מועדים"
                      : p.duration_months === 1
                        ? "חודש"
                        : `${p.duration_months} חודשים`}
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
                          "programs",
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
        title={editing === "new" ? copy.modalNew : copy.modalEdit}
        description={editing === "new" ? copy.modalNewDesc : undefined}
      >
        {editing !== null && (
          <ProgramForm
            existing={editing === "new" ? undefined : editing}
            defaultKind={kind}
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
