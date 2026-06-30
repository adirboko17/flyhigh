# על הגובה — Design System

A complete, RTL-first Hebrew design system for **על הגובה** ("Al Hagova") — a swimming-school
& pool SaaS that manages classes, programs, pool passes, customers, children, instructors,
enrollments, waitlists, payments, attendance and reports across four audiences: a public
marketing site, an admin back-office, an instructor area, and a parent area.

> **Premium · clean · modern · water/sport vibe. Full RTL. No emoji in final UI.**

*At a glance: 12 components (`window.DesignSystem_820aee`) · 132 tokens · 17 foundation cards ·
4 interactive UI kits. Fonts: Heebo + Assistant (Google Fonts).*

---

## Sources

This system was reverse-engineered from the production codebase (the ground truth):

- **Codebase:** `flyhigh/` — a Next.js 15 + React 19 + Tailwind 3 app (`al-hagova`), Supabase
  backend. Brand tokens live in `flyhigh/tailwind.config.ts`; UI primitives in
  `flyhigh/src/components/ui/*`; screens in `flyhigh/src/app/**`. (Mounted read-only; the reader
  is not assumed to have access.)
- **Logo:** `uploads/alagova logo-03.png` → copied to `assets/alagova-logo.png` (transparent PNG).
- **Brief:** the "Create design system" product spec (Hebrew) describing all screens & personas.

### ⚠️ One important correction vs. the brief
The written brief names **Magenta `#EC008C`** as the primary brand colour. The **actual product
code uses water-blue `#0082cd` (brand-600) as primary**, with aqua/turquoise `#16b08b` as
secondary — magenta/cyan/orange appear **only inside the logo artwork**. Per "the codebase is
ground truth", this system is built on **blue + aqua + ink**, and treats magenta/cyan/orange as
expressive *logo accents* only (see `--logo-*` tokens). If you want the whole UI re-skinned to a
magenta primary instead, that's a one-token change — **flag it and I'll switch it.**

---

## Brand & product context

- **Name:** על הגובה · **Tagline:** חוגים, מסלולים וכניסות לבריכה
- **Tone:** warm, trustworthy, family-friendly, sporty. Hebrew, second-person plural ("נרשמים",
  "פתחו חשבון"). Phone `03-5556677`, email `info@al-hagova.co.il`.
- **Personas:** Admin (full control), Instructor (own classes + attendance), Parent (kids,
  enrollments, payments), Guest (public site only).
- **Three surfaces:** public site (selling) · admin (dense CRUD) · instructor & parent (focused).

---

## CONTENT FUNDAMENTALS — how copy is written

- **Language:** Hebrew only in the UI. The *only* LTR exceptions are phone numbers, emails and
  times — these carry `dir="ltr"` inside the RTL layout so digits read correctly.
- **Voice:** speaks **to** the user, warm and direct. Plural imperative verbs for CTAs:
  "לצפייה בחוגים", "פתיחת חשבון", "הרשמה לחוג", "שמירת נוכחות". Greetings are personal:
  "שלום, מיכל", "שלום דנה 👋".
- **Casing/punctuation:** Hebrew has no casing. Gershayim used natively ("דוא״ל", "א׳–ה׳").
  En-dash for ranges ("16:30–17:15", "גילאי 5–9").
- **Currency:** always Shekel, `Intl` he-IL formatting — `₪280`, `₪48,200`. No decimals unless needed.
- **Microcopy is reassuring, never salesy-pushy:** "ההרשמה מתבצעת לאחר פתיחת חשבון אישי",
  "בטיחות לפני הכל", "מוכנים לקפוץ למים?".
- **Emoji:** 👋 appears in friendly dashboard greetings, but **functional icons are line-icons,
  never emoji** (the codebase used emoji as placeholders; the final system replaces them — see
  ICONOGRAPHY). Status is communicated with coloured **Badges**, never raw emoji.
- **Empty states** always pair a short title with a next-step CTA: "אין חוגים עדיין" + "+ חוג חדש".

---

## VISUAL FOUNDATIONS

**Colour.** Primary is **water-blue** (`--brand-*`, action = `brand-600 #0082cd`), secondary is
**aqua/turquoise** (`--aqua-*`, action = `aqua-500 #16b08b`, also the *success* tone). Neutrals
are a **cool blue-grey "ink" scale** (`--ink-*`): `ink-50 #f6f7f9` is the page background,
`ink-900 #1f2433` primary text, `ink-500` secondary text, `ink-100` hairline borders. Status:
success=aqua, warning=amber `#f59e0b`, danger=red `#ef4444`, info=sky `#0ea5e9`, neutral=ink.
Logo accents magenta/cyan/orange are reserved for expressive moments only.

**Gradient.** The signature is `--brand-gradient` =
`linear-gradient(135deg, #0a4a71 0%, #0082cd 55%, #16b08b 120%)` — deep-blue → blue → aqua. It
fills the hero, the public CTA band, sidebar **active** nav items, avatars, and the dashboard
revenue tile. Used purposefully, not as a default background. A soft tint
`--brand-gradient-soft` (brand-50 → aqua-50) backs gentle panels.

**Type.** Two Hebrew Google fonts: **Assistant** for display/headings (700–800), **Heebo** for
body & UI (400/500/600). Scale: hero 48 / page-H1 30 / card-title 18 / body 16 / table-&-form 14
/ badge 12. Headings are tight (`line-height ~1.15`, `-0.01em`). Numbers in stat tiles are
Assistant extrabold 30.

**Shape & elevation.** Generous rounding: buttons/inputs **14px**, cards **20px**, hero/aside
panels **28px**, badges/avatars **full**. Shadows are **soft and cool-tinted, never harsh black** —
`--shadow-card` on cards, `--shadow-soft` for subtle lift, and `--shadow-glow`
(`rgba(2,163,240,.35)`) — a **blue glow** that only ever sits under **primary CTAs** and active
sidebar items.

**Surfaces & layout.** White cards float on the `ink-50` page. 1px `ink-100` hairlines divide
card headers/footers and table rows. Lots of whitespace. Public content is centred in a
**1200px** container; admin/instructor/parent use a **fixed right-hand sidebar** (admin 288px,
others 272px) + a sticky blurred topbar. RTL everywhere — sidebar on the **right**, tables
right-aligned, `flex-direction: row-reverse` on the app shell.

**Transparency & blur.** Sticky headers use `rgba(255,255,255,0.85)` + `backdrop-filter: blur(8px)`.
Hero badges and stat tiles over the gradient use `rgba(255,255,255,0.1–0.15)` + blur.

**Motion.** Restrained. `200ms ease` colour/transform transitions on buttons & nav. Class cards
**lift** on hover (`translateY(-4px)` + shadow swap). No bounces, no infinite loops. Focus rings
are a 2px brand-blue halo (`--focus-ring`).

**Interaction states.** Hover = darker fill (primary→brand-700, secondary→aqua-600) or a faint
`ink-100` wash on ghost/outline. Inputs focus to a `brand-400` border + `brand-200` ring; error =
red border + red-100 ring with a red helper message. Disabled = 50% opacity.

**Imagery.** The app has no stock photography baked in; class cards fall back to the
**brand-gradient with a line-icon swimmer** when no photo is set — cool, branded, on-vibe. Drop a
real photo in and it cover-fills the 176px header.

---

## ICONOGRAPHY

- **Approach:** modern **line icons**, ~1.75px stroke, round caps/joins, 24px grid — Lucide-style.
  The production codebase currently uses **emoji as placeholders** (🏊 📊 💳 …) in nav and stat
  cards; **this design system replaces them with a real line-icon set** per the brief
  ("no emoji as final icons").
- **Where they live:** `ui_kits/icons.js` exposes `window.AHIcon({name,size,stroke})` — a single
  shared set (waves, ticket, badge, family, child, teacher, enroll, hourglass, card, check, chart,
  settings, dashboard, calendar, clock, user, wallet, money, logout, plus, arrow, …). `ClassCard`
  ships its own tiny inline set so it stays self-contained inside the bundle.
- **Substitution flag:** these are hand-built Lucide-style paths, not the Lucide package. If you
  want pixel-exact Lucide (or another set — Phosphor, Heroicons), say so and I'll swap to the CDN.
- **Emoji:** only the friendly 👋 in dashboard greetings. Never for status (use Badges) or nav.
- **Logo:** `assets/alagova-logo.png` — **always transparent, never on a black box, never
  recoloured.** Alt lockups in `assets/alagova-logo-alt-0{1,2}.png`.

---

## INDEX — what's in this project

**Foundations (root):**
- `styles.css` — the single entry point consumers link. Imports only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css` (radii/shadows/layout/motion),
  `components.css` (the `.ah-*` component classes), `fonts.css` (Heebo + Assistant).
- `assets/` — logo + alternate lockups.

**Components** (`components/<name>/` — each has `.jsx`, `.d.ts`, `.prompt.md`, `.card.html`):
- `button` (Button, ButtonLink) · `input` (Input, Textarea, Select, Field) · `card`
  (Card + Header/Title/Content/Footer) · `badge` · `avatar` · `statcard` · `table`
  (Table/THead/TBody/TR/TH/TD) · `emptystate` · `pageheader` · `brandlogo` · `classcard`.
  Namespace: `window.DesignSystem_820aee`.

All 24 exports under `window.DesignSystem_820aee`: `Avatar`, `Badge`, `BrandLogo`, `Button`,
`ButtonLink`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `ClassCard`,
`EmptyState`, `Input`, `Textarea`, `Select`, `Field`, `PageHeader`, `StatCard`, `Table`, `THead`,
`TBody`, `TR`, `TH`, `TD`.

Design-System tab cards (29): Components 11 · Colors 6 · Type 3 · Spacing 3 · Brand 2 ·
Public Site 1 · Admin 1 · Instructor 1 · Parent 1. Tokens 132 · Fonts: Heebo + Assistant (Google).

**Foundation cards** (`foundations/*.html`) — Design-System-tab specimens for Colours, Type,
Spacing, Brand.

**UI kits** (`ui_kits/<product>/index.html` — interactive, click-through, RTL; each shows in the
Design System tab as a live `@dsCard` preview under its product group):
- `public/` — home · classes · class detail · register · login
- `admin/` — dashboard · classes table · new-class form · customers · enrollments · payments
- `instructor/` — dashboard · my classes · attendance marker · payroll
- `parent/` — overview · children · enrollments · payments & receipts
- shared: `ui_kits/icons.js` (`window.AHIcon` line icons), `ui_kits/AreaShell.jsx`,
  `ui_kits/image-slot.js` (drag-drop photo placeholder), `ui_kits/public/data.js`

The **public home** uses an expressive art direction (the only surface that does): deep-ocean
hero with brand-accent colour orbs (magenta/cyan/orange from the logo), a wave divider, a
pink→blue gradient CTA, a drag-drop hero photo slot, and accent-tinted feature cards. The admin /
instructor / parent areas stay calm blue + ink.

> These four screens can be promoted to reusable **`templates/`** (so consuming projects can seed a
> new design from them) on request — just ask.

**`SKILL.md`** — makes this downloadable as an Agent Skill.

---

## Using the system

Link `styles.css`, load `_ds_bundle.js` (compiled automatically), then:
```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script>const { Button, Card, Badge, StatCard } = window.DesignSystem_820aee;</script>
```
Build pages **RTL** (`dir="rtl"`), on `--ink-50`, with white cards and the brand gradient for
hero/CTA moments. Keep status meaning consistent via `Badge` tones.
