import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { BrandLogo } from "@/components/layout/BrandLogo";

export const metadata = { title: "התחברות" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-700"
          >
            חזרה לדף הבית
          </Link>

          <div className="mt-4">
            <BrandLogo height={48} />
          </div>

          <h1 className="mt-5 font-display text-[32px] font-extrabold text-ink-900">
            ברוכים השבים 👋
          </h1>
          <p className="mt-1.5 text-ink-500">התחברו לאזור האישי שלכם</p>

          <div className="mt-7">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-4 text-center text-sm text-ink-500">
            אין לכם חשבון?{" "}
            <Link href="/register" className="font-bold text-brand-600 hover:underline">
              הרשמה
            </Link>
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 p-4 text-xs text-ink-500">
            <p className="mb-1 font-semibold text-ink-600">חשבונות לדוגמה (דמו):</p>
            <ul className="space-y-0.5" dir="ltr">
              <li>admin@al-hagova.co.il</li>
              <li>dana@al-hagova.co.il</li>
              <li>michal@example.com</li>
              <li>Password123!</li>
            </ul>
          </div>
        </div>
      </div>

      <AuthBrandPanel
        points={[
          "כל ההרשמות והתשלומים במקום אחד",
          "מעקב נוכחות וקבלות דיגיטליות",
          "עדכונים על חוגים חדשים ורשימות המתנה",
        ]}
      />
    </div>
  );
}
