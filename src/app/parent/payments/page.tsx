import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "תשלומים וקבלות" };

export default async function ParentPaymentsPage() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: payments }, { data: receipts }] = await Promise.all([
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
    supabase.from("receipts").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="תשלומים וקבלות" description="היסטוריית התשלומים והקבלות שלכם" />

      <Card>
        <CardHeader>
          <CardTitle>תשלומים</CardTitle>
        </CardHeader>
        {payments && payments.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>סכום</TH>
                <TH>אמצעי תשלום</TH>
                <TH>סטטוס</TH>
                <TH>תאריך תשלום</TH>
              </TR>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="font-semibold text-ink-900">{formatCurrency(p.amount)}</TD>
                  <TD>{p.payment_method ? PAYMENT_METHOD[p.payment_method] : "—"}</TD>
                  <TD>
                    <Badge tone={PAYMENT_STATUS[p.status].tone}>
                      {PAYMENT_STATUS[p.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-ink-500">{p.paid_at ? formatDate(p.paid_at) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="p-5">
            <EmptyState title="אין תשלומים" icon="💳" />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קבלות</CardTitle>
        </CardHeader>
        {receipts && receipts.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>מספר קבלה</TH>
                <TH>נשלח לאימייל</TH>
                <TH>תאריך</TH>
                <TH>קובץ</TH>
              </TR>
            </THead>
            <TBody>
              {receipts.map((r) => (
                <TR key={r.id}>
                  <TD className="font-semibold text-ink-900">{r.receipt_number ?? "—"}</TD>
                  <TD dir="ltr" className="text-right">{r.sent_to_email ?? "—"}</TD>
                  <TD className="text-ink-500">{formatDate(r.created_at)}</TD>
                  <TD>
                    {r.receipt_url ? (
                      <a href={r.receipt_url} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">
                        צפייה
                      </a>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="p-5">
            <EmptyState title="אין קבלות" icon="🧾" />
          </div>
        )}
      </Card>
    </div>
  );
}
