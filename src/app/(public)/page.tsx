import { ClassCard } from "@/components/classes/ClassCard";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeroSection } from "@/components/home/HeroSection";
import { SectionHead } from "@/components/home/SectionHead";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
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
        <ScrollReveal>
          <SectionHead
            eyebrow="החוגים שלנו"
            title="חוגים מובילים"
            sub="הצטרפו לחוגים הפופולריים שלנו"
            link="לכל החוגים"
            linkHref="/classes"
          />
        </ScrollReveal>

        {featured.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((cls, index) => (
              <ScrollReveal key={cls.id} delay={index * 80} className="h-full">
                <ClassCard cls={cls} />
              </ScrollReveal>
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
            <ScrollReveal>
              <SectionHead
                eyebrow="מנויים"
                title="מסלולים חודשיים"
                accent="var(--logo-magenta)"
                link="לכל המסלולים"
                linkHref="/programs"
              />
            </ScrollReveal>
            <div className="space-y-3">
              {(programs ?? []).map((p, index) => (
                <ScrollReveal key={p.id} delay={Math.min(index * 70, 280)}>
                  <PriceRow
                    title={p.title}
                    desc={p.description}
                    price={formatCurrency(p.price)}
                  />
                </ScrollReveal>
              ))}
              {(!programs || programs.length === 0) && (
                <EmptyMini text="אין מסלולים פעילים כרגע" />
              )}
            </div>
          </div>
          <div>
            <ScrollReveal delay={80}>
              <SectionHead
                eyebrow="גמיש"
                title="כניסות לבריכה"
                accent="var(--logo-cyan)"
              />
            </ScrollReveal>
            <div className="space-y-3">
              {(poolPasses ?? []).map((p, index) => (
                <ScrollReveal
                  key={p.id}
                  delay={Math.min(index * 70 + 80, 360)}
                >
                  <PriceRow
                    title={p.title}
                    desc={p.description}
                    price={formatCurrency(p.price)}
                  />
                </ScrollReveal>
              ))}
              {(!poolPasses || poolPasses.length === 0) && (
                <EmptyMini text="אין כניסות פעילות כרגע" />
              )}
            </div>
          </div>
        </div>
      </section>
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
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold text-ink-900">{title}</p>
        {desc && (
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{desc}</p>
        )}
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
