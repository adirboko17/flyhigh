The base surface — white card, 1px hairline border, soft cool shadow, 20px radius. Everything in the admin/parent areas sits on cards over the `--ink-50` page background.

```jsx
<Card>
  <CardHeader>
    <CardTitle>הרשמות אחרונות</CardTitle>
    <a href="#">הכל ←</a>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

- `CardHeader` is a flex row (title right, action left) with a bottom hairline.
- `CardContent` has 20px padding. Omit it and pad yourself for edge-to-edge tables.
- Never stack heavy shadows — one card shadow per surface.
