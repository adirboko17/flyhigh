Dashboard metric tile — large display number, muted label, tinted icon chip, and a faint corner glow in the tone colour. Admin dashboards lay these out in a 6-up grid; parent/instructor in 3-up.

```jsx
<StatCard label="לקוחות" value={128} icon={<Users />} tone="brand" />
<StatCard label="ילדים" value={213} icon={<Baby />} tone="aqua" />
<StatCard label="תשלומים פתוחים" value={7} icon={<CreditCard />} tone="rose" />
<StatCard label="הכנסות" value="₪48,200" icon={<Wallet />} tone="aqua" hint="החודש" />
```

- Pass a **line icon** (Lucide) as `icon`, not an emoji, for the final design.
- Tones: `brand` `aqua` `amber` `rose` `violet` `slate`. Rotate tones across a row so the grid reads as distinct cards, not a wall of blue.
- The value renders in Assistant extrabold at 30px.
