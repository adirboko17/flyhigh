import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/format";

export const metadata = { title: "לקוחות" };

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  const { data: parents } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  const { data: children } = await supabase.from("children").select("parent_id");
  const childCount = new Map<string, number>();
  (children ?? []).forEach((c) =>
    childCount.set(c.parent_id, (childCount.get(c.parent_id) ?? 0) + 1)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="לקוחות והורים" description="כל ההורים הרשומים במערכת" />

      {parents && parents.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>טלפון</TH>
                <TH>אימייל</TH>
                <TH>ילדים</TH>
                <TH>הצטרף</TH>
              </TR>
            </THead>
            <TBody>
              {parents.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.full_name} />
                      <span className="font-semibold text-ink-900">{p.full_name}</span>
                    </div>
                  </TD>
                  <TD dir="ltr" className="text-right text-ink-600">{p.phone ?? "—"}</TD>
                  <TD dir="ltr" className="text-right text-ink-600">{p.email ?? "—"}</TD>
                  <TD>{childCount.get(p.id) ?? 0}</TD>
                  <TD className="text-ink-500">{formatDate(p.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="אין לקוחות עדיין" icon="👨‍👩‍👧" />
      )}
    </div>
  );
}
