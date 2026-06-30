Page title block that opens every admin / parent / instructor screen. Title (Assistant extrabold, 30px) + muted description on the right, action button(s) on the left.

```jsx
<PageHeader
  title="ניהול חוגים"
  description="יצירה, עריכה וניהול של כל החוגים"
  action={<Button>+ חוג חדש</Button>}
/>
```

Stacks vertically on mobile, becomes a space-between row at ≥640px. The `action` slot holds one or two buttons.
