import React from "react";

const LOGO_DEFAULT = "assets/alagova-logo.png";

export function BrandLogo({ src = LOGO_DEFAULT, height = 44, subtitle, href, className = "" }) {
  const width = Math.round(height * 2.05);
  const img = (
    <img
      src={src}
      alt="על הגובה"
      style={{ height, width, objectFit: "contain", objectPosition: "center", display: "block" }}
    />
  );
  const inner = (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
    >
      {img}
      {subtitle && (
        <span style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--ink-400)" }}>
          {subtitle}
        </span>
      )}
    </span>
  );
  if (href) {
    return (
      <a href={href} style={{ display: "inline-flex", textDecoration: "none", transition: "opacity 200ms" }}>
        {inner}
      </a>
    );
  }
  return inner;
}
