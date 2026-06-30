import React from "react";

/**
 * Round avatar. Renders an image when `src` is given, otherwise the person's
 * Hebrew initials on the brand gradient.
 *
 * @example
 * <Avatar name="מיכל לוי" />
 * <Avatar name="דנה כהן" size="lg" />
 * <Avatar name="איתן" src="/photo.jpg" size="sm" />
 */
export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}
export declare function Avatar(props: AvatarProps): JSX.Element;
