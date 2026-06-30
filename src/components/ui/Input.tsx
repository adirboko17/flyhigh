import { forwardRef } from "react";
import { cn } from "@/utils/cn";

const fieldBase =
  "w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50 disabled:text-ink-400";

const dsInput = "ah-input";
const dsSelect = "ah-select";
const dsTextarea = "ah-textarea";

type FieldVariant = "default" | "ds";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { variant?: FieldVariant; error?: boolean }
>(({ className, variant = "default", error, ...props }, ref) => {
  const cls =
    variant === "ds"
      ? cn(dsInput, error && "is-error", className)
      : cn(fieldBase, "h-11", className);
  return <input ref={ref} className={cls} {...props} />;
});
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { variant?: FieldVariant; error?: boolean }
>(({ className, variant = "default", error, ...props }, ref) => {
  const cls =
    variant === "ds"
      ? cn(dsTextarea, error && "is-error", className)
      : cn(fieldBase, "min-h-24 py-2.5", className);
  return <textarea ref={ref} className={cls} {...props} />;
});
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { variant?: FieldVariant; error?: boolean }
>(({ className, variant = "default", error, children, ...props }, ref) => {
  const cls =
    variant === "ds"
      ? cn(dsSelect, error && "is-error", className)
      : cn(fieldBase, "h-11 cursor-pointer", className);
  return (
    <select ref={ref} className={cls} {...props}>
      {children}
    </select>
  );
});
Select.displayName = "Select";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  variant?: FieldVariant;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  variant = "default",
}: FieldProps) {
  if (variant === "ds") {
    return (
      <div className={cn("ah-field", className)}>
        <label className="ah-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ah-field__req">*</span>}
        </label>
        {children}
        {hint && !error && <p className="ah-field__hint">{hint}</p>}
        {error && <p className="ah-field__error">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-ink-800"
      >
        {label}
        {required && <span className="mr-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
