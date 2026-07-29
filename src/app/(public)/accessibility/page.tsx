import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { BRAND, CONTACT } from "@/lib/constants";
import type { IconName } from "@/components/icons/paths";

export const metadata = {
  title: "הצהרת נגישות",
  description:
    "הצהרת הנגישות של על הגובה - התאמות הנגישות באתר ובמתקן, רמת התקן, מגבלות ידועות ודרכי פנייה לרכז הנגישות.",
};

/** מועד העדכון האחרון של ההצהרה — לעדכן בכל שינוי מהותי באתר או במתקן. */
const LAST_UPDATED = "יולי 2026";

/** שם רכז/ת הנגישות — להחליף בשם האחראי/ת בפועל. */
const A11Y_COORDINATOR = "רכז/ת הנגישות";

export default function AccessibilityPage() {
  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="shield"
        badgeIconColor="var(--logo-cyan)"
        badgeText="נגישות · מחויבות לשירות שווה לכולם"
        title="הצהרת נגישות"
        description="אנחנו רואים בנגישות חלק מהשירות עצמו, ופועלים כדי שכל אדם - עם מוגבלות או בלעדיה - יוכל להירשם לחוגים, לנהל את החשבון ולהגיע אלינו בקלות ובעצמאות."
        size="compact"
      />

      <section className="container-page relative z-[3] space-y-6 py-12 pb-16">
        <ScrollReveal>
          <Panel>
            <p className="text-[15px] leading-relaxed text-ink-600">
              עסק <strong className="text-ink-900">{BRAND.name}</strong> מפעיל
              חוגי שחייה, מסלולי אימון וכניסות לבריכה, ומשרת קהל רחב הכולל ילדים,
              הורים, מבוגרים וגמלאים. אנו משתדלים שהאתר והמתקן יהיו נגישים
              לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות,
              התשנ״ח-1998 ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות
              לשירות), התשע״ג-2013.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
              הנגישות באתר היא תהליך מתמשך: אנחנו מתקנים, משפרים ובודקים באופן
              שוטף, ומזמינים אתכם לדווח לנו על כל תקלה או קושי שנתקלתם בו.
            </p>
          </Panel>
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-2">
          <ScrollReveal>
            <Panel icon="settings" title="תפריט הנגישות באתר">
              <p className="text-[15px] leading-relaxed text-ink-600">
                בכל עמוד באתר, בפינה השמאלית התחתונה, מופיע כפתור נגישות הפותח
                תפריט התאמות אישי. ההעדפות נשמרות במכשיר שלכם וממשיכות לפעול גם
                בביקורים הבאים. בתפריט אפשר:
              </p>
              <BulletList
                items={[
                  "להגדיל את הטקסט בחמש דרגות עד 160%",
                  "להפעיל ניגודיות כהה או ניגודיות בהירה",
                  "להציג תמונות בגווני אפור",
                  "להדגיש קישורים בקו תחתון בולט",
                  "לעבור לגופן קריא וסטנדרטי",
                  "להגדיל את ריווח השורות והאותיות",
                  "לעצור אנימציות ומעברים",
                  "להגדיל את סמן העכבר",
                  "להדגיש את מיקוד המקלדת בזמן ניווט",
                  "לאפס את כל ההתאמות בלחיצה אחת",
                ]}
              />
            </Panel>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <Panel icon="check" title="מה הונגש באתר">
              <BulletList
                items={[
                  "האתר בנוי במבנה סמנטי תקני, עם כותרות היררכיות ותוויות לכל שדה בטופס",
                  "ניתן לנווט בכל האתר באמצעות מקלדת בלבד, כולל טפסי הרשמה והתחברות",
                  "קיים קישור ״דילוג לתוכן המרכזי״ שנחשף בעת ניווט במקלדת",
                  "האתר תומך בקוראי מסך נפוצים (NVDA, VoiceOver, TalkBack)",
                  "לתמונות המשמעותיות הוגדר טקסט חלופי",
                  "צבעי הטקסט והרקע נבחרו לשמירה על יחסי ניגודיות תקינים",
                  "האתר מותאם לכל גדלי המסך, כולל טלפונים ניידים וטאבלטים",
                  "האתר כתוב בעברית ומוגדר לכיוון קריאה מימין לשמאל",
                  "המידע אינו מועבר באמצעות צבע בלבד, ואין תכנים מהבהבים",
                ]}
              />
            </Panel>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <Panel icon="badge" title="רמת הנגישות והתקן">
            <p className="text-[15px] leading-relaxed text-ink-600">
              האתר הונגש בהתאם לתקן הישראלי ת״י 5568 ברמת AA, המבוסס על הנחיות
              הנגישות הבינלאומיות{" "}
              <span dir="ltr" className="font-semibold text-ink-800">
                WCAG 2.1 AA
              </span>
              . הבדיקות בוצעו בדפדפנים העדכניים (Chrome, Edge, Firefox, Safari)
              במחשב ובנייד. ההנגשה בוצעה על ידי צוות הפיתוח של האתר.
            </p>
          </Panel>
        </ScrollReveal>

        <ScrollReveal>
          <Panel icon="hourglass" title="מגבלות נגישות ידועות">
            <p className="text-[15px] leading-relaxed text-ink-600">
              למרות מאמצינו, ייתכנו עמודים או רכיבים שטרם הונגשו במלואם. בין
              היתר:
            </p>
            <BulletList
              items={[
                "תכנים ורכיבים של ספקים חיצוניים, כגון עמודי סליקה ותשלום, מפות ורשתות חברתיות, אינם בשליטתנו המלאה",
                "קבצים להורדה שהועלו בעבר (למשל טפסים בפורמט PDF) עשויים להיות לא נגישים - נשמח לספק אותם בפורמט נגיש לפי בקשה",
                "תמונות ארכיון ותכנים ישנים נמצאים בתהליך השלמת טקסט חלופי",
              ]}
            />
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
              אם נתקלתם בתוכן שאינו נגיש, פנו אלינו ונשמח לסייע ולהעביר את המידע
              בדרך חלופית.
            </p>
          </Panel>
        </ScrollReveal>

        {/* חשוב: הפרטים בסעיף הפיזי הם תיאור כללי — יש לעדכן אותו כך שישקף
            במדויק את ההתאמות הקיימות במתקן בפועל לפני פרסום לציבור. */}
        <ScrollReveal>
          <Panel icon="pin" title="נגישות המתקן">
            <p className="text-[15px] leading-relaxed text-ink-600">
              המתקן שלנו נמצא בכתובת {CONTACT.address}. לקבלת מידע מדויק ומעודכן
              על ההתאמות הפיזיות, על דרכי ההגעה ועל אפשרות לסיוע צוות בעת הביקור,
              נשמח שתפנו אלינו מראש בטלפון {BRAND.phone} - כך נוכל להיערך ולוודא
              שהביקור יהיה נוח עבורכם.
            </p>
            <BulletList
              items={[
                "צוות המקום מודרך לתת מענה ושירות לאנשים עם מוגבלות",
                "ניתן לתאם מראש סיוע בהגעה, בכניסה לבריכה ובהתארגנות",
                "בקשות להתאמה אישית בחוג או במסלול נבדקות בפנייה מוקדמת למשרד",
              ]}
            />
          </Panel>
        </ScrollReveal>

        <ScrollReveal>
          <Panel icon="phone" title="פנייה בנושא נגישות">
            <p className="text-[15px] leading-relaxed text-ink-600">
              נתקלתם בבעיה, בתקלה או ברכיב שאינו נגיש? יש לכם הצעה לשיפור? נשמח
              לשמוע. כדי שנוכל לטפל במהירות, פרטו את העמוד שבו נתקלתם בבעיה, את
              סוג התקלה ואת הדפדפן או הטכנולוגיה המסייעת שבה השתמשתם.
            </p>

            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <ContactRow label="אחראי/ת נגישות" value={A11Y_COORDINATOR} />
              <ContactRow label="טלפון" value={BRAND.phone} ltr />
              <ContactRow label="דוא״ל" value={BRAND.email} ltr />
            </dl>

            <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
              נשתדל להשיב לכל פנייה בתוך שבעה ימי עסקים ולתקן את הנדרש בהקדם
              האפשרי. אפשר גם לפנות אלינו דרך{" "}
              <Link
                href="/contact"
                className="font-bold text-brand-600 hover:underline"
              >
                עמוד יצירת הקשר
              </Link>
              .
            </p>
          </Panel>
        </ScrollReveal>

        <p className="text-center text-sm text-ink-400">
          הצהרת הנגישות עודכנה לאחרונה: {LAST_UPDATED}
        </p>
      </section>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon?: IconName;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-[26px] border border-ink-100 bg-white p-6 shadow-card sm:p-8">
      {title && (
        <div className="mb-4 flex items-center gap-3">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={icon} size={20} />
            </span>
          )}
          <h2 className="font-display text-xl font-extrabold text-ink-900 sm:text-[22px]">
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-600">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ContactRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
      <dt className="text-xs font-bold text-ink-400">{label}</dt>
      <dd
        className="mt-0.5 text-sm font-semibold text-ink-800 [overflow-wrap:anywhere]"
        dir={ltr ? "ltr" : undefined}
        style={ltr ? { textAlign: "start" } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
