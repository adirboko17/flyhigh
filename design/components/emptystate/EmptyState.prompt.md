Empty placeholder for zero-result lists. Dashed border, brand icon chip, title, description, optional action. Keeps blank screens warm and gives the user a next step.

```jsx
<EmptyState
  icon={<Waves />}
  title="אין חוגים עדיין"
  description="צרו את החוג הראשון שלכם והוא יופיע כאן."
  action={<Button>+ חוג חדש</Button>}
/>
```

Always pair the empty state with the action that resolves it (an "add" button). Use a line icon, not emoji, for the final design.
