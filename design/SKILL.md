---
name: al-hagova-design
description: Use this skill to generate well-branded interfaces and assets for "על הגובה" (Al Hagova) — an RTL Hebrew swimming-school & pool SaaS — for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, the logo, and a full UI kit of components for prototyping. Brand is water-blue + aqua, premium/clean/modern, full RTL.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. If working on production code, you can copy assets
and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or
design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Quick facts
- **Direction:** RTL always (`dir="rtl"`). Hebrew UI; only phone/email/time are LTR.
- **Primary:** water-blue `#0082cd` (brand-600). **Secondary/success:** aqua `#16b08b` (aqua-500).
  **Neutrals:** cool "ink" greys (page bg `#f6f7f9`, text `#1f2433`). Logo magenta/cyan/orange are
  expressive accents only — not UI chrome.
- **Fonts:** Assistant (display/headings, 700–800) + Heebo (body/UI, 400–600).
- **Shape:** buttons/inputs 14px · cards 20px · hero 28px · badges full. Soft cool shadows; a
  blue glow (`--shadow-glow`) only under primary CTAs. Signature `--brand-gradient` for hero/CTA.
- **Icons:** line icons (Lucide-style), no emoji for functional icons. Status → coloured Badges.
- **Logo:** transparent PNG, never on a black box.

## Where things are
- `styles.css` → links all tokens + the `.ah-*` component CSS + fonts. Link this one file.
- `_ds_bundle.js` → compiled React components. `const { Button, ... } = window.DesignSystem_820aee`.
- `tokens/` → CSS custom properties. `components/<name>/` → primitives + usage `.prompt.md`.
- `ui_kits/{public,admin,instructor,parent}/index.html` → full interactive screen recreations.
- `assets/` → logo + alternates. `ui_kits/icons.js` → shared `window.AHIcon` line-icon set.

## Building a new screen
Use `dir="rtl"`, background `--ink-50`, white `Card` surfaces, brand gradient for hero/CTA.
Compose from the components — don't re-implement them. Keep Badge tones meaning the same thing
everywhere (success=פעיל/שולם/נוכח, warning=ממתין/מלא, danger=לא שולם/בוטל, info=הוצע מקום).
