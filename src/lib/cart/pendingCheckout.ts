const PENDING_CART_CHECKOUT_KEY = "flyhigh-pending-cart-checkout";

export function readPendingCartCheckoutId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(PENDING_CART_CHECKOUT_KEY);
  } catch {
    return null;
  }
}

export function writePendingCartCheckoutId(checkoutId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (checkoutId) {
      window.sessionStorage.setItem(PENDING_CART_CHECKOUT_KEY, checkoutId);
    } else {
      window.sessionStorage.removeItem(PENDING_CART_CHECKOUT_KEY);
    }
  } catch {
    /* sessionStorage might be blocked */
  }
}
