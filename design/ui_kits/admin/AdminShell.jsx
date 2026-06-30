// Admin shell — right-side sidebar (RTL) + topbar. window.AdminShell({active,onNav,logoSrc,children})
const { BrandLogo, Avatar } = window.DesignSystem_820aee;
const AdmIc = window.AHIcon;

const ADMIN_NAV = [
  { key: "dashboard", label: "דשבורד", icon: "dashboard" },
  { key: "classes", label: "חוגים", icon: "waves" },
  { key: "programs", label: "מסלולים", icon: "ticket" },
  { key: "pool", label: "כניסות לבריכה", icon: "badge" },
  { key: "customers", label: "לקוחות", icon: "family" },
  { key: "children", label: "ילדים", icon: "child" },
  { key: "instructors", label: "מדריכות", icon: "teacher" },
  { key: "enrollments", label: "הרשמות", icon: "enroll" },
  { key: "waitlist", label: "רשימת המתנה", icon: "hourglass" },
  { key: "payments", label: "תשלומים", icon: "card" },
  { key: "attendance", label: "נוכחות", icon: "check" },
  { key: "reports", label: "דוחות", icon: "chart" },
  { key: "settings", label: "הגדרות", icon: "settings" },
];

function AdminShell({ active, onNav, logoSrc, area = "אזור ניהול", user = { name: "איתן מנהל", role: "מנהל" }, children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ink-50)", flexDirection: "row-reverse" }}>
      <aside style={{ width: 288, flexShrink: 0, borderInlineStart: "1px solid var(--ink-100)", background: "var(--white)", position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ borderBottom: "1px solid var(--ink-100)", padding: "20px 24px" }}>
          <BrandLogo src={logoSrc} height={38} subtitle={area} />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: 12, overflowY: "auto" }}>
          {ADMIN_NAV.map((it) => {
            const on = active === it.key;
            return (
              <a key={it.key} onClick={() => onNav(it.key)} style={{
                display: "flex", alignItems: "center", gap: 12, borderRadius: 14, padding: "10px 14px",
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                color: on ? "#fff" : "var(--ink-600)",
                background: on ? "var(--brand-gradient)" : "transparent",
                boxShadow: on ? "var(--shadow-glow)" : "none",
              }}>
                <AdmIc name={it.icon} size={19} />{it.label}
              </a>
            );
          })}
        </nav>
      </aside>
      <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--ink-100)", background: "rgba(255,255,255,0.8)", padding: "12px 20px", backdropFilter: "blur(8px)" }}>
          <div style={{ fontSize: 14, color: "var(--ink-500)" }}>שלום, <span style={{ fontWeight: 600, color: "var(--ink-800)" }}>{user.name}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--ink-500)", cursor: "pointer" }}><AdmIc name="logout" size={16} /> התנתקות</a>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "left", lineHeight: 1.25 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink-800)" }}>{user.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--ink-400)" }}>{user.role}</p>
              </div>
              <Avatar name={user.name} />
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}

window.AdminShell = AdminShell;
