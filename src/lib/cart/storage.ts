import {
  CART_MAX_ITEMS,
  CART_STORAGE_KEY,
  type CartItem,
} from "@/lib/cart/types";

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.kind === "string" &&
    typeof item.productId === "string" &&
    typeof item.title === "string" &&
    typeof item.listTotal === "number" &&
    Array.isArray(item.childIds) &&
    typeof item.includeSelf === "boolean" &&
    Array.isArray(item.participantNames)
  );
}

export function readCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem).slice(0, CART_MAX_ITEMS);
  } catch {
    return [];
  }
}

export function writeCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(items.slice(0, CART_MAX_ITEMS))
  );
}
