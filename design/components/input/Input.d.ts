import React from "react";

/**
 * Form controls for the על הגובה system: text input, textarea, select, and the
 * `Field` wrapper that adds a label, hint, and error message. RTL by default.
 *
 * @example
 * <Field label="שם מלא" htmlFor="name" required>
 *   <Input id="name" placeholder="לדוגמה: מיכל לוי" />
 * </Field>
 * <Field label="אימייל" htmlFor="email" error="כתובת לא תקינה">
 *   <Input id="email" type="email" dir="ltr" error />
 * </Field>
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}
export declare function Input(props: InputProps): JSX.Element;

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
export declare function Textarea(props: TextareaProps): JSX.Element;

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
}
export declare function Select(props: SelectProps): JSX.Element;

export interface FieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  /** Error message — also flips the child control into its error style. */
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}
export declare function Field(props: FieldProps): JSX.Element;
