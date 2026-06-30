import React from "react";

export function EmptyState({ title, description, icon, action, className = "" }) {
  return (
    <div className={["ah-empty", className].filter(Boolean).join(" ")}>
      {icon && <div className="ah-empty__icon">{icon}</div>}
      <p className="ah-empty__title">{title}</p>
      {description && <p className="ah-empty__desc">{description}</p>}
      {action && <div className="ah-empty__action">{action}</div>}
    </div>
  );
}
