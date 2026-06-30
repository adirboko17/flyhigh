import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { LISTING_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "מסלולים" };

export default async function AdminProgramsPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader title="מסלולים" description="ניהול מסלולים ומנויים" />
      {programs && programs.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>שם המסלול</TH>
                <TH>מחיר</TH>
                <TH>מכסה</TH>
                <TH>סטטוס</TH>
              </TR>
            </THead>
            <TBody>
              {programs.map((p) => (
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
                  <TD>{p.capacity}</TD>
                  <TD>
                    <Badge tone={LISTING_STATUS[p.status].tone}>
                      {LISTING_STATUS[p.status].label}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="אין מסלולים עדיין" icon="🎫" />
      )}
    </div>
  );
}
