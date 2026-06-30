import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { WAITLIST_STATUS } from "@/lib/constants";
import { formatDate } from "@/utils/format";

export const metadata = { title: "רשימת המתנה" };

export default async function AdminWaitlistPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("waitlist")
    .select("*, classes(title), children(full_name), profiles(full_name)")
    .order("created_at");

  return (
    <div className="space-y-6">
      <PageHeader title="רשימת המתנה" description="ניהול ממתינים לחוגים מלאים" />
      {items && items.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>חוג</TH>
                <TH>הורה</TH>
                <TH>ילד</TH>
                <TH>סטטוס</TH>
                <TH>תאריך</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((w) => (
                <TR key={w.id}>
                  <TD className="font-semibold text-ink-900">{w.classes?.title ?? "-"}</TD>
                  <TD>{w.profiles?.full_name ?? "-"}</TD>
                  <TD>{w.children?.full_name ?? "-"}</TD>
                  <TD>
                    <Badge tone={WAITLIST_STATUS[w.status].tone}>
                      {WAITLIST_STATUS[w.status].label}
                    </Badge>
                  </TD>
                  <TD className="text-ink-500">{formatDate(w.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="רשימת ההמתנה ריקה" icon="⏳" />
      )}
    </div>
  );
}
