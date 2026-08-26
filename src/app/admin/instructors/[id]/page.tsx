import Link from "next/link";
import { notFound } from "next/navigation";
import { InstructorDocumentsPanel } from "@/components/instructors/InstructorDocumentsPanel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { requireRole } from "@/lib/auth";
import { GENDER } from "@/lib/constants";
import { instructorStatusLabel, instructorTitle } from "@/lib/instructors/labels";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "פרופיל מדריך" };

export default async function AdminInstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createAdminDataClient();

  const [{ data: instructor }, { data: documents }, { count: classCount }] =
    await Promise.all([
      supabase
        .from("instructors")
        .select(
          "id, full_name, gender, phone, hourly_rate, status, profile_id, created_at, profiles(email)"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("instructor_documents")
        .select(
          "id, title, category, file_name, file_path, file_size, mime_type, notes, created_at"
        )
        .eq("instructor_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", id),
    ]);

  if (!instructor) notFound();

  const email = instructor.profiles?.email ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/instructors"
          className="mb-3 inline-flex text-sm font-medium text-ink-500 transition hover:text-ink-800"
        >
          ← חזרה למדריכים
        </Link>
        <PageHeader
          title={instructor.full_name}
          description={`פרופיל ${instructorTitle(instructor.gender)} · פרטים ומסמכי העסקה`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי {instructorTitle(instructor.gender)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <Avatar name={instructor.full_name} className="h-14 w-14 text-lg" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-bold text-ink-900">
                    {instructor.full_name}
                  </p>
                  <Badge
                    tone={instructor.status === "active" ? "success" : "neutral"}
                  >
                    {instructorStatusLabel(instructor.status, instructor.gender)}
                  </Badge>
                </div>
                <p className="text-sm text-ink-500">
                  {email ? (
                    <span dir="ltr" className="inline-block text-right">
                      {email}
                    </span>
                  ) : (
                    "ללא גישה למערכת"
                  )}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:text-end">
              <div>
                <dt className="text-ink-400">מגדר</dt>
                <dd className="font-medium text-ink-800">
                  {instructor.gender ? GENDER[instructor.gender] : "לא צוין"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">טלפון</dt>
                <dd dir="ltr" className="font-medium text-ink-800 sm:text-end">
                  {instructor.phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">תעריף שעתי</dt>
                <dd className="font-medium text-ink-800">
                  {formatCurrency(instructor.hourly_rate)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">חוגים</dt>
                <dd className="font-medium text-ink-800">{classCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-ink-400">מסמכים</dt>
                <dd className="font-medium text-ink-800">
                  {documents?.length ?? 0}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">
              מסמכים
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              טופס 101, הסכמי העסקה ומסמכים נוספים — גלויים גם למדריכה באזור
              האישי שלה
            </p>
          </div>
        </div>

        <InstructorDocumentsPanel
          instructorId={instructor.id}
          documents={documents ?? []}
          canManage
          emptyDescription="עדיין לא הועלו מסמכים למדריכה זו. העלו טופס 101, הסכם העסקה או מסמך אחר."
        />
      </div>
    </div>
  );
}
