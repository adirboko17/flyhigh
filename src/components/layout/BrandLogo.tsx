import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utils/cn";

const LOGO_SRC = "/images/alagova-logo.png";

interface BrandLogoProps {
  /** גובה הלוגו בפיקסלים */
  height?: number;
  /** הצגת כותרת משנה (למשל באזור ניהול) */
  subtitle?: string;
  /** האם לעטוף בקישור לדף הבית */
  href?: string;
  className?: string;
}

export function BrandLogo({
  height = 44,
  subtitle,
  href = "/",
  className,
}: BrandLogoProps) {
  const width = Math.round(height * 2.05);

  const logo = (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative shrink-0"
        style={{ height, width }}
      >
        <Image
          src={LOGO_SRC}
          alt="על הגובה"
          fill
          sizes={`${width}px`}
          className="object-contain object-center"
          priority
        />
      </div>
      {subtitle && (
        <span className="leading-tight">
          <span className="block text-xs font-medium text-ink-400">{subtitle}</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {logo}
      </Link>
    );
  }

  return logo;
}
