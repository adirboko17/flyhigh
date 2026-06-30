import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatTime } from "@/utils/format";

export const metadata = { title: "דשבורד מדריכה" };

export default async function InstructorDashboard() {
  const profile = await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  const myClasses = instructor
    ? (
        await supabase
          .from("classes")
          .select("*")
          .eq("instructor_id", instructor.id)
          .order("day_of_week")
      ).data ?? []
    : [];

  const classIds = myClasses.map((c) => c.id);
  let studentCount = 0;
  if (classIds.length > 0) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .in("class_id", classIds)
      .eq("status", "active");
    studentCount = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          שלום, {profile.full_name} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-500">סקירת הפעילות שלך</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="החוגים שלי" value={myClasses.length} icon="🏊" tone="brand" />
        <StatCard label="תלמידים פעילים" value={studentCount} icon="🧒" tone="aqua" />
        <StatCard
          label="תעריף שעתי"
          value={instructor?.hourly_rate ? `₪${instructor.hourly_rate}` : "-"}
          icon="💰"
          tone="violet"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>החוגים שלי</CardTitle>
          <Link href="/instructor/classes" className="text-sm font-semibold text-brand-600 hover:underline">
            הכל
          </Link>
        </CardHeader>
        <CardContent>
          {myClasses.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {myClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-ink-900">{c.title}</p>
                    <p className="text-sm text-ink-500">
                      יום {dayLabel(c.day_of_week)} · {formatTime(c.start_time)}–{formatTime(c.end_time)}
                    </p>
                  </div>
                  <Badge tone={CLASS_STATUS[c.status].tone}>
                    {CLASS_STATUS[c.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="אין חוגים משויכים"
              description="פני למנהל המערכת לשיוך חוגים."
              icon="🏊"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
