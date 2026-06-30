// Public site screens. Exposes window.PublicScreens = { home, classes, detail, register, login }.
const { ClassCard, Button, Badge, BrandLogo, Card, Field, Input, Select } = window.DesignSystem_820aee;
const Ic = window.AHIcon;
const D = window.AH_DATA;
const shekel = (n) => "₪" + Number(n).toLocaleString("he-IL");
const wrap = { maxWidth: 1200, margin: "0 auto", padding: "0 24px" };
const MAG = "var(--logo-magenta)", CYN = "var(--logo-cyan)", ORG = "var(--logo-orange)";

function Orb({ color, size, top, left, right, bottom, blur = 60, opacity = 0.5 }) {
  return <div style={{ position: "absolute", top, left, right, bottom, width: size, height: size, borderRadius: "50%", background: color, filter: `blur(${blur}px)`, opacity, pointerEvents: "none" }} />;
}

function SectionHead({ eyebrow, title, sub, link, onLink, color = "var(--brand-600)" }) {
  return (
    <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        {eyebrow && <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color, textTransform: "uppercase" }}><span style={{ width: 22, height: 2, background: color, borderRadius: 2 }} />{eyebrow}</span>}
        <h2 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 800, color: "var(--ink-900)", lineHeight: 1.1 }}>{title}</h2>
        {sub && <p style={{ margin: "6px 0 0", color: "var(--ink-500)" }}>{sub}</p>}
      </div>
      {link && <a onClick={onLink} style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, color }}>{link} ←</a>}
    </div>
  );
}

function Hero({ onNav }) {
  const stats = [["1,200+", "ילדים מאושרים"], ["15+", "שנות ניסיון"], ["98%", "הורים ממליצים"]];
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(155deg, #06314f 0%, #0a4a71 44%, #0072b8 80%, #0c97cc 100%)" }}>
      <Orb color={MAG} size={420} top={-120} left={-80} blur={90} opacity={0.35} />
      <Orb color={CYN} size={360} bottom={-40} right={-60} blur={90} opacity={0.4} />
      <Orb color={ORG} size={160} top={120} right={420} blur={50} opacity={0.45} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.18, backgroundImage: "radial-gradient(circle at 80% 0%, #fff, transparent 45%)" }} />
      <div style={{ ...wrap, position: "relative", display: "grid", gridTemplateColumns: "1.02fr 0.98fr", gap: 48, alignItems: "center", padding: "84px 24px 174px" }}>
        <div style={{ color: "#fff" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", padding: "7px 16px", fontSize: 13, fontWeight: 600, backdropFilter: "blur(6px)" }}>
            <span style={{ color: ORG }}><Ic name="waves" size={16} /></span> בית הספר לשחייה ופעילות מים
          </span>
          <h1 style={{ margin: "22px 0 0", fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 800, lineHeight: 0.98, letterSpacing: "-0.02em" }}>{D.brand.name}</h1>
          <p style={{ margin: "14px 0 0", fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, lineHeight: 1.25, background: "linear-gradient(90deg, #ffd9ef, #aef0ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>שחייה, ביטחון והנאה<br />בגובה העיניים</p>
          <p style={{ margin: "20px 0 0", maxWidth: 480, fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
            הרשמה לחוגים, מסלולים וכניסות לבריכה בכמה קליקים. ניהול הילדים, ההרשמות והתשלומים — הכל במקום אחד.
          </p>
          <div style={{ marginTop: 30, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button className="hero-cta-primary ah-btn ah-btn--lg" onClick={() => onNav("register")}>פתיחת חשבון →</button>
            <button className="hero-cta-glass ah-btn ah-btn--lg" onClick={() => onNav("classes")}>לצפייה בחוגים</button>
          </div>
          <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 24 }}>
            {stats.map(([b, s], i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ width: 1, height: 34, background: "rgba(255,255,255,0.22)" }} />}
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#fff" }}>{b}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>{s}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: "-18px -18px auto auto", width: 132, height: 132, borderRadius: "50%", border: "10px solid " + ORG, opacity: 0.9, zIndex: 2 }} />
          <div style={{ position: "absolute", insetInlineStart: -36, bottom: 70, width: 120, height: 120, borderRadius: "50%", background: MAG, opacity: 0.25, filter: "blur(6px)" }} />
          <div style={{ position: "relative", borderRadius: 32, padding: 10, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", boxShadow: "0 30px 70px -30px rgba(0,0,0,0.6)" }}>
            <image-slot id="public-hero" placeholder="גררו לכאן תמונה של הבריכה" shape="rounded" radius="24" style={{ display: "block", width: "100%", height: 470 }}></image-slot>
          </div>
          <div style={{ position: "absolute", insetInlineEnd: 24, bottom: -26, zIndex: 3, display: "flex", alignItems: "center", gap: 12, borderRadius: 18, background: "#fff", padding: "12px 16px", boxShadow: "0 18px 40px -16px rgba(16,42,75,0.45)" }}>
            <span style={{ display: "flex", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "var(--aqua-100)", color: "var(--aqua-600)" }}><Ic name="shield" size={20} /></span>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--ink-900)" }}>98% הורים ממליצים</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-500)" }}>מדריכות מוסמכות · יחס אישי</p>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", insetInline: 0, bottom: -1, lineHeight: 0 }}>
        <svg viewBox="0 0 1440 110" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 90 }}>
          <path d="M0,40 C240,110 480,110 720,70 C960,30 1200,20 1440,60 L1440,110 L0,110 Z" fill="var(--ink-50)" />
        </svg>
      </div>
    </section>
  );
}

function Features() {
  const accents = [CYN, MAG, ORG];
  return (
    <section style={{ ...wrap, padding: "0 24px", marginTop: -112, position: "relative", zIndex: 3 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {D.features.map((f, i) => {
          const a = accents[i % 3];
          return (
            <div key={i} className="feat-card" style={{ position: "relative", overflow: "hidden", borderRadius: 22, background: "#fff", padding: 26, boxShadow: "var(--shadow-card)", border: "1px solid var(--ink-100)" }}>
              <div style={{ position: "absolute", insetInline: 0, top: 0, height: 4, background: a }} />
              <div style={{ display: "flex", width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, color: "#fff", background: a, boxShadow: `0 12px 26px -10px ${a}` }}>
                <Ic name={f.icon} size={24} />
              </div>
              <h3 style={{ margin: "18px 0 0", fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, color: "var(--ink-900)" }}>{f.title}</h3>
              <p style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-500)" }}>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PriceRow({ title, desc, price }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderRadius: 20, border: "1px solid var(--ink-100)", background: "var(--white)", padding: 16, boxShadow: "var(--shadow-card)" }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{title}</p>
        {desc && <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-500)" }}>{desc}</p>}
      </div>
      <span style={{ flexShrink: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--brand-700)" }}>{shekel(price)}</span>
    </div>
  );
}

function HomeScreen({ onNav, onOpenClass }) {
  return (
    <div>
      <Hero onNav={onNav} />
      <Features />
      <section style={{ ...wrap, padding: "56px 24px 8px" }}>
        <SectionHead eyebrow="החוגים שלנו" title="חוגים מובילים" sub="הצטרפו לחוגים הפופולריים שלנו" link="לכל החוגים" onLink={() => onNav("classes")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {D.classes.map((c) => <div key={c.id} onClick={() => onOpenClass(c.id)} style={{ cursor: "pointer" }}><ClassCard {...c} /></div>)}
        </div>
      </section>
      <section style={{ ...wrap, padding: "64px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: MAG, textTransform: "uppercase" }}><span style={{ width: 22, height: 2, background: MAG, borderRadius: 2 }} />מנויים</span>
            <h2 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--ink-900)" }}>מסלולים חודשיים</h2>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {D.programs.map((p) => <PriceRow key={p.id} {...p} />)}
            </div>
          </div>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: CYN, textTransform: "uppercase" }}><span style={{ width: 22, height: 2, background: CYN, borderRadius: 2 }} />גמיש</span>
            <h2 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--ink-900)" }}>כניסות לבריכה</h2>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {D.poolPasses.map((p) => <PriceRow key={p.id} {...p} />)}
            </div>
          </div>
        </div>
      </section>
      <section style={{ ...wrap, paddingBottom: 72 }}>
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 32, background: "linear-gradient(120deg, #0a4a71 0%, #0072b8 60%, #0c97cc 100%)", padding: "56px 32px", textAlign: "center", color: "#fff", boxShadow: "0 30px 60px -28px rgba(10,74,113,0.6)" }}>
          <Orb color={MAG} size={260} top={-90} right={-40} blur={70} opacity={0.4} />
          <Orb color={ORG} size={150} bottom={-50} left={60} blur={50} opacity={0.5} />
          <div style={{ position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", padding: "6px 16px", fontSize: 13, fontWeight: 600, backdropFilter: "blur(6px)" }}><span style={{ color: ORG }}><Ic name="drop" size={15} /></span> הצטרפו אלינו</span>
            <h2 style={{ margin: "16px 0 0", fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 800, letterSpacing: "-0.01em" }}>מוכנים לקפוץ למים?</h2>
            <p style={{ margin: "10px auto 0", maxWidth: 560, fontSize: 17, color: "rgba(255,255,255,0.88)" }}>פתחו חשבון, הוסיפו את הילדים שלכם והירשמו לחוג המתאים תוך דקות.</p>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 12 }}>
              <button className="hero-cta-primary ah-btn ah-btn--lg" onClick={() => onNav("register")}>הרשמה עכשיו →</button>
              <button className="hero-cta-glass ah-btn ah-btn--lg" onClick={() => onNav("classes")}>עיון בחוגים</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClassesScreen({ onOpenClass }) {
  return (
    <div style={{ ...wrap, padding: "40px 24px 24px" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--ink-900)" }}>כל החוגים</h1>
      <p style={{ margin: "4px 0 28px", color: "var(--ink-500)" }}>{D.classes.length} חוגים פעילים · בחרו את המתאים לכם</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
        {D.classes.map((c) => <div key={c.id} onClick={() => onOpenClass(c.id)} style={{ cursor: "pointer" }}><ClassCard {...c} /></div>)}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 20, border: "1px solid var(--ink-100)", background: "var(--white)", padding: 16 }}>
      <span style={{ color: "var(--brand-600)" }}><Ic name={icon} size={20} /></span>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-400)" }}>{label}</p>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{value}</p>
      </div>
    </div>
  );
}

function DetailScreen({ id, onNav }) {
  const c = D.classes.find((x) => x.id === id) || D.classes[0];
  const soldOut = c.available <= 0 || c.status === "full";
  const pct = Math.min(100, (c.taken / Math.max(c.capacity, 1)) * 100);
  return (
    <div style={{ background: "var(--ink-50)" }}>
      <div style={{ ...wrap, padding: "24px 24px 8px" }}>
        <a onClick={() => onNav("classes")} style={{ cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--ink-500)" }}>→ חזרה לכל החוגים</a>
      </div>
      <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, paddingBottom: 64 }}>
        <div>
          <div style={{ height: 360, borderRadius: 28, overflow: "hidden", background: "var(--brand-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Ic name="waves" size={72} stroke={1.4} />
          </div>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge tone={soldOut ? "warning" : "success"}>{soldOut ? "מלא" : "פעיל"}</Badge>
            <Badge tone="brand">{c.category}</Badge>
            <Badge tone="info">רמה: {c.level}</Badge>
          </div>
          <h1 style={{ margin: "16px 0 0", fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--ink-900)" }}>{c.title}</h1>
          <p style={{ margin: "12px 0 0", lineHeight: 1.65, color: "var(--ink-600)" }}>{c.description}</p>
          <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <DetailRow icon="teacher" label="מדריכה" value={c.instructor} />
            <DetailRow icon="calendar" label="יום בשבוע" value={"יום " + c.day} />
            <DetailRow icon="clock" label="שעות" value={c.time + "–" + c.endTime} />
            <DetailRow icon="age" label="גילאים" value={"גילאי " + c.ageMin + "–" + c.ageMax} />
          </div>
        </div>
        <aside style={{ alignSelf: "flex-start", position: "sticky", top: 88 }}>
          <div style={{ borderRadius: 28, border: "1px solid var(--ink-100)", background: "var(--white)", padding: 24, boxShadow: "var(--shadow-card)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-500)" }}>מחיר החוג</p>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, color: "var(--brand-700)" }}>{shekel(c.price)}</p>
            <div style={{ marginTop: 20, borderRadius: 20, background: "var(--ink-50)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "var(--ink-500)" }}>מקומות פנויים</span>
                <span style={{ fontWeight: 700, color: "var(--ink-900)" }}>{soldOut ? "מלא" : c.available + " מתוך " + c.capacity}</span>
              </div>
              <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "var(--ink-200)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 999, background: "var(--brand-gradient)", width: pct + "%" }} />
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              {soldOut
                ? <Button variant="secondary" block onClick={() => onNav("register")}>הצטרפות לרשימת המתנה</Button>
                : <Button size="lg" block onClick={() => onNav("register")}>הרשמה לחוג</Button>}
              <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "var(--ink-400)" }}>ההרשמה מתבצעת לאחר פתיחת חשבון אישי</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AuthBrandPanel({ heading, points }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", color: "#fff", padding: "64px 56px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%", background: "linear-gradient(160deg, #06314f 0%, #0a4a71 50%, #0072b8 100%)" }}>
      <Orb color={MAG} size={360} top={-110} left={-70} blur={90} opacity={0.32} />
      <Orb color={CYN} size={320} bottom={-60} right={-60} blur={90} opacity={0.36} />
      <Orb color={ORG} size={140} top={120} right={90} blur={50} opacity={0.4} />
      <div style={{ position: "relative", maxWidth: 440 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", padding: "7px 16px", fontSize: 13, fontWeight: 600, backdropFilter: "blur(6px)" }}>
          <span style={{ color: ORG }}><Ic name="waves" size={16} /></span> בית הספר לשחייה ופעילות מים
        </span>
        <h2 style={{ margin: "22px 0 0", fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 800, lineHeight: 0.98, letterSpacing: "-0.02em" }}>על הגובה</h2>
        <p style={{ margin: "12px 0 0", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, lineHeight: 1.25, background: "linear-gradient(90deg, #ffd9ef, #aef0ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{heading}</p>
        <ul style={{ margin: "28px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          {points.map((t, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15.5, color: "rgba(255,255,255,0.92)" }}>
              <span style={{ flexShrink: 0, display: "flex", width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(255,255,255,0.16)" }}><Ic name="check" size={15} /></span>{t}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 32, display: "inline-flex", alignItems: "center", gap: 12, borderRadius: 16, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)", padding: "12px 16px", backdropFilter: "blur(6px)" }}>
          <span style={{ display: "flex", width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 11, background: "var(--logo-orange)", color: "#3a2400" }}><Ic name="shield" size={18} /></span>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800 }}>98% הורים ממליצים</p>
            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>מדריכות מוסמכות · יחס אישי</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterScreen({ onNav, logoSrc }) {
  const labelH3 = { margin: 0, fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", color: "var(--brand-600)", textTransform: "uppercase" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", minHeight: "calc(100vh - 64px)", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <a onClick={() => onNav("home")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--ink-500)", cursor: "pointer" }}>→ חזרה לדף הבית</a>
          <div onClick={() => onNav("home")} style={{ cursor: "pointer", marginTop: 16 }}><BrandLogo src={logoSrc} height={44} /></div>
          <h1 style={{ margin: "22px 0 0", fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--ink-900)" }}>פתיחת חשבון</h1>
          <p style={{ margin: "6px 0 28px", color: "var(--ink-500)" }}>הרשמו בחינם ונהלו את כל הפעילות של הילדים במקום אחד.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={labelH3}>פרטי הורה</h3>
              <Field label="שם מלא" required><Input placeholder="מיכל לוי" /></Field>
              <Field label="טלפון" required><Input type="tel" dir="ltr" placeholder="050-0000000" /></Field>
              <Field label="אימייל" required><Input type="email" dir="ltr" placeholder="michal@mail.com" /></Field>
              <Field label="סיסמה" hint="לפחות 6 תווים" required><Input type="password" /></Field>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--ink-100)", paddingTop: 18 }}>
              <h3 style={labelH3}>פרטי ילד <span style={{ fontWeight: 500, color: "var(--ink-400)", letterSpacing: 0, textTransform: "none" }}>· אופציונלי</span></h3>
              <Field label="שם הילד"><Input placeholder="איתי לוי" /></Field>
              <Field label="תאריך לידה"><Input type="date" dir="ltr" /></Field>
              <Field label="מין"><Select><option>בחרו...</option><option>זכר</option><option>נקבה</option></Select></Field>
            </div>
            <button className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block" onClick={() => onNav("login")}>יצירת חשבון</button>
            <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "var(--ink-500)" }}>
              כבר יש לכם חשבון? <a onClick={() => onNav("login")} style={{ cursor: "pointer", fontWeight: 700, color: "var(--brand-600)" }}>התחברות</a>
            </p>
          </div>
        </div>
      </div>
      <AuthBrandPanel heading="שחייה, ביטחון והנאה — בגובה העיניים" points={[
        "הרשמה לחוגים ותשלום מאובטח אונליין",
        "ניהול כל הילדים בפרופיל משפחתי אחד",
        "מעקב נוכחות וקבלות דיגיטליות",
        "התראות על פתיחת חוגים ורשימות המתנה",
      ]} />
    </div>
  );
}

function LoginScreen({ onNav, logoSrc }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <a onClick={() => onNav("home")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--ink-500)", cursor: "pointer" }}>→ חזרה לדף הבית</a>
          <div onClick={() => onNav("home")} style={{ cursor: "pointer", marginTop: 16 }}><BrandLogo src={logoSrc} height={48} /></div>
          <h1 style={{ margin: "22px 0 0", fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--ink-900)" }}>ברוכים השבים 👋</h1>
          <p style={{ margin: "6px 0 28px", color: "var(--ink-500)" }}>התחברו לאזור האישי שלכם</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="אימייל" required><Input type="email" dir="ltr" placeholder="michal@mail.com" /></Field>
            <Field label="סיסמה" required><Input type="password" placeholder="••••••••" /></Field>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--ink-600)", cursor: "pointer" }}>
                <input type="checkbox" style={{ accentColor: "var(--brand-600)", width: 15, height: 15 }} /> זכרו אותי
              </label>
              <a style={{ fontSize: 13.5, fontWeight: 600, color: "var(--brand-600)", cursor: "pointer" }}>שכחתם סיסמה?</a>
            </div>
            <button className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block" onClick={() => onNav("home")}>כניסה לחשבון</button>
            <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "var(--ink-500)" }}>
              אין לכם חשבון? <a onClick={() => onNav("register")} style={{ cursor: "pointer", fontWeight: 700, color: "var(--brand-600)" }}>הרשמה</a>
            </p>
          </div>
        </div>
      </div>
      <AuthBrandPanel heading="שחייה, ביטחון והנאה — בגובה העיניים" points={[
        "כל ההרשמות והתשלומים במקום אחד",
        "מעקב נוכחות וקבלות דיגיטליות",
        "עדכונים על חוגים חדשים ורשימות המתנה",
      ]} />
    </div>
  );
}

function PlanCard({ name, desc, price, period, features, icon, accent, featured, badge, onNav }) {
  const base = {
    position: "relative", display: "flex", flexDirection: "column", borderRadius: 26,
    padding: 30, transition: "transform .25s ease, box-shadow .25s ease",
  };
  const checkCol = featured ? "rgba(255,255,255,0.95)" : accent;
  return (
    <div className="feat-card" style={featured
      ? { ...base, color: "#fff", background: "linear-gradient(150deg, #0a4a71 0%, #0072b8 55%, #0c97cc 100%)", boxShadow: "0 26px 54px -24px rgba(10,74,113,0.6)", overflow: "hidden" }
      : { ...base, background: "#fff", border: "1px solid var(--ink-100)", boxShadow: "var(--shadow-card)" }}>
      {featured && <Orb color={MAG} size={200} top={-80} left={-40} blur={60} opacity={0.45} />}
      {badge && (
        <span style={{ position: "absolute", top: 18, insetInlineEnd: 18, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800,
          background: featured ? "var(--logo-orange)" : "var(--brand-100)", color: featured ? "#3a2400" : "var(--brand-700)" }}>{badge}</span>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14,
          background: featured ? "rgba(255,255,255,0.16)" : accent, color: "#fff", boxShadow: featured ? "none" : `0 12px 26px -10px ${accent}` }}>
          <Ic name={icon} size={22} />
        </div>
        <h3 style={{ margin: "18px 0 0", fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, color: featured ? "#fff" : "var(--ink-900)" }}>{name}</h3>
        <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: featured ? "rgba(255,255,255,0.82)" : "var(--ink-500)" }}>{desc}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "20px 0 0" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800, color: featured ? "#fff" : "var(--brand-700)" }}>{shekel(price)}</span>
          {period && <span style={{ fontSize: 14, fontWeight: 600, color: featured ? "rgba(255,255,255,0.75)" : "var(--ink-400)" }}>{period}</span>}
        </div>
        <div style={{ height: 1, background: featured ? "rgba(255,255,255,0.18)" : "var(--ink-100)", margin: "22px 0" }} />
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          {features.map((f, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, color: featured ? "rgba(255,255,255,0.92)" : "var(--ink-700)" }}>
              <span style={{ flexShrink: 0, marginTop: 1, color: checkCol }}><Ic name="check" size={17} /></span>{f}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 26 }}>
          {featured
            ? <button className="ah-btn ah-btn--lg ah-btn--block" style={{ background: "#fff", color: "var(--brand-700)" }} onClick={() => onNav("register")}>הצטרפות למסלול</button>
            : <button className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block" onClick={() => onNav("register")}>הצטרפות למסלול</button>}
        </div>
      </div>
    </div>
  );
}

function ProgramsScreen({ onNav }) {
  return (
    <div>
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(155deg, #06314f 0%, #0a4a71 48%, #0072b8 100%)" }}>
        <Orb color={MAG} size={340} top={-120} right={-60} blur={90} opacity={0.32} />
        <Orb color={CYN} size={300} bottom={-40} left={-50} blur={90} opacity={0.36} />
        <Orb color={ORG} size={130} top={70} left={360} blur={50} opacity={0.4} />
        <div style={{ ...wrap, position: "relative", padding: "64px 24px 130px", textAlign: "center", color: "#fff" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", padding: "7px 16px", fontSize: 13, fontWeight: 600, backdropFilter: "blur(6px)" }}>
            <span style={{ color: ORG }}><Ic name="ticket" size={16} /></span> מחירון · מסלולים וכניסות
          </span>
          <h1 style={{ margin: "20px 0 0", fontFamily: "var(--font-display)", fontSize: 50, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.04 }}>בחרו את המסלול שלכם</h1>
          <p style={{ margin: "14px auto 0", maxWidth: 560, fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
            מנויים חודשיים לשחייה חופשית וכניסות גמישות לבריכה — בלי התחייבות, בלי בירוקרטיה. בחרו, שלמו והתחילו לשחות.
          </p>
        </div>
        <div style={{ position: "absolute", insetInline: 0, bottom: -1, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 110" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 90 }}>
            <path d="M0,40 C240,110 480,110 720,70 C960,30 1200,20 1440,60 L1440,110 L0,110 Z" fill="var(--ink-50)" />
          </svg>
        </div>
      </section>

      <section style={{ ...wrap, padding: "32px 24px 0", marginTop: 0, position: "relative", zIndex: 3 }}>
        <SectionHead eyebrow="מנויים" title="מסלולים חודשיים" sub="שחייה חופשית, כמה שבא לכם" color={MAG} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch" }}>
          <PlanCard onNav={onNav} icon="drop" accent={CYN} name="מנוי חודשי" period="/ לחודש" price={350}
            desc="שחייה חופשית בכל ימות החודש, בקצב שלכם."
            features={["כניסה חופשית לבריכה כל החודש", "גישה בכל שעות הפעילות", "ביטול בכל עת, ללא קנס", "הטבות במחירי חוגים"]} />
          <PlanCard onNav={onNav} featured badge="הכי משתלם" icon="family" accent={MAG} name="מנוי משפחתי" period="/ 3 חודשים" price={900}
            desc="שחייה חופשית לכל המשפחה, חיסכון משמעותי."
            features={["עד 4 בני משפחה במנוי אחד", "שחייה חופשית למשך 3 חודשים", "חיסכון של ₪150 לעומת חודשי", "עדיפות בהרשמה לחוגים חדשים"]} />
        </div>
      </section>

      <section style={{ ...wrap, padding: "56px 24px 16px" }}>
        <SectionHead eyebrow="גמיש" title="כניסות לבריכה" sub="מתאים לאורחים ולשחיינים מזדמנים" color={CYN} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch" }}>
          <PlanCard onNav={onNav} icon="badge" accent={ORG} name="כניסה חד-פעמית" price={45}
            desc="כניסה בודדת לבריכה, ללא התחייבות."
            features={["כניסה אחת לבריכה", "ללא מנוי וללא התחייבות", "מושלם לאורחים ולניסיון"]} />
          <PlanCard onNav={onNav} featured badge="חיסכון ₪50" icon="ticket" accent={CYN} name="כרטיסייה — 10 כניסות" price={400}
            desc="עשר כניסות בתוקף לשנה שלמה."
            features={["10 כניסות לבריכה", "תוקף לשנה מיום הרכישה", "חיסכון של ₪50", "ניתן לשיתוף בין בני המשפחה"]} />
        </div>
      </section>

      <section style={{ ...wrap, padding: "40px 24px 72px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20, borderRadius: 24, border: "1px solid var(--ink-100)", background: "var(--brand-gradient-soft)", padding: "28px 32px" }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--ink-900)" }}>לא בטוחים מה מתאים לכם?</h3>
            <p style={{ margin: "4px 0 0", color: "var(--ink-600)" }}>פתחו חשבון בחינם — תוכלו לבחור מסלול או כניסה בכל רגע.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="hero-cta-primary ah-btn ah-btn--lg" onClick={() => onNav("register")}>פתיחת חשבון →</button>
            <button className="ah-btn ah-btn--lg ah-btn--outline" onClick={() => onNav("classes")}>עיון בחוגים</button>
          </div>
        </div>
      </section>
    </div>
  );
}

window.PublicScreens = { HomeScreen, ClassesScreen, DetailScreen, RegisterScreen, LoginScreen, ProgramsScreen };
