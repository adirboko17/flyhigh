import type { PlanKind } from "@/lib/enrollment/planActions";
import type { ProgramKind } from "@/lib/programs";

export type CartItemKind = "class" | PlanKind;

export type CartItem = {
  id: string;
  kind: CartItemKind;
  productId: string;
  title: string;
  /** סכום משוער לתצוגה — הסכום הקובע מחושב בשרת בקופה. */
  listTotal: number;
  childIds: string[];
  includeSelf: boolean;
  participantNames: string[];
  weeklySlotId?: string | null;
  weeklySlotLabel?: string | null;
  quantity?: number;
  programKind?: ProgramKind | null;
  entriesCount?: number | null;
  extraHalfHourPrice?: number | null;
};

export const CART_STORAGE_KEY = "flyhigh-cart-v1";
export const CART_MAX_ITEMS = 20;

export function cartItemKey(item: Pick<
  CartItem,
  "kind" | "productId" | "childIds" | "includeSelf" | "weeklySlotId" | "quantity"
>) {
  const children = [...item.childIds].filter(Boolean).sort().join(",");
  const slot = item.weeklySlotId ?? "";
  const qty = item.quantity ?? 1;
  return `${item.kind}:${item.productId}:${slot}:${item.includeSelf ? 1 : 0}:${children}:${qty}`;
}

export function newCartItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
