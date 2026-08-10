"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/Icon";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HERO_CAROUSEL_IMAGES } from "@/lib/constants";

const CYN = "var(--logo-cyan)";
const INTERVAL_MS = 3800;
const images = HERO_CAROUSEL_IMAGES;

export function AboutGallery() {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function go(dir: 1 | -1) {
    const root = scrollerRef.current;
    if (!root) return;
    const items = Array.from(root.children) as HTMLElement[];
    if (items.length === 0) return;

    // מיקום ויזואלי (עובד גם ב-RTL) — בלי scrollIntoView, כדי לא
    // לגרור את גלילת העמוד כולו לאזור הגלריה.
    const rootRect = root.getBoundingClientRect();
    const marker = rootRect.left + rootRect.width / 2;
    let current = 0;
    let best = Number.POSITIVE_INFINITY;
    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - marker);
      if (dist < best) {
        best = dist;
        current = i;
      }
    });

    const next = (current + dir + items.length) % items.length;
    const target = items[next];
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const delta =
      targetRect.left -
      rootRect.left -
      (root.clientWidth - target.offsetWidth) / 2;
    root.scrollBy({ left: delta, behavior: "smooth" });
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches || paused || lightboxIndex !== null) return;

    const root = scrollerRef.current;
    if (!root) return;

    // אוטופליי רק כשהגלריה נראית — מונע תזוזות בזמן שהמשתמש בהירו.
    let inView = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
      },
      { threshold: 0.2 }
    );
    observer.observe(root);

    const id = window.setInterval(() => {
      if (inView) go(1);
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      observer.disconnect();
    };
  }, [paused, lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) =>
          i === null ? i : (i - 1 + images.length) % images.length
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) =>
          i === null ? i : (i + 1) % images.length
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxIndex]);

  return (
    <div className="mt-12 sm:mt-14 lg:mt-16">
      <ScrollReveal>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
          <div>
            <span
              className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide"
              style={{ color: CYN }}
            >
              <span
                className="h-0.5 w-[22px] rounded-sm"
                style={{ background: CYN }}
              />
              מהמרכז
            </span>
            <h3 className="mt-2 font-display text-xl font-extrabold text-ink-900 sm:text-2xl">
              רגעים מהבריכה ומהחוגים
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="תמונה קודמת"
              onClick={() => go(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-sm transition hover:border-ink-300 hover:bg-ink-50"
            >
              <Icon name="arrow" size={16} className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label="תמונה הבאה"
              onClick={() => go(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-sm transition hover:border-ink-300 hover:bg-ink-50"
            >
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <ul
            ref={scrollerRef}
            className="about-gallery-track flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((src, i) => (
              <li
                key={src}
                className="group relative h-[148px] w-[78%] shrink-0 snap-center overflow-hidden rounded-[18px] bg-ink-100 shadow-[0_1px_2px_rgba(16,42,75,0.06)] sm:h-[168px] sm:w-[42%] lg:h-[180px] lg:w-[30%]"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="absolute inset-0 z-[1] cursor-zoom-in"
                  aria-label={`פתיחת תמונה ${i + 1} בגודל מלא`}
                />
                <Image
                  src={src}
                  alt={`רגע ממרכז על הגובה ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 78vw, (max-width: 1024px) 42vw, 30vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(6,49,79,0.16)_100%)]"
                />
              </li>
            ))}
          </ul>
        </div>
      </ScrollReveal>

      {mounted &&
        lightboxIndex !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="תצוגת תמונה מלאה"
          >
            <button
              type="button"
              className="absolute inset-0 bg-ink-950/85 backdrop-blur-[3px]"
              aria-label="סגירת תמונה"
              onClick={() => setLightboxIndex(null)}
            />

            <button
              type="button"
              aria-label="סגירה"
              onClick={() => setLightboxIndex(null)}
              className="absolute end-3 top-3 z-[2] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:end-5 sm:top-5"
            >
              <Icon name="x" size={18} />
            </button>

            <button
              type="button"
              aria-label="תמונה קודמת"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (lightboxIndex - 1 + images.length) % images.length
                );
              }}
              className="absolute start-2 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:start-5"
            >
              <Icon name="arrow" size={18} className="rotate-180" />
            </button>

            <button
              type="button"
              aria-label="תמונה הבאה"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % images.length);
              }}
              className="absolute end-2 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:end-5"
            >
              <Icon name="arrow" size={18} />
            </button>

            <div className="relative z-[1] h-[min(82vh,860px)] w-full max-w-5xl overflow-hidden rounded-2xl bg-ink-900 shadow-2xl">
              <Image
                src={images[lightboxIndex]}
                alt={`רגע ממרכז על הגובה ${lightboxIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            <p className="absolute bottom-4 z-[2] rounded-full bg-black/35 px-3 py-1 text-sm text-white/90 backdrop-blur-sm">
              {lightboxIndex + 1} / {images.length}
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}
