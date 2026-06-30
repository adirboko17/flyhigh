Status pill used consistently across the whole system. The tone encodes meaning — keep the mapping stable so colours mean the same thing everywhere.

```jsx
<Badge tone="success">שולם</Badge>
<Badge tone="warning" dot>ממתין</Badge>
<Badge tone="danger">לא שולם</Badge>
<Badge tone="info">הוצע מקום</Badge>
<Badge tone="neutral">טיוטה</Badge>
<Badge tone="brand">שחייה</Badge>
```

Canonical mapping (from the app's constants):
- **success** (aqua): פעיל · שולם · נוכח · הצטרף
- **warning** (amber): ממתין · שולם חלקית · איחור · מלא
- **danger** (red): לא שולם · נעדר · בוטל · נכשל
- **neutral** (ink): טיוטה · הוחזר · פג תוקף
- **info** (sky): הוצע מקום · הושלם
- **brand** (blue): category tags

`dot` adds a leading status dot for at-a-glance scanning in dense tables.
