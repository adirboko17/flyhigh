import React from "react";

/**
 * Status pill. Tone maps to the system's semantic colors. Used everywhere a
 * status appears: class status, enrollment, payment, attendance, waitlist.
 *
 * @example
 * <Badge tone="success">שולם</Badge>
 * <Badge tone="warning" dot>ממתין</Badge>
 * <Badge tone="danger">בוטל</Badge>
 *
 * Tone → meaning: success=פעיל/שולם/נוכח · warning=ממתין/חלקי/איחור/מלא ·
 * danger=לא שולם/נעדר/בוטל · neutral=טיוטה/הוחזר · info=הוצע מקום · brand=קטגוריה.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
  /** Show a leading status dot. */
  dot?: boolean;
}
export declare function Badge(props: BadgeProps): JSX.Element;
