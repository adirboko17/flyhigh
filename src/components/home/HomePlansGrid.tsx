"use client";

import Link from "next/link";
import { SectionHead } from "@/components/home/SectionHead";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  PlanPurchaseTrigger,
  type PlanViewer,
} from "@/components/programs/PlanPurchase";
import { PlanTicketCard } from "@/components/programs/PlanTicketCard";
import {
  POOL_PASS_CARD_TEMPLATES,
  PRIVATE_LESSON_CARD_TEMPLATES,
  PROGRAM_CARD_TEMPLATES,
  programDurationLabel,
} from "@/lib/program-cards";
import { formatCurrency } from "@/utils/format";

const HOME_PREVIEW_LIMIT = 2;

type Program = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
};

type PoolPass = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  entries_count: number;
};

type PrivateLesson = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

export function HomePlansGrid({
  programs,
  poolPasses,
  privateLessons,
  viewer,
}: {
  programs: Program[];
  poolPasses: PoolPass[];
  privateLessons: PrivateLesson[];
  viewer: PlanViewer;
}) {
  const previewPrograms = programs.slice(0, HOME_PREVIEW_LIMIT);
  const previewPasses = poolPasses.slice(0, HOME_PREVIEW_LIMIT);
  const previewLessons = privateLessons.slice(0, HOME_PREVIEW_LIMIT);

  return (
    <div className="space-y-14">
      {programs.length > 0 && (
        <div>
          <ScrollReveal>
            <SectionHead
              eyebrow="מנויים"
              title="מסלולים חודשיים"
              sub="שחייה חופשית, כמה שבא לכם"
              accent="var(--logo-magenta)"
            />
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {previewPrograms.map((p, index) => {
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
                    className="h-full hover:translate-y-0 hover:shadow-none"
                  >
                    <PlanTicketCard
                      compact
                      name={p.title}
                      desc={p.description}
                      price={formatCurrency(p.price)}
                      period={programDurationLabel(p.duration_months)}
                      stub={{
                        kind: "months",
                        count: p.duration_months,
                      }}
                      features={template.features}
                      icon={template.icon}
                      accent={template.accent}
                      featured={template.featured}
                      badge={template.badge}
                    />
                  </PlanPurchaseTrigger>
                </ScrollReveal>
              );
            })}
          </div>
          {programs.length > HOME_PREVIEW_LIMIT && (
            <SeeAllLink href="/programs#memberships" />
          )}
        </div>
      )}

      {poolPasses.length > 0 && (
        <div>
          <ScrollReveal>
            <SectionHead
              eyebrow="גמיש"
              title="כניסות לבריכה"
              sub="מתאים לאורחים ולשחיינים מזדמנים"
              accent="var(--logo-cyan)"
            />
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {previewPasses.map((p, index) => {
              const template =
                POOL_PASS_CARD_TEMPLATES[
                  index % POOL_PASS_CARD_TEMPLATES.length
                ];

              return (
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
                    className="h-full hover:translate-y-0 hover:shadow-none"
                  >
                    <PlanTicketCard
                      compact
                      name={p.title}
                      desc={p.description}
                      price={formatCurrency(p.price)}
                      stub={{ kind: "entries", count: p.entries_count }}
                      features={template.features}
                      icon={template.icon}
                      accent={template.accent}
                      featured={template.featured}
                      badge={template.badge}
                    />
                  </PlanPurchaseTrigger>
                </ScrollReveal>
              );
            })}
          </div>
          {poolPasses.length > HOME_PREVIEW_LIMIT && (
            <SeeAllLink href="/programs#pool-passes" />
          )}
        </div>
      )}

      {privateLessons.length > 0 && (
        <div>
          <ScrollReveal>
            <SectionHead
              eyebrow="אישי"
              title="שיעורים פרטיים"
              sub="שיעור אחד־על־אחד — ניצור קשר לתיאום מועד"
              accent="var(--logo-magenta)"
            />
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {previewLessons.map((lesson, index) => {
              const template =
                PRIVATE_LESSON_CARD_TEMPLATES[
                  index % PRIVATE_LESSON_CARD_TEMPLATES.length
                ];

              return (
                <ScrollReveal
                  key={lesson.id}
                  delay={Math.min((index % 2) * 80, 80)}
                  className="h-full"
                >
                  <PlanPurchaseTrigger
                    planKind="private_lesson"
                    planId={lesson.id}
                    planTitle={lesson.title}
                    price={lesson.price}
                    durationMinutes={lesson.duration_minutes}
                    viewer={viewer}
                    className="h-full hover:translate-y-0 hover:shadow-none"
                  >
                    <PlanTicketCard
                      compact
                      name={lesson.title}
                      desc={lesson.description}
                      price={formatCurrency(lesson.price)}
                      stub={{
                        kind: "minutes",
                        count: lesson.duration_minutes,
                      }}
                      features={template.features}
                      icon={template.icon}
                      accent={template.accent}
                      featured={template.featured}
                      badge={template.badge}
                    />
                  </PlanPurchaseTrigger>
                </ScrollReveal>
              );
            })}
          </div>
          {privateLessons.length > HOME_PREVIEW_LIMIT && (
            <SeeAllLink href="/programs#private-lessons" />
          )}
        </div>
      )}
    </div>
  );
}

function SeeAllLink({ href }: { href: string }) {
  return (
    <div className="mt-6 flex justify-center">
      <Link
        href={href}
        className="ah-btn ah-btn--outline inline-flex items-center gap-1.5 px-5 py-2.5 text-sm"
      >
        לראות את כולם
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
    </div>
  );
}
