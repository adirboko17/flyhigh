import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatTime } from "@/utils/format";

export const metadata = { title: "החוגים שלי" };

export default async function InstructorClassesPage() {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  const classes = instructor
    ? (
        await supabase
          .from("classes")
          .select("*")
          .eq("instructor_id", instructor.id)
          .order("day_of_week")
      ).data ?? []
    : [];

  // ספירת תלמידים לכל חוג
  const counts = new Map<string, number>();
  if (classes.length > 0) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("class_id")
      .in("class_id", classes.map((c) => c.id))
      .eq("status", "active");
    (enr ?? []).forEach((e) => {
      if (e.class_id) counts.set(e.class_id, (counts.get(e.class_id) ?? 0) + 1);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="החוגים שלי" description="כל החוגים המשויכים אליך" />

      {classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-lg font-bold text-ink-900">
                    {c.title}
                  </h3>
                  <Badge tone={CLASS_STATUS[c.status].tone}>
                    {CLASS_STATUS[c.status].label}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-ink-600">
                  <p>📅 יום {dayLabel(c.day_of_week)}</p>
                  <p>🕒 {formatTime(c.start_time)}–{formatTime(c.end_time)}</p>
                  <p>👥 {counts.get(c.id) ?? 0} מתוך {c.capacity} תלמידים</p>
                </div>
                <ButtonLink
                  href="/instructor/attendance"
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  סימון נוכחות
                </ButtonLink>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="אין חוגים משויכים" icon="🏊" />
      )}
    </div>
  );
}
