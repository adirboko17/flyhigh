import React from "react";

/**
 * Primary action button for the על הגובה system. Five visual variants and
 * three sizes. Use `<Button>` for actions and `<ButtonLink>` for navigation.
 *
 * @example
 * <Button>הרשמה לחוג</Button>
 * <Button variant="secondary" size="lg">לצפייה בחוגים</Button>
 * <Button variant="outline" size="sm">ביטול</Button>
 * <ButtonLink href="/register" block>פתיחת חשבון</ButtonLink>
 *
 * Variants: primary (brand blue + glow), secondary (aqua), outline, ghost, danger.
 * Sizes: sm (36px) · md (44px) · lg (48px). `block` makes it full-width.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
}
export declare function Button(props: ButtonProps): JSX.Element;

export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
}
export declare function ButtonLink(props: ButtonLinkProps): JSX.Element;
