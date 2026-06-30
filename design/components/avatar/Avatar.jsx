import React from "react";

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

export function Avatar({ name = "", src, size = "md", className = "" }) {
  const cls = ["ah-avatar", size !== "md" ? `ah-avatar--${size}` : "", className]
    .filter(Boolean).join(" ");
  return (
    <div className={cls} title={name}>
      {src ? <img src={src} alt={name} /> : initials(name)}
    </div>
  );
}
