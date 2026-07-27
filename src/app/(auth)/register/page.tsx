import { Suspense } from "react";
import Link from "next/link";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata = { title: "הרשמה" };

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative flex items-start justify-center overflow-hidden px-6 py-14">
        <ScrollReveal className="relative z-10 w-full max-w-[440px]">
          <div className="flex justify-start">
            <AuthHomeLink />
          </div>

          <div className="mt-8 text-right">
            <h1 className="font-display text-[32px] font-extrabold text-ink-900">
              פתיחת חשבון
            </h1>
            <p className="mt-1.5 text-ink-500">
              הרשמו בחינם ונהלו את כל הפעילות של הילדים במקום אחד.
            </p>
          </div>

          <div className="mt-7">
            <Suspense>
              <RegisterForm />
            </Suspense>
          </div>

          <p className="mt-4 text-center text-sm text-ink-500">
            כבר יש לכם חשבון?{" "}
            <Link href="/login" className="font-bold text-brand-600 hover:underline">
              התחברות
            </Link>
          </p>
        </ScrollReveal>
      </div>

      <AuthBrandPanel
        points={[
          "הרשמה לחוגים ותשלום מאובטח אונליין",
          "ניהול כל הילדים בפרופיל משפחתי אחד",
          "מעקב נוכחות וקבלות דיגיטליות",
          "התראות על פתיחת חוגים ורשימות המתנה",
        ]}
      />
    </div>
  );
}
