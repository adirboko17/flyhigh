import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddChildForm } from "@/components/parent/AddChildForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { GENDER } from "@/lib/constants";
import { calcAge, formatDate } from "@/utils/format";

export const metadata = { title: "הילדים שלי" };

export default async function ParentChildrenPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("*")
    .order("created_at");

  return (
    <div className="space-y-6">
      <PageHeader
        title="הילדים שלי"
        description="ניהול הילדים המשויכים לחשבון שלכם"
      />

      <AddChildForm parentId={profile.id} />

      {children && children.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => {
            const age = calcAge(c.birth_date);
            return (
              <Card key={c.id}>
                <CardContent className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-2xl">
                    🧒
                  </span>
                  <div>
                    <p className="font-display font-bold text-ink-900">
                      {c.full_name}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {c.gender ? GENDER[c.gender] : "—"}
                      {age !== null && ` · גיל ${age}`}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">
                      תאריך לידה: {formatDate(c.birth_date)}
                    </p>
                    {c.notes && (
                      <p className="mt-2 rounded-lg bg-ink-50 px-2.5 py-1 text-xs text-ink-600">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="עדיין לא הוספתם ילדים"
          description="הוסיפו את הילדים שלכם כדי להירשם לחוגים."
          icon="🧒"
        />
      )}
    </div>
  );
}
