Brand button — the primary call-to-action element. Use `Button` for actions, `ButtonLink` for navigation.

```jsx
<Button>הרשמה לחוג</Button>
<Button variant="secondary" size="lg">לצפייה בחוגים</Button>
<Button variant="outline" size="sm">ביטול</Button>
<Button variant="danger">מחיקה</Button>
<ButtonLink href="/register" block>פתיחת חשבון</ButtonLink>
```

- **variant**: `primary` (brand blue with glow shadow — the default CTA), `secondary` (aqua/turquoise), `outline` (white with border), `ghost` (transparent), `danger` (red).
- **size**: `sm` 36px · `md` 44px (default) · `lg` 48px.
- **block**: full-width.
- Primary buttons carry the brand glow shadow. Never put two primary buttons side by side — pair primary with secondary or outline.
