Form controls — `Input`, `Textarea`, `Select`, and the `Field` wrapper (label + hint + error). Use `Field` around any control to get consistent labelling and validation copy.

```jsx
<Field label="שם מלא" htmlFor="name" required>
  <Input id="name" placeholder="לדוגמה: מיכל לוי" />
</Field>

<Field label="אימייל" htmlFor="email" error="כתובת לא תקינה">
  <Input id="email" type="email" dir="ltr" error />
</Field>

<Field label="מין" htmlFor="g">
  <Select id="g"><option>זכר</option><option>נקבה</option></Select>
</Field>
```

- Pass `error` (boolean) to a control for the red error border; pass `error` (string) to `Field` for the message — together they give the full error state.
- Use `dir="ltr"` on phone/email inputs so digits read left-to-right inside the RTL layout.
- Controls are 44px tall, 14px radius, with a brand-blue focus ring.
