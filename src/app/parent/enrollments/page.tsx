import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_TYPE,
} from "@/lib/constants";
import { formatDate } from "@/utils/format";

export const metadata = { title: "ההרשמות שלי" };

export default async function ParentEnrollmentsPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, classes(title), programs(title), pool_passes(title), children(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader title="ההרשמות שלי" description="כל ההרשמות של הילדים שלכם" />

      {enrollments && enrollments.length > 0 ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>פעילות</TH>
                <TH>ילד</TH>
                <TH>סוג</TH>
                <TH>סטטוס</TH>
                <TH>תשלום</TH>
                <TH>תאריך</TH>
              </TR>
            </THead>
            <TBody>
              {enrollments.map((e) => {
                const title =
                  e.classes?.title ??
                  e.programs?.title ??
                  e.pool_passes?.title ??
                  ENROLLMENT_TYPE[e.type];
                return (
                  <TR key={e.id}>
                    <TD className="font-semibold text-ink-900">{title}</TD>
                    <TD>{e.children?.full_name ?? "-"}</TD>
                    <TD>{ENROLLMENT_TYPE[e.type]}</TD>
                    <TD>
                      <Badge tone={ENROLLMENT_STATUS[e.status].tone}>
                        {ENROLLMENT_STATUS[e.status].label}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={ENROLLMENT_PAYMENT_STATUS[e.payment_status].tone}>
                        {ENROLLMENT_PAYMENT_STATUS[e.payment_status].label}
                      </Badge>
                    </TD>
                    <TD className="text-ink-500">{formatDate(e.created_at)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          title="אין הרשמות"
          description="התחילו בעיון בחוגים הזמינים."
          icon="📝"
          action={<ButtonLink href="/classes">לעיון בחוגים</ButtonLink>}
        />
      )}
    </div>
  );
}
