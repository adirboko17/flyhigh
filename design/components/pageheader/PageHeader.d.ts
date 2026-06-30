import React from "react";

/**
 * Standard page title block for admin/parent/instructor screens: extrabold
 * title, muted description, and right-aligned action slot.
 *
 * @example
 * <PageHeader
 *   title="ניהול חוגים"
 *   description="יצירה, עריכה וניהול של כל החוגים"
 *   action={<Button>+ חוג חדש</Button>}
 * />
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export declare function PageHeader(props: PageHeaderProps): JSX.Element;
