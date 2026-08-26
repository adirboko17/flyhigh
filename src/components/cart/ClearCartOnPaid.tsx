"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { writePendingCartCheckoutId } from "@/lib/cart/pendingCheckout";

export function ClearCartOnPaid({ paid }: { paid: boolean }) {
  const { ready, clear } = useCart();

  useEffect(() => {
    if (!ready || !paid) return;
    clear();
    writePendingCartCheckoutId(null);
  }, [ready, paid, clear]);

  return null;
}
