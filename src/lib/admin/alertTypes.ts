export const ALERT_TABS = ["all", "collection", "membership", "absence"] as const;

export type AlertTab = (typeof ALERT_TABS)[number];

export type AdminAlertKind = "collection" | "membership" | "absence";

export type AdminAlert = {
  key: string;
  kind: AdminAlertKind;
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
  meta: string;
  statusLabel: string;
  href: string | null;
  customerHref: string | null;
  phone: string | null;
  amountLabel: string | null;
  unseen: boolean;
};

export function parseAlertTab(value: string | undefined): AlertTab {
  return ALERT_TABS.includes(value as AlertTab) ? (value as AlertTab) : "all";
}

export function customerCardHref(parentId: string | null | undefined) {
  return parentId ? `/admin/customers?id=${parentId}` : null;
}
