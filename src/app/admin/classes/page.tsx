import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/utils/format";

export const metadata = { title: "ניהול חוגים" };

export default async function AdminClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*, instructors(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול חוגים"
        description="יצירה, עריכה וניהול של כל החוגים"
        action={<ButtonLink href="/admin/classes/new">+ חוג חדש</ButtonLink>}
      />

      {classes && classes.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>שם החוג</TH>
                <TH>מדריכה</TH>
                <TH>יום ושעה</TH>
                <TH>מחיר</TH>
                <TH>מכסה</TH>
                <TH>סטטוס</TH>
              </TR>
            </THead>
            <TBody>
              {classes.map((c) => (
                <TR key={c.id}>
                  <TD className="font-semibold text-ink-900">
                    {c.title}
                    {c.category && (
                      <span className="mr-2 text-xs font-normal text-ink-400">
                        {c.category}
                      </span>
                    )}
                  </TD>
                  <TD>{c.instructors?.full_name ?? "—"}</TD>
                  <TD className="text-ink-600">
                    יום {dayLabel(c.day_of_week)} · {formatTime(c.start_time)}
                  </TD>
                  <TD className="font-medium">{formatCurrency(c.price)}</TD>
                  <TD>{c.capacity}</TD>
                  <TD>
                    <Badge tone={CLASS_STATUS[c.status].tone}>
                      {CLASS_STATUS[c.status].label}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          title="אין חוגים עדיין"
          description="צרו את החוג הראשון שלכם."
          icon="🏊"
          action={<ButtonLink href="/admin/classes/new">+ חוג חדש</ButtonLink>}
        />
      )}
    </div>
  );
}
