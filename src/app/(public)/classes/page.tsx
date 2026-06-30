import { ClassCard } from "@/components/classes/ClassCard";
import { createClient } from "@/lib/supabase/server";
import type { PublicClass } from "@/types";

export const metadata = {
  title: "חוגים",
  description: "כל חוגי השחייה ופעילויות המים של על הגובה.",
};

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_public_classes");
  const classes = (data as PublicClass[]) ?? [];

  return (
    <div className="bg-ink-50">
      <div className="bg-brand-gradient">
        <div className="container-page py-14 text-white">
          <h1 className="font-display text-4xl font-extrabold">החוגים שלנו</h1>
          <p className="mt-2 max-w-xl text-brand-50/90">
            בחרו את החוג המתאים לילד שלכם והירשמו בקלות. כל החוגים מועברים
            על ידי מדריכות מוסמכות.
          </p>
        </div>
      </div>

      <div className="container-page py-12">
        {classes.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-ink-500">
              נמצאו {classes.length} חוגים פעילים
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <ClassCard key={cls.id} cls={cls} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-16 text-center">
            <p className="text-2xl">🏊</p>
            <p className="mt-3 font-display text-lg font-bold text-ink-800">
              אין חוגים פעילים כרגע
            </p>
            <p className="mt-1 text-sm text-ink-500">
              חזרו אלינו בקרוב — אנחנו כל הזמן פותחים חוגים חדשים.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
