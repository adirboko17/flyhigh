import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-glow hover:bg-brand-700 focus-visible:ring-brand-400",
  secondary:
    "bg-aqua-500 text-white hover:bg-aqua-600 focus-visible:ring-aqua-400",
  outline:
    "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-300 focus-visible:ring-brand-300",
  ghost: "text-ink-700 hover:bg-ink-100 focus-visible:ring-ink-300",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-12 px-7 text-base gap-2 rounded-xl",
};

const base =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
