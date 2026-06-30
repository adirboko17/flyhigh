import React from "react";

const TONES = {
  brand:  { glow: "rgba(2, 163, 240, 0.10)",  iconBg: "var(--brand-100)",  iconFg: "var(--brand-600)" },
  aqua:   { glow: "rgba(22, 176, 139, 0.10)", iconBg: "var(--aqua-100)",   iconFg: "var(--aqua-600)" },
  amber:  { glow: "rgba(245, 158, 11, 0.10)", iconBg: "var(--amber-100)",  iconFg: "var(--amber-600)" },
  rose:   { glow: "rgba(244, 63, 94, 0.10)",  iconBg: "#ffe4e6",           iconFg: "#e11d48" },
  violet: { glow: "rgba(139, 92, 246, 0.10)", iconBg: "#ede9fe",           iconFg: "#7c3aed" },
  slate:  { glow: "rgba(98, 115, 147, 0.10)", iconBg: "var(--ink-100)",    iconFg: "var(--ink-600)" },
};

export function StatCard({ label, value, icon, tone = "brand", hint }) {
  const t = TONES[tone] || TONES.brand;
  return (
    <div className="ah-stat">
      <div
        className="ah-stat__glow"
        style={{ background: `linear-gradient(to bottom left, ${t.glow}, transparent 70%)` }}
      />
      <div className="ah-stat__row">
        <div>
          <p className="ah-stat__label">{label}</p>
          <p className="ah-stat__value">{value}</p>
          {hint && <p className="ah-stat__hint">{hint}</p>}
        </div>
        {icon && (
          <div className="ah-stat__icon" style={{ background: t.iconBg, color: t.iconFg }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
