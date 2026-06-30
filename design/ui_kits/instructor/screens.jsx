// Instructor area screens. window.InstructorScreens = { Dashboard, Classes, Attendance, Payroll }
const { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, Button, PageHeader, Field, Select, Input } = window.DesignSystem_820aee;
const II = window.AHIcon;
const ils2 = (n) => "₪" + Number(n).toLocaleString("he-IL");

const MY_CLASSES = [
  { id: "1", title: "חוג שחייה לילדים", day: "שני", time: "16:30–17:15", students: 8, capacity: 12 },
  { id: "2", title: "חוג שחייה מתקדמים", day: "רביעי", time: "17:30–18:30", students: 10, capacity: 10 },
  { id: "3", title: "שחייה — קבוצת בוקר", day: "חמישי", time: "09:00–09:45", students: 6, capacity: 10 },
];
const ROSTER = ["איתי לוי", "נועה אברהם", "עומר פרץ", "שירה כהן", "יואב מזרחי", "טליה ברק"];

function IDashboard({ onNav }) {
  const i = (n) => <II name={n} size={22} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--ink-900)" }}>שלום דנה 👋</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-500)" }}>הנה סקירת הפעילות שלך להיום</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        <StatCard label="החוגים שלי" value={3} icon={i("waves")} tone="brand" />
        <StatCard label="תלמידים" value={24} icon={i("child")} tone="aqua" />
        <StatCard label="תעריף שעתי" value={ils2(120)} icon={i("money")} tone="amber" />
      </div>
      <Card>
        <CardHeader><CardTitle>החוגים שלי</CardTitle></CardHeader>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MY_CLASSES.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 16, border: "1px solid var(--ink-100)", padding: 16 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{c.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-500)" }}>יום {c.day} · {c.time} · {c.students}/{c.capacity} תלמידים</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNav("attendance")}>סימון נוכחות</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IClasses({ onNav }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="החוגים שלי" description="כל החוגים שאת מעבירה" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {MY_CLASSES.map((c) => {
          const full = c.students >= c.capacity;
          return (
            <Card key={c.id}>
              <CardContent>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink-900)" }}>{c.title}</h3>
                  <Badge tone={full ? "warning" : "success"}>{full ? "מלא" : "פעיל"}</Badge>
                </div>
                <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "var(--ink-600)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}><II name="calendar" size={16} />יום {c.day}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}><II name="clock" size={16} />{c.time}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}><II name="users" size={16} />{c.students}/{c.capacity} תלמידים</span>
                </div>
                <Button block onClick={() => onNav("attendance")}>סימון נוכחות</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function IAttendance() {
  const OPTS = [
    { v: "present", label: "נוכח", bg: "var(--aqua-500)" },
    { v: "late", label: "איחור", bg: "var(--amber-500)" },
    { v: "absent", label: "נעדר", bg: "var(--red-500)" },
  ];
  const [marks, setMarks] = React.useState({});
  const [saved, setSaved] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <PageHeader title="סימון נוכחות" description="בחרו חוג ותאריך וסמנו את הנוכחות" />
      <Card>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="בחירת חוג"><Select>{MY_CLASSES.map((c) => <option key={c.id}>{c.title}</option>)}</Select></Field>
              <Field label="תאריך"><Input type="date" defaultValue="2026-06-30" /></Field>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ROSTER.map((name) => {
                const cur = marks[name] || "present";
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 14, border: "1px solid var(--ink-100)", padding: 12 }}>
                    <span style={{ fontWeight: 500, color: "var(--ink-800)" }}>{name}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {OPTS.map((o) => {
                        const on = cur === o.v;
                        return (
                          <button key={o.v} onClick={() => { setMarks((m) => ({ ...m, [name]: o.v })); setSaved(false); }} style={{
                            borderRadius: 10, padding: "6px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none",
                            background: on ? o.bg : "var(--ink-100)", color: on ? "#fff" : "var(--ink-600)",
                          }}>{o.label}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button onClick={() => setSaved(true)}>שמירת נוכחות</Button>
              {saved && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "var(--aqua-600)" }}><II name="check" size={16} /> הנוכחות נשמרה</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IPayroll() {
  const i = (n) => <II name={n} size={22} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="שכר ופעילות" description="סיכום מפגשים והערכת שכר" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        <StatCard label="תעריף שעתי" value={ils2(120)} icon={i("money")} tone="brand" />
        <StatCard label="מפגשים החודש" value={18} icon={i("calendar")} tone="aqua" />
        <StatCard label="הערכת שכר" value={ils2(2160)} icon={i("wallet")} tone="amber" hint="לפני מס" />
      </div>
      <Card>
        <CardHeader><CardTitle>פירוט לפי חוג</CardTitle></CardHeader>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MY_CLASSES.map((c, k) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: k ? "1px solid var(--ink-100)" : "none" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{c.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--ink-500)" }}>יום {c.day} · {c.time}</p>
                </div>
                <Badge tone="brand">{6 - k} רישומי נוכחות</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

window.InstructorScreens = { IDashboard, IClasses, IAttendance, IPayroll };
