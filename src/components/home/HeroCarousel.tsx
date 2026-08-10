"use client";

import Image from "next/image";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { HERO_CAROUSEL_IMAGES } from "@/lib/constants";

const INTERVAL_MS = 4500;
const TRANSITION_MS = 900;

type CarouselCtx = {
  slides: readonly string[];
  index: number;
  reduceMotion: boolean;
  bindSwipe: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
  };
};

const HeroCarouselContext = createContext<CarouselCtx | null>(null);

function useHeroCarousel() {
  const ctx = useContext(HeroCarouselContext);
  if (!ctx) {
    throw new Error("HeroCarousel parts must be used within HeroCarouselProvider");
  }
  return ctx;
}

export function HeroCarouselProvider({
  images = HERO_CAROUSEL_IMAGES,
  children,
}: {
  images?: readonly string[];
  children: ReactNode;
}) {
  const slides = images.length > 0 ? images : HERO_CAROUSEL_IMAGES;
  const [index, setIndex] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const slideCount = slides.length;

  function step(delta: number) {
    setIndex((current) => (((current + delta) % slideCount) + slideCount) % slideCount);
  }

  useEffect(() => {
    if (reduceMotion || slideCount < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (((current + 1) % slideCount) + slideCount) % slideCount);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, slideCount]);

  const value: CarouselCtx = {
    slides,
    index,
    reduceMotion,
    bindSwipe: {
      onTouchStart: (e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? 0;
      },
      onTouchEnd: (e) => {
        if (touchStartX.current == null) return;
        const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 40) return;
        step(delta > 0 ? -1 : 1);
      },
    },
  };

  return (
    <HeroCarouselContext.Provider value={value}>
      {children}
    </HeroCarouselContext.Provider>
  );
}

/** רקע full-bleed לקרוסלה — מובייל ודסקטופ. */
export function HeroCarouselBackground({
  sizes = "100vw",
}: {
  sizes?: string;
}) {
  const { slides, index, reduceMotion, bindSwipe } = useHeroCarousel();

  return (
    <div
      data-hero-carousel-bg
      className="absolute inset-0 z-0 overflow-hidden"
      aria-hidden
      {...bindSwipe}
    >
      <SlideStack
        slides={slides}
        index={index}
        sizes={sizes}
        imageClassName="object-cover"
        animate={!reduceMotion}
      />
      {/* כהות ממורכזת לקריאות הטקסט + עומק מלמעלה/למטה */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,49,79,0.88)_0%,rgba(6,49,79,0.68)_42%,rgba(6,49,79,0.42)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,49,79,0.62)_0%,rgba(6,49,79,0.38)_36%,rgba(6,49,79,0.45)_66%,rgba(6,49,79,0.72)_100%)]" />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}

function SlideStack({
  slides,
  index,
  sizes,
  imageClassName,
  animate,
}: {
  slides: readonly string[];
  index: number;
  sizes: string;
  imageClassName: string;
  animate: boolean;
}) {
  return (
    <div className="absolute inset-0">
      {slides.map((src, i) => {
        const active = i === index;
        return (
          <div
            key={src}
            className={[
              "absolute inset-0 transition-opacity ease-out",
              active ? "opacity-100" : "opacity-0",
              animate && active ? "hero-carousel-ken" : "",
            ].join(" ")}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
            aria-hidden={!active}
          >
            <Image
              src={src}
              alt={active ? "רגעים מבית הספר לשחייה על הגובה" : ""}
              fill
              sizes={sizes}
              className={imageClassName}
              priority={i === 0}
            />
          </div>
        );
      })}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
