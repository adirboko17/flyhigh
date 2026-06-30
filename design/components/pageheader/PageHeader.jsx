import React from "react";

export function PageHeader({ title, description, action }) {
  return (
    <div className="ah-page-header">
      <div>
        <h1 className="ah-page-header__title">{title}</h1>
        {description && <p className="ah-page-header__desc">{description}</p>}
      </div>
      {action && <div className="ah-page-header__actions">{action}</div>}
    </div>
  );
}
