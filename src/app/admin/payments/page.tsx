import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "תשלומים וגבייה" };

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  const list = payments ?? [];
  const paid = list.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const pending = list.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="תשלומים וגבייה" description="מעקב אחר תשלומים והכנסות" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="סך נגבה" value={formatCurrency(paid)} icon="✅" tone="aqua" />
        <StatCard label="ממתין לגבייה" value={formatCurrency(pending)} icon="⏳" tone="amber" />
        <StatCard label="סך עסקאות" value={list.length} icon="💳" tone="brand" />
      </div>

      {list.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>הורה</TH>
                <TH>סכום</TH>
                <TH>אמצעי</TH>
                <TH>סטטוס</TH>
                <TH>שולם בתאריך</TH>
              </TR>
            </THead>
            <TBody>
              {list.map((p) => (
                <TR key={p.id}>
                  <TD className="font-semibold text-ink-900">{p.profiles?.full_name ?? "-"}</TD>
                  <TD className="font-medium">{formatCurrency(p.amount)}</TD>
                  <TD>{p.payment_method ? PAYMENT_METHOD[p.payment_method] : "-"}</TD>
                  <TD>
                    <Badge tone={PAYMENT_STATUS[p.status].tone}>
                      {PAYMENT_STATUS[p.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-ink-500">{p.paid_at ? formatDate(p.paid_at) : "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="אין תשלומים עדיין" icon="💳" />
      )}
    </div>
  );
}
