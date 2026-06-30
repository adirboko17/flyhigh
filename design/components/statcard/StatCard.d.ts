import React from "react";

/**
 * Dashboard metric tile: big number + label + tinted icon chip, with a soft
 * corner glow in the chosen tone. The building block of every dashboard grid.
 *
 * @example
 * <StatCard label="לקוחות" value={128} icon={<Users />} tone="brand" />
 * <StatCard label="הכנסות" value="₪48,200" icon={<Wallet />} tone="aqua" hint="החודש" />
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  /** Line-icon node (e.g. a Lucide icon). */
  icon?: React.ReactNode;
  tone?: "brand" | "aqua" | "amber" | "rose" | "violet" | "slate";
  hint?: string;
}
export declare function StatCard(props: StatCardProps): JSX.Element;
