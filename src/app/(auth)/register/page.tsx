import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { BrandLogo } from "@/components/layout/BrandLogo";

export const metadata = { title: "הרשמה" };

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[440px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-700"
          >
            → חזרה לדף הבית
          </Link>

          <div className="mt-4">
            <BrandLogo height={44} />
          </div>

          <h1 className="mt-5 font-display text-[32px] font-extrabold text-ink-900">
            פתיחת חשבון
          </h1>
          <p className="mt-1.5 text-ink-500">
            הרשמו בחינם ונהלו את כל הפעילות של הילדים במקום אחד.
          </p>

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
        </div>
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
