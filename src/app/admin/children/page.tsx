import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { GENDER } from "@/lib/constants";
import { calcAge, formatDate } from "@/utils/format";

export const metadata = { title: "ילדים" };

export default async function AdminChildrenPage() {
  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader title="ילדים" description="כל הילדים הרשומים במערכת" />
      {children && children.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>שם הילד</TH>
                <TH>הורה</TH>
                <TH>גיל</TH>
                <TH>מין</TH>
                <TH>תאריך לידה</TH>
              </TR>
            </THead>
            <TBody>
              {children.map((c) => {
                const age = calcAge(c.birth_date);
                return (
                  <TR key={c.id}>
                    <TD className="font-semibold text-ink-900">{c.full_name}</TD>
                    <TD>{c.profiles?.full_name ?? "—"}</TD>
                    <TD>{age !== null ? age : "—"}</TD>
                    <TD>{c.gender ? GENDER[c.gender] : "—"}</TD>
                    <TD className="text-ink-500">{formatDate(c.birth_date)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="אין ילדים רשומים" icon="🧒" />
      )}
    </div>
  );
}
