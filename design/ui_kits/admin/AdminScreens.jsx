// Admin screens. window.AdminScreens = { dashboard, classes, newClass, customers, enrollments, payments }
const { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, Button, PageHeader, Table, THead, TBody, TR, TH, TD, Avatar, Field, Input, Select, Textarea } = window.DesignSystem_820aee;
const AI = window.AHIcon;
const AD = window.AH_DATA;
const ils = (n) => "₪" + Number(n).toLocaleString("he-IL");

const CUSTOMERS = [
  { name: "מיכל לוי", phone: "052-1112233", email: "michal@mail.com", kids: 2, joined: "ינואר 2026" },
  { name: "יוסי כהן", phone: "054-9988776", email: "yossi@mail.com", kids: 1, joined: "פברואר 2026" },
  { name: "רונית אברהם", phone: "050-4455667", email: "ronit@mail.com", kids: 3, joined: "מרץ 2026" },
  { name: "דוד פרץ", phone: "053-2233445", email: "david@mail.com", kids: 1, joined: "מרץ 2026" },
];
const ENROLLMENTS = [
  { activity: "חוג שחייה לילדים", parent: "מיכל לוי", child: "איתי לוי", type: "חוג", status: ["success", "פעיל"], pay: ["success", "שולם"], date: "12.03.26" },
  { activity: "אקווה-ג'ימנסטיקה", parent: "רונית אברהם", child: "נועה אברהם", type: "חוג", status: ["warning", "ממתין"], pay: ["danger", "לא שולם"], date: "14.03.26" },
  { activity: "מנוי חודשי", parent: "יוסי כהן", child: "—", type: "מסלול", status: ["success", "פעיל"], pay: ["warning", "שולם חלקית"], date: "10.03.26" },
  { activity: "חוג שחייה מתקדמים", parent: "דוד פרץ", child: "עומר פרץ", type: "חוג", status: ["info", "הושלם"], pay: ["success", "שולם"], date: "01.02.26" },
];
const PAYMENTS = [
  { parent: "מיכל לוי", amount: 280, method: "כרטיס אשראי", status: ["success", "שולם"], date: "12.03.26" },
  { parent: "יוסי כהן", amount: 350, method: "ביט", status: ["success", "שולם"], date: "10.03.26" },
  { parent: "רונית אברהם", amount: 240, method: "הוראת קבע", status: ["warning", "ממתין"], date: "14.03.26" },
  { parent: "דוד פרץ", amount: 320, method: "פייבוקס", status: ["danger", "נכשל"], date: "09.03.26" },
];

function Dashboard() {
  const i = (n) => <AI name={n} size={22} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--ink-900)" }}>דשבורד ניהול</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-500)" }}>סקירה כללית של הפעילות בעסק</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 16 }}>
        <StatCard label="לקוחות" value={128} icon={i("family")} tone="brand" />
        <StatCard label="ילדים" value={213} icon={i("child")} tone="aqua" />
        <StatCard label="חוגים פעילים" value={9} icon={i("waves")} tone="violet" />
        <StatCard label="הרשמות פעילות" value={64} icon={i("enroll")} tone="amber" />
        <StatCard label="תשלומים פתוחים" value={7} icon={i("card")} tone="rose" />
        <StatCard label="רשימת המתנה" value={11} icon={i("hourglass")} tone="slate" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 }}>
        <Card>
          <CardHeader>
            <CardTitle>הרשמות אחרונות</CardTitle>
            <a style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-600)", cursor: "pointer" }}>הכל ←</a>
          </CardHeader>
          <CardContent>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {ENROLLMENTS.map((e, k) => (
                <li key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: k ? "1px solid var(--ink-100)" : "none" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{e.activity}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-500)" }}>{e.parent}{e.child !== "—" ? " · " + e.child : ""}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Badge tone={e.pay[0]}>{e.pay[1]}</Badge>
                    <Badge tone={e.status[0]}>{e.status[1]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>סיכום הכנסות</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderRadius: 20, background: "var(--brand-gradient)", padding: 20, color: "#fff" }}>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>סך הכנסות (שולמו)</p>
                <p style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800 }}>{ils(48200)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 14, background: "var(--amber-100)", padding: "12px 16px" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--amber-700)" }}>תשלומים ממתינים</span>
                <span style={{ fontWeight: 700, color: "var(--amber-700)" }}>7</span>
              </div>
              <a style={{ display: "block", borderRadius: 14, border: "1px solid var(--ink-200)", padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--ink-700)", cursor: "pointer" }}>לצפייה בדוחות המלאים ←</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClassesScreen({ onNav }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="ניהול חוגים" description="יצירה, עריכה וניהול של כל החוגים" action={<Button onClick={() => onNav && onNav("newClass")}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AI name="plus" size={16} />חוג חדש</span></Button>} />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table>
          <THead><TR><TH>שם החוג</TH><TH>מדריכה</TH><TH>יום ושעה</TH><TH>מחיר</TH><TH>מכסה</TH><TH>סטטוס</TH></TR></THead>
          <TBody>
            {AD.classes.map((c) => (
              <TR key={c.id}>
                <TD style={{ fontWeight: 600, color: "var(--ink-900)" }}>{c.title}<span style={{ marginInlineStart: 8, fontSize: 12, fontWeight: 400, color: "var(--ink-400)" }}>{c.category}</span></TD>
                <TD>{c.instructor}</TD>
                <TD style={{ color: "var(--ink-600)" }}>יום {c.day} · {c.time}</TD>
                <TD style={{ fontWeight: 500 }}>{ils(c.price)}</TD>
                <TD>{c.taken}/{c.capacity}</TD>
                <TD><Badge tone={c.status === "full" ? "warning" : "success"}>{c.status === "full" ? "מלא" : "פעיל"}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function NewClassScreen({ onNav }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 820 }}>
      <PageHeader title="יצירת חוג חדש" description="מלאו את פרטי החוג. ניתן לערוך בכל עת." />
      <Card>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Field label="שם החוג" required><Input placeholder="לדוגמה: חוג שחייה לילדים" /></Field>
            <Field label="תיאור"><Textarea placeholder="תיאור קצר של החוג, מה כולל, למי מתאים..." /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="קטגוריה"><Select><option>שחייה</option><option>פעוטות</option><option>אקווה</option></Select></Field>
              <Field label="רמה"><Select><option>מתחילים</option><option>מתקדמים</option><option>התחלתי</option></Select></Field>
              <Field label="גיל מינימום"><Input type="number" placeholder="5" /></Field>
              <Field label="גיל מקסימום"><Input type="number" placeholder="9" /></Field>
              <Field label="מכסת משתתפים" required><Input type="number" placeholder="12" /></Field>
              <Field label="מחיר (₪)" required><Input type="number" placeholder="280" /></Field>
              <Field label="מדריכה"><Select><option>דנה כהן</option><option>יעל אברהם</option></Select></Field>
              <Field label="יום בשבוע"><Select><option>ראשון</option><option>שני</option><option>שלישי</option><option>רביעי</option><option>חמישי</option></Select></Field>
              <Field label="שעת התחלה"><Input type="time" dir="ltr" /></Field>
              <Field label="שעת סיום"><Input type="time" dir="ltr" /></Field>
            </div>
            <Field label="סטטוס"><Select><option>טיוטה</option><option>פעיל</option><option>מלא</option><option>סגור</option></Select></Field>
            <div style={{ display: "flex", gap: 12, borderTop: "1px solid var(--ink-100)", paddingTop: 20 }}>
              <Button onClick={() => onNav("classes")}>שמירת חוג</Button>
              <Button variant="outline" onClick={() => onNav("classes")}>ביטול</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomersScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="לקוחות" description="כל ההורים הרשומים במערכת" action={<Button variant="outline">ייצוא לאקסל</Button>} />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table>
          <THead><TR><TH>שם</TH><TH>טלפון</TH><TH>אימייל</TH><TH>ילדים</TH><TH>תאריך הצטרפות</TH></TR></THead>
          <TBody>
            {CUSTOMERS.map((c, k) => (
              <TR key={k}>
                <TD><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={c.name} size="sm" /><span style={{ fontWeight: 600, color: "var(--ink-900)" }}>{c.name}</span></div></TD>
                <TD dir="ltr" style={{ textAlign: "right", color: "var(--ink-600)" }}>{c.phone}</TD>
                <TD dir="ltr" style={{ textAlign: "right", color: "var(--ink-600)" }}>{c.email}</TD>
                <TD><Badge tone="brand">{c.kids}</Badge></TD>
                <TD style={{ color: "var(--ink-600)" }}>{c.joined}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function EnrollmentsScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="הרשמות" description="כל ההרשמות לחוגים, מסלולים וכניסות" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table>
          <THead><TR><TH>פעילות</TH><TH>הורה</TH><TH>ילד</TH><TH>סוג</TH><TH>סטטוס</TH><TH>תשלום</TH><TH>תאריך</TH></TR></THead>
          <TBody>
            {ENROLLMENTS.map((e, k) => (
              <TR key={k}>
                <TD style={{ fontWeight: 600, color: "var(--ink-900)" }}>{e.activity}</TD>
                <TD>{e.parent}</TD>
                <TD style={{ color: "var(--ink-600)" }}>{e.child}</TD>
                <TD><Badge tone="neutral">{e.type}</Badge></TD>
                <TD><Badge tone={e.status[0]}>{e.status[1]}</Badge></TD>
                <TD><Badge tone={e.pay[0]}>{e.pay[1]}</Badge></TD>
                <TD style={{ color: "var(--ink-600)" }}>{e.date}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function PaymentsScreen() {
  const i = (n) => <AI name={n} size={22} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="תשלומים" description="מעקב גבייה ותנועות אשראי" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        <StatCard label="נגבה החודש" value={ils(48200)} icon={i("wallet")} tone="aqua" />
        <StatCard label="ממתין לגבייה" value={ils(2140)} icon={i("hourglass")} tone="amber" />
        <StatCard label="סך עסקאות" value={186} icon={i("card")} tone="brand" />
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table>
          <THead><TR><TH>הורה</TH><TH>סכום</TH><TH>אמצעי</TH><TH>סטטוס</TH><TH>תאריך</TH></TR></THead>
          <TBody>
            {PAYMENTS.map((p, k) => (
              <TR key={k}>
                <TD style={{ fontWeight: 600, color: "var(--ink-900)" }}>{p.parent}</TD>
                <TD style={{ fontWeight: 600 }}>{ils(p.amount)}</TD>
                <TD style={{ color: "var(--ink-600)" }}>{p.method}</TD>
                <TD><Badge tone={p.status[0]}>{p.status[1]}</Badge></TD>
                <TD style={{ color: "var(--ink-600)" }}>{p.date}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function PlaceholderScreen({ title }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={title} description="מסך לדוגמה במערך העיצוב" />
      <window.DesignSystem_820aee.EmptyState
        icon={<AI name="settings" size={24} />}
        title={"מסך " + title}
        description="המסך הזה משתמש באותם רכיבים — טבלאות, כרטיסים, badges וכפתורים — כמו שאר אזור הניהול."
      />
    </div>
  );
}

window.AdminScreens = { Dashboard, ClassesScreen, NewClassScreen, CustomersScreen, EnrollmentsScreen, PaymentsScreen, PlaceholderScreen };
