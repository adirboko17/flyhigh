import { ContactForm } from "@/components/contact/ContactForm";
import { ContactInfo } from "@/components/contact/ContactInfo";
import { PublicPageHero } from "@/components/layout/PublicPageHero";

export const metadata = {
  title: "צור קשר",
  description: "יצירת קשר עם על הגובה - טלפון, דוא״ל, כתובת וטופס פנייה.",
};

export default function ContactPage() {
  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="phone"
        badgeIconColor="var(--logo-orange)"
        badgeText="צור קשר · נשמח לעזור"
        title="דברו איתנו"
        description="יש שאלה על חוגים, מסלולים או הרשמה? השאירו פרטים ונחזור אליכם בהקדם, או פנו אלינו ישירות בטלפון ובמייל."
      />

      <section className="container-page relative z-[3] py-12 pb-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-brand-600">
              <span className="h-0.5 w-[22px] rounded-sm bg-brand-600" />
              פרטי התקשרות
            </span>
            <h2 className="mt-2.5 font-display text-[34px] font-extrabold leading-tight text-ink-900">
              איך מגיעים אלינו
            </h2>
            <p className="mt-1.5 text-ink-500">
              אפשר לפנות אלינו בכל דרך שנוחה לכם. נשמח לענות בשעות הפעילות.
            </p>
            <div className="mt-8">
              <ContactInfo />
            </div>
          </div>

          <div className="feat-card rounded-[26px] border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[var(--logo-magenta)]">
              <span className="h-0.5 w-[22px] rounded-sm bg-[var(--logo-magenta)]" />
              טופס פנייה
            </span>
            <h2 className="mt-2.5 font-display text-[28px] font-extrabold leading-tight text-ink-900">
              השאירו פרטים
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              מלאו את הטופס ונחזור אליכם בהקדם האפשרי.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
