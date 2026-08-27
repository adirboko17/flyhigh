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
import {
  formatInstructorPay,
  instructorStatusLabel,
  instructorTitle,
} from "@/lib/instructors/labels";

export const metadata = { title: "פרופיל מדריך" };

export default async function AdminInstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createAdminDataClient();

  const [{ data: instructor }, { data: documents }, { data: ownedClasses }, { data: slottedClasses }] =
    await Promise.all([
      supabase
        .from("instructors")
        .select(
          "id, full_name, gender, phone, hourly_rate, monthly_salary, pay_type, status, profile_id, created_at, profiles(email)"
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
      supabase.from("classes").select("id").eq("instructor_id", id),
      supabase.from("class_weekly_slots").select("class_id").eq("instructor_id", id),
    ]);

  const classCount = new Set([
    ...(ownedClasses ?? []).map((cls) => cls.id),
    ...(slottedClasses ?? []).map((slot) => slot.class_id),
  ]).size;

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
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar
              name={instructor.full_name}
              className="h-16 w-16 text-xl"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-xl font-bold text-ink-900">
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
                  <span dir="ltr" className="inline-block">
                    {email}
                  </span>
                ) : (
                  "ללא גישה למערכת"
                )}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FactTile
              label="מגדר"
              value={instructor.gender ? GENDER[instructor.gender] : "לא צוין"}
            />
            <FactTile label="טלפון" value={instructor.phone ?? "—"} dir="ltr" />
            <FactTile label="שכר" value={formatInstructorPay(instructor)} />
            <FactTile label="חוגים" value={String(classCount ?? 0)} />
            <FactTile
              label="מסמכים"
              value={String(documents?.length ?? 0)}
            />
            <FactTile
              label="גישה למערכת"
              value={email ? "יש חשבון" : "ללא חשבון"}
            />
          </dl>
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

function FactTile({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-2xl bg-ink-50 px-4 py-3">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd
        dir={dir}
        className="mt-1 truncate text-sm font-semibold text-ink-900"
      >
        {value}
      </dd>
    </div>
  );
}
