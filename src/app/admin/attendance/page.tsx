import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { ATTENDANCE_STATUS } from "@/lib/constants";
import { formatDate } from "@/utils/format";

export const metadata = { title: "נוכחות" };

export default async function AdminAttendancePage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("attendance")
    .select("*, classes(title), children(full_name), instructors(full_name)")
    .order("date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader title="נוכחות" description="רישומי נוכחות בכל החוגים" />
      {rows && rows.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>תאריך</TH>
                <TH>חוג</TH>
                <TH>ילד</TH>
                <TH>מדריכה</TH>
                <TH>סטטוס</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id}>
                  <TD className="text-ink-600">{formatDate(a.date)}</TD>
                  <TD className="font-semibold text-ink-900">{a.classes?.title ?? "—"}</TD>
                  <TD>{a.children?.full_name ?? "—"}</TD>
                  <TD>{a.instructors?.full_name ?? "—"}</TD>
                  <TD>
                    <Badge tone={ATTENDANCE_STATUS[a.status].tone}>
                      {ATTENDANCE_STATUS[a.status].label}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="אין רישומי נוכחות" icon="✅" />
      )}
    </div>
  );
}
