import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { LISTING_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "כניסות לבריכה" };

export default async function AdminPoolPassesPage() {
  const supabase = await createClient();
  const { data: passes } = await supabase
    .from("pool_passes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader title="כניסות לבריכה" description="ניהול כרטיסי כניסה וכרטיסיות" />
      {passes && passes.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>מספר כניסות</TH>
                <TH>מחיר</TH>
                <TH>סטטוס</TH>
              </TR>
            </THead>
            <TBody>
              {passes.map((p) => (
                <TR key={p.id}>
                  <TD className="font-semibold text-ink-900">{p.title}</TD>
                  <TD>{p.entries_count}</TD>
                  <TD className="font-medium">{formatCurrency(p.price)}</TD>
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
        <EmptyState title="אין כניסות מוגדרות" icon="🪪" />
      )}
    </div>
  );
}
