export const PAYMENT_RULES = [
  "ניתן לפרוס לתשלומים באשראי לפי מה שמפורט תחת כל חוג",
  "המחיר עבור חודש במלואו (גם במידה ויש חגים). לפחות 30 מפגשים שנתיים",
  "הנחה לבן משפחה שני והלאה 5%.",
  "פתיחת החוג וקיומו מותנה במספר משתתפים: 8 בכל קבוצה לפחות. (במקרה של סגירת הקבוצה תוחזר יתרת התשלום הנותרת).",
  "חוג שלא תושלם בו מלוא מכסת המפגשים, יחושב ויוחזר החלק היחסי שלא הושלם.",
  "פרישה עד לתום המפגש הרביעי, לאחריו לא יוחזר תשלום. במקרה של פרישה ישולמו השיעורים שהיו עד להודעת הפרישה+50₪ עמלה.",
  "פרישה לאחר השיעור הראשון – ללא חיוב (שיעור ניסיון חינם).",
  "פרישה מהשיעור הראשון עד השיעור הרביעי - תהיה כרוכה בחיוב של חודש אחד.",
  "פרישה מהשיעור החמישי ועד סוף דצמבר- תהיה כרוכה בחיוב של החודשים בהם הגיע המשתתף לחוג.",
] as const;

export const PAYMENT_RULE_LETTERS = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ז",
  "ח",
  "ט",
] as const;

/** מלל התקנון — אותו תוכן בהרשמה ובעמוד הציבורי. */
export function TermsContent() {
  return (
    <div className="space-y-6 text-[15px] leading-relaxed text-ink-700">
      <section>
        <p className="font-display text-base font-extrabold text-ink-900 sm:text-lg">
          מחירי החוגים כוללים ביטוח!
        </p>
        <p className="mt-3 font-semibold text-ink-800">המחיר לא כולל:</p>
        <p className="mt-1">
          תחרויות ופעילויות העשרה וכיף מעבר למפגשים המתוכננים.
        </p>
      </section>

      <section>
        <h3 className="font-display text-base font-extrabold text-ink-900 sm:text-lg">
          נהלי תשלום
        </h3>
        <ol className="mt-3 flex list-none flex-col gap-2.5 p-0">
          {PAYMENT_RULES.map((rule, index) => (
            <li key={rule} className="flex gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {PAYMENT_RULE_LETTERS[index]}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
