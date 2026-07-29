import { Suspense } from "react";
import Link from "next/link";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Orb } from "@/components/home/Orb";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata = { title: "התחברות" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative flex items-center justify-center overflow-hidden px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-20 sm:px-6 sm:pb-12 sm:pt-24 lg:py-12">
        {/* רקע מותגי עדין — במובייל בלבד, שם פאנל המותג לא מוצג. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50 via-brand-50/40 to-transparent" />
          <Orb
            color="var(--logo-cyan)"
            size={260}
            top={-130}
            right={-90}
            blur={80}
            opacity={0.18}
          />
          <Orb
            color="var(--logo-magenta)"
            size={220}
            bottom={-90}
            left={-70}
            blur={80}
            opacity={0.14}
          />
        </div>

        {/* במובייל הכפתור נעוץ לראש העמוד, ומיושר לרוחב עמודת התוכן. */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-5 sm:top-6 sm:px-6 lg:hidden">
          <div className="pointer-events-auto flex w-full max-w-[400px] justify-start">
            <AuthHomeLink />
          </div>
        </div>

        <ScrollReveal className="relative z-10 w-full max-w-[400px]">
          <div className="hidden justify-start lg:flex">
            <AuthHomeLink />
          </div>

          <div className="flex justify-center lg:hidden">
            <BrandLogo href="" height={54} />
          </div>

          {/* במובייל הטופס יושב בכרטיס; בדסקטופ העטיפה נעלמת (contents) והפריסה נשמרת. */}
          <div className="mt-6 rounded-3xl border border-ink-100 bg-white/95 p-5 shadow-card backdrop-blur-sm sm:p-6 lg:contents">
            <div className="text-right lg:mt-8">
              <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-[32px]">
                ברוכים השבים 👋
              </h1>
              <p className="mt-1.5 text-ink-500">התחברו לאזור האישי שלכם</p>
            </div>

            <div className="mt-6 lg:mt-7">
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>

            <p className="mt-4 text-center text-sm text-ink-500">
              אין לכם משתמש?{" "}
              <Link href="/register" className="font-bold text-brand-600 hover:underline">
                הרשמה
              </Link>
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 p-4 text-xs text-ink-500 lg:mt-6">
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
