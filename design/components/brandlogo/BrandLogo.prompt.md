The brand wordmark. The logo PNG is **always transparent** — never place it on a dark or coloured box, and never recolour it. Give it breathing room.

```jsx
<BrandLogo height={48} href="/" />
<BrandLogo height={40} subtitle="אזור ניהול" />
```

- `src` defaults to `assets/alagova-logo.png`; set it to the correct relative path from your page.
- Width auto-scales to ~2.05× the height. In the sticky public header it sits at 48px; in the admin/instructor sidebar at 40px with an area `subtitle`.
