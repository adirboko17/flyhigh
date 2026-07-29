import { Suspense } from "react";
import Link from "next/link";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata = { title: "התחברות" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative flex items-center justify-center overflow-hidden px-5 py-10 sm:px-6 sm:py-12">
        <ScrollReveal className="relative z-10 w-full max-w-[400px]">
          <div className="flex justify-start">
            <AuthHomeLink />
          </div>

          <div className="mt-8 text-right">
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-[32px]">
              ברוכים השבים 👋
            </h1>
            <p className="mt-1.5 text-ink-500">התחברו לאזור האישי שלכם</p>
          </div>

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
            <ul className="space-y-0.5 break-all" dir="ltr">
              <li>admin@al-hagova.co.il</li>
              <li>dana@al-hagova.co.il</li>
              <li>michal@example.com</li>
              <li>Password123!</li>
            </ul>
          </div>
        </ScrollReveal>
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
