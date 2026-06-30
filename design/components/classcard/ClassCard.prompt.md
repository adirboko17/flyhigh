The hero card of the public site — sells a class. Image header (or brand-gradient swimmer fallback), status badge top-start, category pill bottom-end, then title, two-column detail grid, and a price row. The entire card is a clickable link.

```jsx
<ClassCard
  title="חוג שחייה לילדים"
  description="קבוצות קטנות, מדריכות מוסמכות ויחס אישי."
  instructor="דנה כהן" day="שני" time="16:30"
  ageMin={5} ageMax={9} available={4} capacity={12}
  price={280} category="שחייה" status="active"
  href="/classes/1"
/>
```

- `status`: `active` → green "פעיל", `full` → amber "מלא" (availability shows "מלא" in red), `draft`/`closed` muted.
- Detail icons are built-in line icons. Lays out 3-up on desktop, 1-up on mobile. Lifts on hover.
- Price renders in brand blue, Assistant extrabold.
