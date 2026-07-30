"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  // התוכן גלוי ב-HTML הראשוני. כך רשת איטית או hydration מאוחר לעולם לא
  // משאירים אזורים ריקים; האנימציה מופעלת רק לאלמנטים שעדיין מתחת למסך.
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const mobileViewport = window.matchMedia("(max-width: 639px)");

    if (
      mobileViewport.matches ||
      reducedMotion.matches ||
      !("IntersectionObserver" in window)
    ) {
      setIsVisible(true);
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.92) {
      return;
    }

    setIsVisible(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={cn(
        "scroll-reveal transition-[opacity,transform] duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${Math.max(0, delay)}ms` }}
    >
      {children}
    </div>
  );
}
