import React from "react";

/**
 * The "על הגובה" wordmark logo (transparent PNG — never on a black box).
 * Pass `src` as the path to the logo from wherever you render it.
 *
 * @example
 * <BrandLogo height={48} href="/" />
 * <BrandLogo height={40} subtitle="אזור ניהול" />
 */
export interface BrandLogoProps {
  /** Path to the transparent logo PNG. Defaults to "assets/alagova-logo.png". */
  src?: string;
  /** Logo height in px (width auto-scales ~2.05×). */
  height?: number;
  /** Small caption beside the logo, e.g. "אזור ניהול". */
  subtitle?: string;
  /** Wrap in a link. */
  href?: string;
  className?: string;
}
export declare function BrandLogo(props: BrandLogoProps): JSX.Element;
