"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/utils/cn";

export function CartButton({
  light = false,
}: {
  light?: boolean;
}) {
  const { ready, count } = useCart();
  const visibleCount = ready ? count : 0;
  const label =
    visibleCount === 0
      ? "עגלת קניות"
      : visibleCount === 1
        ? "עגלת קניות, פריט אחד"
        : `עגלת קניות, ${visibleCount} פריטים`;

  return (
    <Link
      href="/cart"
      aria-label={label}
      className={cn(
        "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
        light
          ? "text-white hover:bg-white/12"
          : "text-ink-700 hover:bg-ink-100"
      )}
    >
      <Icon name="bag" size={22} />
      {visibleCount > 0 ? (
        <span className="absolute end-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
          {visibleCount > 9 ? "9+" : visibleCount}
        </span>
      ) : null}
    </Link>
  );
}
