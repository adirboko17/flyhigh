import React from "react";

/**
 * Friendly empty placeholder: dashed surface, circular brand icon chip, title,
 * description, and an optional CTA. Use whenever a list or table has no rows.
 *
 * @example
 * <EmptyState
 *   icon={<Waves />}
 *   title="אין חוגים עדיין"
 *   description="צרו את החוג הראשון שלכם."
 *   action={<Button>+ חוג חדש</Button>}
 * />
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
