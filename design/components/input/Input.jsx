import React from "react";

export function Input({ className = "", error = false, success = false, ...props }) {
  const cls = ["ah-input", error ? "is-error" : "", success ? "is-success" : "", className]
    .filter(Boolean).join(" ");
  return <input className={cls} {...props} />;
}

export function Textarea({ className = "", error = false, ...props }) {
  const cls = ["ah-textarea", error ? "is-error" : "", className].filter(Boolean).join(" ");
  return <textarea className={cls} {...props} />;
}

export function Select({ className = "", error = false, success = false, children, ...props }) {
  const cls = ["ah-select", error ? "is-error" : "", success ? "is-success" : "", className]
    .filter(Boolean).join(" ");
  return <select className={cls} {...props}>{children}</select>;
}

export function Field({ label, htmlFor, hint, error, required, children }) {
  return (
    <div className="ah-field">
      {label && (
        <label className="ah-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ah-field__req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="ah-field__hint">{hint}</p>}
      {error && <p className="ah-field__error">{error}</p>}
    </div>
  );
}
