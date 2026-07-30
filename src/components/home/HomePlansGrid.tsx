"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  PlanPurchaseTrigger,
  type PlanViewer,
} from "@/components/programs/PlanPurchase";
import { PROGRAM_CARD_TEMPLATES } from "@/lib/program-cards";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

type Program = {
  id: string;
  title: string;
  description: string | null;
  price: number;
};

type PoolPass = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  entries_count: number;
};

export function HomePlansGrid({
  programs,
  poolPasses,
  viewer,
}: {
  programs: Program[];
  poolPasses: PoolPass[];
  viewer: PlanViewer;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {programs.map((p, index) => {
        const template =
          PROGRAM_CARD_TEMPLATES[index % PROGRAM_CARD_TEMPLATES.length];

        return (
          <ScrollReveal
            key={p.id}
            delay={Math.min((index % 2) * 80, 80)}
            className="h-full"
          >
            <PlanPurchaseTrigger
              planKind="program"
              planId={p.id}
              planTitle={p.title}
              price={p.price}
              viewer={viewer}
              className="h-full"
            >
              <PlanSummaryCard
                title={p.title}
                desc={p.description}
                price={formatCurrency(p.price)}
                period={template.period}
                accent={template.accent}
                highlighted={template.featured}
                badge={template.badge}
              />
            </PlanPurchaseTrigger>
          </ScrollReveal>
        );
      })}

      {poolPasses.map((p, index) => (
        <ScrollReveal
          key={p.id}
          delay={Math.min((index % 2) * 80, 80)}
          className="h-full"
        >
          <PlanPurchaseTrigger
            planKind="pool_pass"
            planId={p.id}
            planTitle={p.title}
            price={p.price}
            entriesCount={p.entries_count}
            viewer={viewer}
            className="h-full"
          >
            <PassSummaryCard
              title={p.title}
              desc={p.description}
              price={formatCurrency(p.price)}
            />
          </PlanPurchaseTrigger>
        </ScrollReveal>
      ))}
    </div>
  );
}

function PlanSummaryCard({
  title,
  desc,
  price,
  period,
  accent,
  highlighted = false,
  badge,
}: {
  title: string;
  desc: string | null;
  price: string;
  period?: string;
  accent: string;
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-[22px] bg-white p-6 shadow-card",
        highlighted ? "border-2" : "border border-ink-100"
      )}
      style={highlighted ? { borderColor: accent } : undefined}
    >
      {highlighted && badge && (
        <span
          className="absolute -top-3 end-5 rounded-full px-3 py-1 text-xs font-extrabold text-white"
          style={{ background: accent }}
        >
          {badge}
        </span>
      )}

      <h3 className="break-words font-display text-[19px] font-extrabold leading-snug text-ink-900">
        {title}
      </h3>
      {desc && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{desc}</p>
      )}

      <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-5">
        <span className="font-display text-2xl font-extrabold text-ink-900">
          {price}
        </span>
        {period && (
          <span className="text-sm font-semibold text-ink-400">{period}</span>
        )}
      </div>
    </div>
  );
}

function PassSummaryCard({
  title,
  desc,
  price,
}: {
  title: string;
  desc: string | null;
  price: string;
}) {
  return (
    <div className="flex h-full items-center justify-between gap-4 rounded-[22px] border border-ink-100 bg-white p-5 shadow-card">
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
