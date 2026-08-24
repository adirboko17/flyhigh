# על הגובה — מערכת ניהול חוגים, מסלולים וכניסות לבריכה

מערכת SaaS מלאה בעברית (RTL) לניהול עסק חוגי שחייה: אתר ציבורי להורים + מערכת ניהול + אזור מדריכות.
נבנתה עם **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** ו‑**Supabase** (Auth, Postgres, RLS).

## הרצה מקומית

```bash
npm install
npm run dev
```

האפליקציה תרוץ ב‑http://localhost:3000

### משתני סביבה (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CARDCOM_TERMINAL_NUMBER=...
CARDCOM_API_NAME=...
CARDCOM_API_PASSWORD=...
CARDCOM_APP_URL=https://www.al-ha-gova.co.il
RESEND_API_KEY=...
RESEND_FROM_EMAIL=על הגובה <office@al-ha-gova.co.il>
ADMIN_NOTIFY_EMAIL=office@al-ha-gova.co.il
```

## כניסת ניהול

התחברו עם המשתמש הראשי: `office@al-ha-gova.co.il`

## מבנה הפרויקט

```
src/
  app/
    (public)/        # אתר ציבורי: בית, חוגים, פרטי חוג, הרשמה, התחברות
    parent/          # אזור הורה: סקירה, ילדים, הרשמות, תשלומים
    admin/           # מערכת ניהול: דשבורד, חוגים, לקוחות, מדריכות, הרשמות, תשלומים ועוד
    instructor/      # אזור מדריכה: דשבורד, חוגים, נוכחות, שכר
  components/
    ui/              # Design System (Button, Card, Input, Table, Badge, StatCard...)
    layout/          # Sidebar, Topbar, PublicHeader/Footer
    auth/ parent/ admin/ instructor/ classes/   # קומפוננטות לפי תחום
  layouts/           # (שמור לפריסות עתידיות)
  lib/
    supabase/        # client / server / middleware
    integrations/    # שכבת הפשטה: תשלומים, חשבוניות, מיילים (מוכן לחיבור)
    auth.ts navigation.ts constants.ts
  types/             # טיפוסים (database.types + דומיין)
  utils/             # format, cn
```

## הרשאות (RLS)

- **מנהל** — גישה מלאה לכל הנתונים.
- **מדריכה** — רק חוגים, תלמידים ונוכחות המשויכים אליה.
- **הורה** — רק הפרופיל, הילדים, ההרשמות, התשלומים והקבלות שלו.
- **אורח** — האתר הציבורי והחוגים הפעילים בלבד.

## אינטגרציות עתידיות (מבנה מוכן)

`src/lib/integrations` מכיל ממשקים (Providers) עם מימוש דמה, מוכנים לחיבור:
- סליקה (PayPlus / אחר)
- חשבונית ירוקה
- שליחת מיילים / התראות

## סקריפטים

- `npm run dev` — סביבת פיתוח
- `npm run build` — בנייה לפרודקשן
- `npm run start` — הרצת בילד
- `npm run lint` — בדיקת קוד
