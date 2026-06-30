import { ClassCard } from "@/components/classes/ClassCard";
import { CtaSection } from "@/components/home/CtaSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeroSection } from "@/components/home/HeroSection";
import { SectionHead } from "@/components/home/SectionHead";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";
import type { PublicClass } from "@/types";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: classes }, { data: programs }, { data: poolPasses }] =
    await Promise.all([
      supabase.rpc("list_public_classes"),
      supabase.from("programs").select("*").eq("status", "active"),
      supabase.from("pool_passes").select("*").eq("status", "active"),
    ]);

  const featured = ((classes as PublicClass[]) ?? []).slice(0, 3);

  return (
    <>
      <HeroSection />
      <FeaturesSection />

      <section className="container-page pb-2 pt-14">
        <SectionHead
          eyebrow="החוגים שלנו"
          title="חוגים מובילים"
          sub="הצטרפו לחוגים הפופולריים שלנו"
          link="לכל החוגים"
          linkHref="/classes"
        />

        {featured.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            בקרוב ייפתחו חוגים חדשים. השאירו פרטים ונעדכן אתכם.
          </p>
        )}
      </section>

      <section id="programs" className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHead
              eyebrow="מנויים"
              title="מסלולים חודשיים"
              accent="var(--logo-magenta)"
            />
            <div className="space-y-3">
              {(programs ?? []).map((p) => (
                <PriceRow
                  key={p.id}
                  title={p.title}
                  desc={p.description}
                  price={formatCurrency(p.price)}
                />
              ))}
              {(!programs || programs.length === 0) && (
                <EmptyMini text="אין מסלולים פעילים כרגע" />
              )}
            </div>
          </div>
          <div>
            <SectionHead
              eyebrow="גמיש"
              title="כניסות לבריכה"
              accent="var(--logo-cyan)"
            />
            <div className="space-y-3">
              {(poolPasses ?? []).map((p) => (
                <PriceRow
                  key={p.id}
                  title={p.title}
                  desc={p.description}
                  price={formatCurrency(p.price)}
                />
              ))}
              {(!poolPasses || poolPasses.length === 0) && (
                <EmptyMini text="אין כניסות פעילות כרגע" />
              )}
            </div>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}

function PriceRow({
  title,
  desc,
  price,
}: {
  title: string;
  desc: string | null;
  price: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-ink-100 bg-white p-4 shadow-card">
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        {desc && <p className="mt-0.5 text-sm text-ink-500">{desc}</p>}
      </div>
      <span className="shrink-0 font-display text-lg font-extrabold text-brand-700">
        {price}
      </span>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
      {text}
    </p>
  );
}
