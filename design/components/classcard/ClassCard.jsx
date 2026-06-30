import React from "react";

const STATUS = {
  draft:  { label: "טיוטה", tone: "neutral" },
  active: { label: "פעיל", tone: "success" },
  full:   { label: "מלא", tone: "warning" },
  closed: { label: "סגור", tone: "danger" },
};

// Minimal inline line-icons (Lucide-style) so the card stays self-contained.
const Ico = {
  instructor: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  age: "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M4 21v-1a8 8 0 0 1 16 0v1",
  users: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-1a6 6 0 0 1 6-6M21 21v-1a6 6 0 0 0-4-5.66",
};
function Icon({ d }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
function shekel(n) {
  if (n == null) return "—";
  return "₪" + Number(n).toLocaleString("he-IL");
}

export function ClassCard({
  title, description, instructor, day, time,
  ageMin, ageMax, available, capacity, price,
  category, status = "active", image, href = "#",
}) {
  const st = STATUS[status] || STATUS.active;
  const soldOut = (available != null && available <= 0) || status === "full";
  const detail = { color: "var(--ink-600)", display: "flex", alignItems: "center", gap: 6 };

  return (
    <a href={href} style={{
      display: "flex", flexDirection: "column", overflow: "hidden", textDecoration: "none",
      background: "var(--white)", border: "1px solid var(--ink-100)",
      borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)",
      transition: "transform 300ms, box-shadow 300ms",
    }}>
      <div style={{ position: "relative", height: 176, width: "100%", overflow: "hidden", background: "var(--ink-100)" }}>
        {image ? (
          <img src={image} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--brand-gradient)", color: "#fff" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 16c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M2 20c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M6 12l5-5M18 12 9 3" />
            </svg>
          </div>
        )}
        <div style={{ position: "absolute", insetInlineStart: 12, top: 12 }}>
          <span className={`ah-badge ah-badge--${st.tone}`}>{st.label}</span>
        </div>
        {category && (
          <span style={{ position: "absolute", bottom: 12, insetInlineEnd: 12, background: "rgba(255,255,255,0.9)", padding: "2px 10px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--ink-700)" }}>
            {category}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: 20 }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--ink-900)" }}>{title}</h3>
        {description && (
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--ink-500)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>
        )}

        <dl style={{ margin: "16px 0 0", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 8, fontSize: "var(--text-sm)" }}>
          {instructor && <div style={{ ...detail, gridColumn: "1 / -1" }}><Icon d={Ico.instructor} />{instructor}</div>}
          {day && <div style={detail}><Icon d={Ico.calendar} />יום {day}</div>}
          {time && <div style={detail}><Icon d={Ico.clock} />{time}</div>}
          {(ageMin || ageMax) && <div style={detail}><Icon d={Ico.age} />גילאי {ageMin}–{ageMax}</div>}
          <div style={detail}>
            <Icon d={Ico.users} />
            {soldOut ? <span style={{ fontWeight: 600, color: "var(--red-600)" }}>מלא</span> : <span>{available} מקומות פנויים</span>}
          </div>
        </dl>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--ink-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--brand-700)" }}>{shekel(price)}</span>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--brand-600)" }}>לפרטים והרשמה ←</span>
        </div>
      </div>
    </a>
  );
}
