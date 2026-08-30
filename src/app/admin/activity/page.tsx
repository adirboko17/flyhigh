import { PageHeader } from "@/components/ui/PageHeader";
import { ActivityFeed, type ActivityEntry } from "@/components/admin/ActivityFeed";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { ENROLLMENT_TYPE } from "@/lib/constants";
import { isAbandonedCardcomEnrollment } from "@/lib/enrollment/holdsSeat";
import { formatDate } from "@/utils/format";

export const metadata = { title: "פעילות אחרונה" };

function dayKeyOf(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * תוויות התאריך מחושבות בשרת ונשלחות מוכנות ללקוח, כדי שהקיבוץ לא יהיה תלוי
 * באזור הזמן של הדפדפן וייווצר פער בין ה-HTML של השרת לזה של ההידרציה.
 */
function dayLabelOf(date: Date, today: string, yesterday: string) {
  const key = dayKeyOf(date);
  if (key === today) return "היום";
  if (key === yesterday) return "אתמול";
  return formatDate(date);
}

export default async function AdminActivityPage() {
  const supabase = await createAdminDataClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, parent_id, type, status, payment_status, admin_assigned, created_at, classes(title), programs(title), pool_passes(title), private_lessons(title), children(full_name), profiles(full_name, phone), payments(status, payment_method, external_reference, office_collection)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const now = new Date();
  const todayKey = dayKeyOf(now);
  const yesterdayKey = dayKeyOf(new Date(now.getTime() - 86_400_000));

  const entries: ActivityEntry[] = (enrollments ?? [])
    .filter((e) => !isAbandonedCardcomEnrollment(e))
    .map((e) => {
    const createdAt = new Date(e.created_at);
    return {
      id: e.id,
      parentId: e.parent_id,
      type: e.type,
      status: e.status,
      payment_status: e.payment_status,
      adminAssigned: e.admin_assigned,
      created_at: e.created_at,
      title:
        e.classes?.title ??
        e.programs?.title ??
        e.pool_passes?.title ??
        e.private_lessons?.title ??
        ENROLLMENT_TYPE[e.type],
      parentName: e.profiles?.full_name ?? null,
      parentPhone: e.profiles?.phone ?? null,
      childName: e.children?.full_name ?? null,
      dayKey: dayKeyOf(createdAt),
      dayLabel: dayLabelOf(createdAt, todayKey, yesterdayKey),
      timeLabel: createdAt.toTimeString().slice(0, 5),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="פעילות אחרונה"
        description="כל ההרשמות לחוגים, מסלולים, כניסות ושיעורים פרטיים — מהחדשה לישנה"
      />
      <ActivityFeed entries={entries} todayKey={todayKey} />
    </div>
  );
}
