import React from "react";

export function Badge({ tone = "neutral", dot = false, className = "", children, ...props }) {
  const cls = ["ah-badge", `ah-badge--${tone}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...props}>
      {dot && <span className="ah-badge__dot" />}
      {children}
    </span>
  );
}
