// Public site chrome — sticky header + 4-column footer. Exposes window.PublicHeader / PublicFooter.
const { BrandLogo, Button } = window.DesignSystem_820aee;
const Icon = window.AHIcon;

function PublicHeader({ active, onNav, logoSrc }) {
  const nav = [
    { key: "home", label: "בית" },
    { key: "classes", label: "חוגים" },
    { key: "programs", label: "מסלולים" },
    { key: "contact", label: "צור קשר" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30, borderBottom: "1px solid var(--ink-100)",
      background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <BrandLogo src={logoSrc} height={46} />
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {nav.map((n) => (
            <a key={n.key} onClick={() => onNav(n.key === "contact" ? "home" : n.key)}
              style={{
                cursor: "pointer", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500,
                color: active === n.key ? "var(--brand-700)" : "var(--ink-600)",
                background: active === n.key ? "var(--brand-50)" : "transparent",
              }}>{n.label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a onClick={() => onNav("login")} style={{ cursor: "pointer", borderRadius: 12, padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--ink-700)" }}>התחברות</a>
          <button className="hero-cta-primary ah-btn ah-btn--sm" onClick={() => onNav("register")}>הרשמה</button>
        </div>
      </div>
    </header>
  );
}

function PublicFooter({ logoSrc, onNav }) {
  const d = window.AH_DATA.brand;
  const col = { display: "flex", flexDirection: "column", gap: 10 };
  const h = { fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--ink-800)", margin: "0 0 4px" };
  const li = { fontSize: 14, color: "var(--ink-500)", cursor: "pointer" };
  return (
    <footer style={{ marginTop: 64, borderTop: "1px solid var(--ink-100)", background: "var(--white)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px", display: "grid", gap: 32, gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
        <div style={col}>
          <BrandLogo src={logoSrc} height={42} />
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-500)" }}>{d.tagline}</p>
        </div>
        <div style={col}><h4 style={h}>ניווט</h4>
          <span style={li} onClick={() => onNav("home")}>בית</span>
          <span style={li} onClick={() => onNav("classes")}>חוגים</span>
          <span style={li} onClick={() => onNav("register")}>הרשמה</span>
          <span style={li} onClick={() => onNav("login")}>התחברות</span>
        </div>
        <div style={col}><h4 style={h}>צור קשר</h4>
          <span style={{ fontSize: 14, color: "var(--ink-500)" }}>טלפון: {d.phone}</span>
          <span style={{ fontSize: 14, color: "var(--ink-500)" }}>דוא״ל: {d.email}</span>
        </div>
        <div style={col}><h4 style={h}>שעות פעילות</h4>
          <span style={{ fontSize: 14, color: "var(--ink-500)" }}>א׳–ה׳: 08:00–21:00</span>
          <span style={{ fontSize: 14, color: "var(--ink-500)" }}>ו׳: 08:00–14:00</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--ink-100)", padding: "18px 0", textAlign: "center", fontSize: 12, color: "var(--ink-400)" }}>
        © 2026 {d.name}. כל הזכויות שמורות.
      </div>
    </footer>
  );
}

Object.assign(window, { PublicHeader, PublicFooter });
