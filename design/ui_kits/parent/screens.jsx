// Parent area screens. window.ParentScreens = { PDashboard, PChildren, PEnrollments, PPayments }
const { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, Button, PageHeader, Table, THead, TBody, TR, TH, TD, Avatar } = window.DesignSystem_820aee;
const PI = window.AHIcon;
const ils3 = (n) => "₪" + Number(n).toLocaleString("he-IL");

const CHILDREN = [
  { name: "איתי לוי", age: 7, gender: "זכר", note: "שחיין מתחיל, אוהב מים" },
  { name: "נועה לוי", age: 5, gender: "נקבה", note: "קבוצת פעוטות" },
];
const P_ENROLL = [
  { activity: "חוג שחייה לילדים", child: "איתי לוי", type: "חוג", status: ["success", "פעיל"], pay: ["success", "שולם"], date: "12.03.26" },
  { activity: "אקווה-ג'ימנסטיקה", child: "נועה לוי", type: "חוג", status: ["warning", "ממתין"], pay: ["danger", "לא שולם"], date: "14.03.26" },
];
const P_PAY = [
  { desc: "חוג שחייה לילדים", amount: 280, method: "כרטיס אשראי", status: ["success", "שולם"], date: "12.03.26" },
  { desc: "אקווה-ג'ימנסטיקה", amount: 240, method: "—", status: ["danger", "לא שולם"], date: "14.03.26" },
];
const RECEIPTS = [
  { num: "1042", email: "michal@mail.com", amount: 280, date: "12.03.26" },
  { num: "0987", email: "michal@mail.com", amount: 350, date: "01.02.26" },
];

function PDashboard({ onNav }) {
  const i = (n) => <PI name={n} size={22} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--ink-900)" }}>שלום מיכל 👋</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-500)" }}>סקירת הפעילות של המשפחה</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        <StatCard label="ילדים" value={2} icon={i("child")} tone="brand" />
        <StatCard label="הרשמות פעילות" value={2} icon={i("enroll")} tone="aqua" />
        <StatCard label="תשלומים פתוחים" value={1} icon={i("card")} tone="rose" hint={ils3(240) + " לתשלום"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <Card>
          <CardHeader><CardTitle>ההרשמות שלי</CardTitle><a onClick={() => onNav("enrollments")} style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-600)", cursor: "pointer" }}>הכל ←</a></CardHeader>
          <CardContent>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {P_ENROLL.map((e, k) => (
                <li key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: k ? "1px solid var(--ink-100)" : "none" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{e.activity}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-500)" }}>{e.child}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}><Badge tone={e.pay[0]}>{e.pay[1]}</Badge><Badge tone={e.status[0]}>{e.status[1]}</Badge></div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>הילדים שלי</CardTitle><a onClick={() => onNav("children")} style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-600)", cursor: "pointer" }}>נהל ←</a></CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHILDREN.map((c, k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={c.name} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{c.name}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink-500)" }}>גיל {c.age} · {c.gender}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PChildren() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="הילדים שלי" description="ניהול פרטי הילדים הרשומים" action={<Button><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><PI name="plus" size={16} />הוספת ילד</span></Button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {CHILDREN.map((c, k) => (
          <Card key={k}>
            <CardContent>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={c.name} size="lg" />
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink-900)" }}>{c.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-500)" }}>גיל {c.age} · {c.gender}</p>
                </div>
              </div>
              <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--ink-600)" }}>{c.note}</p>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <Button size="sm" variant="outline">עריכה</Button>
                <Button size="sm" variant="ghost">הרשמות</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <a style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, borderRadius: 20, border: "1px dashed var(--ink-200)", background: "rgba(246,247,249,0.5)", minHeight: 180, cursor: "pointer", color: "var(--brand-600)" }}>
          <PI name="plus" size={28} /><span style={{ fontSize: 14, fontWeight: 600 }}>הוספת ילד</span>
        </a>
      </div>
    </div>
  );
}

function PEnrollments() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="ההרשמות שלי" description="כל ההרשמות של הילדים שלך" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Table>
          <THead><TR><TH>פעילות</TH><TH>ילד</TH><TH>סוג</TH><TH>סטטוס</TH><TH>תשלום</TH><TH>תאריך</TH></TR></THead>
          <TBody>
            {P_ENROLL.map((e, k) => (
              <TR key={k}>
                <TD style={{ fontWeight: 600, color: "var(--ink-900)" }}>{e.activity}</TD>
                <TD>{e.child}</TD>
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

function PPayments() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="תשלומים וקבלות" description="היסטוריית תשלומים והורדת קבלות" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink-100)", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--ink-900)" }}>תשלומים</div>
        <Table>
          <THead><TR><TH>תיאור</TH><TH>סכום</TH><TH>אמצעי</TH><TH>סטטוס</TH><TH>תאריך</TH><TH></TH></TR></THead>
          <TBody>
            {P_PAY.map((p, k) => (
              <TR key={k}>
                <TD style={{ fontWeight: 600, color: "var(--ink-900)" }}>{p.desc}</TD>
                <TD style={{ fontWeight: 600 }}>{ils3(p.amount)}</TD>
                <TD style={{ color: "var(--ink-600)" }}>{p.method}</TD>
                <TD><Badge tone={p.status[0]}>{p.status[1]}</Badge></TD>
                <TD style={{ color: "var(--ink-600)" }}>{p.date}</TD>
                <TD>{p.status[1] === "לא שולם" ? <Button size="sm">לתשלום</Button> : <span style={{ fontSize: 13, color: "var(--ink-400)" }}>—</span>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink-100)", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--ink-900)" }}>קבלות</div>
        <Table>
          <THead><TR><TH>מספר קבלה</TH><TH>נשלח לאימייל</TH><TH>סכום</TH><TH>תאריך</TH><TH></TH></TR></THead>
          <TBody>
            {RECEIPTS.map((r, k) => (
              <TR key={k}>
                <TD style={{ fontWeight: 600, color: "var(--ink-900)" }}>#{r.num}</TD>
                <TD dir="ltr" style={{ textAlign: "right", color: "var(--ink-600)" }}>{r.email}</TD>
                <TD style={{ fontWeight: 500 }}>{ils3(r.amount)}</TD>
                <TD style={{ color: "var(--ink-600)" }}>{r.date}</TD>
                <TD><a style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--brand-600)", cursor: "pointer" }}>הורדה</a></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

window.ParentScreens = { PDashboard, PChildren, PEnrollments, PPayments };
