import { Suspense } from "react";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Orb } from "@/components/home/Orb";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata = { title: "איפוס סיסמה" };

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* במובייל התוכן נעוץ לראש העמוד (כמו בהתחברות), כי הטופס כאן קצר יותר
          ומרכוז אנכי היה מוריד אותו נמוך מדי. בדסקטופ נשמר המרכוז. */}
      <div className="relative flex items-start justify-center overflow-hidden px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top,0px))] sm:px-6 sm:pb-12 sm:pt-[calc(6rem+env(safe-area-inset-top,0px))] lg:items-center lg:py-12">
        {/* רקע מותגי עדין — במובייל בלבד, שם פאנל המותג לא מוצג. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
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
          {/* מכסה את קצה ה-Orb בצבע אחיד כדי להתחבר ל-safe area בלי תפר צדדי. */}
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50 via-brand-50/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-brand-50/70 to-brand-50" />
        </div>

        {/* במובייל הכפתור נעוץ לראש העמוד, ומיושר לרוחב עמודת התוכן. */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(1rem+env(safe-area-inset-top,0px))] z-20 flex justify-center px-5 sm:top-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:px-6 lg:hidden">
          <div className="pointer-events-auto flex w-full max-w-[400px] justify-start">
            <AuthHomeLink />
          </div>
        </div>

        <ScrollReveal className="relative z-10 w-full max-w-[400px]">
          <div className="hidden justify-start lg:flex">
            <AuthHomeLink />
          </div>

          {/* במובייל הלוגו מחובר לכרטיס וחצי ממנו בולט מעל הקצה העליון. */}
          <div className="relative mt-12 rounded-3xl border border-ink-100 bg-white/95 px-5 pb-5 pt-16 shadow-card backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-16 lg:contents">
            <div className="auth-logo-badge absolute left-1/2 top-0 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white sm:h-24 sm:w-24 lg:hidden">
              <BrandLogo href="" height={38} />
            </div>
            <div className="text-right lg:mt-8">
              <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-[32px]">
                שכחתם סיסמה? 🔑
              </h1>
              <p className="mt-1.5 text-ink-500">
                נאמת את המייל בקוד ונאפשר לבחור סיסמה חדשה.
              </p>
            </div>

            <div className="mt-6 lg:mt-7">
              <Suspense>
                <ForgotPasswordForm />
              </Suspense>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <AuthBrandPanel
        points={[
          "איפוס מאובטח בקוד חד-פעמי למייל",
          "הסיסמה מתחלפת מיד ואפשר להתחבר מכל מכשיר",
          "אין צורך לפנות למשרד או להמתין לתמיכה",
        ]}
      />
    </div>
  );
}
