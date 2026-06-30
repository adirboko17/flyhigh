import React from "react";

/**
 * Marketing class card for the public site — image, status badge, category,
 * title, details (instructor / day / time / ages / availability) and price.
 * The whole card is a link to the class detail page.
 *
 * @example
 * <ClassCard
 *   title="חוג שחייה לילדים"
 *   description="קבוצות קטנות, מדריכות מוסמכות ויחס אישי."
 *   instructor="דנה כהן" day="שני" time="16:30"
 *   ageMin={5} ageMax={9} available={4} capacity={12}
 *   price={280} category="שחייה" status="active"
 *   href="/classes/1"
 * />
 */
export interface ClassCardProps {
  title: string;
  description?: string;
  instructor?: string;
  day?: string;
  time?: string;
  ageMin?: number;
  ageMax?: number;
  available?: number;
  capacity?: number;
  price?: number;
  category?: string;
  status?: "draft" | "active" | "full" | "closed";
  image?: string;
  href?: string;
}
export declare function ClassCard(props: ClassCardProps): JSX.Element;
