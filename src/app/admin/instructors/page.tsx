import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "מדריכות" };

export default async function AdminInstructorsPage() {
  const supabase = await createClient();

  const { data: instructors } = await supabase
    .from("instructors")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: classes } = await supabase
    .from("classes")
    .select("instructor_id");
  const classCount = new Map<string, number>();
  (classes ?? []).forEach((c) => {
    if (c.instructor_id)
      classCount.set(c.instructor_id, (classCount.get(c.instructor_id) ?? 0) + 1);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="מדריכות" description="ניהול צוות המדריכות ושיוך לחוגים" />

      {instructors && instructors.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>טלפון</TH>
                <TH>תעריף שעתי</TH>
                <TH>חוגים</TH>
                <TH>סטטוס</TH>
              </TR>
            </THead>
            <TBody>
              {instructors.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={i.full_name} />
                      <span className="font-semibold text-ink-900">{i.full_name}</span>
                    </div>
                  </TD>
                  <TD dir="ltr" className="text-right text-ink-600">{i.phone ?? "—"}</TD>
                  <TD className="font-medium">{formatCurrency(i.hourly_rate)}</TD>
                  <TD>{classCount.get(i.id) ?? 0}</TD>
                  <TD>
                    <Badge tone={i.status === "active" ? "success" : "neutral"}>
                      {i.status === "active" ? "פעילה" : "לא פעילה"}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="אין מדריכות עדיין" icon="👩‍🏫" />
      )}
    </div>
  );
}
