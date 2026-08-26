"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readCartItems, writeCartItems } from "@/lib/cart/storage";
import {
  CART_MAX_ITEMS,
  cartItemKey,
  newCartItemId,
  type CartItem,
} from "@/lib/cart/types";

type CartContextValue = {
  ready: boolean;
  items: CartItem[];
  count: number;
  addItem: (
    item: Omit<CartItem, "id">
  ) => { ok: true; replaced: boolean } | { ok: false; error: string };
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCartItems());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeCartItems(items);
  }, [items, ready]);

  const addItem = useCallback((input: Omit<CartItem, "id">) => {
    const incoming = { ...input, id: newCartItemId() };
    const key = cartItemKey(incoming);

    let result: { ok: true; replaced: boolean } | { ok: false; error: string } =
      { ok: true, replaced: false };

    setItems((current) => {
      const existingIndex = current.findIndex((item) => cartItemKey(item) === key);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = { ...incoming, id: current[existingIndex].id };
        result = { ok: true, replaced: true };
        return next;
      }
      if (current.length >= CART_MAX_ITEMS) {
        result = { ok: false, error: "הסל מלא. סיימו את הרכישה או הסירו פריט." };
        return current;
      }
      return [...current, incoming];
    });

    return result;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      ready,
      items,
      count: items.length,
      addItem,
      removeItem,
      clear,
    }),
    [ready, items, addItem, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used within CartProvider");
  }
  return value;
}
