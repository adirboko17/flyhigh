import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utils/cn";

const DEFAULT_LOGO_SRC = "/images/alagova-logo.png";

interface BrandLogoProps {
  /** מקור הלוגו */
  src?: string;
  /** גובה הלוגו בפיקסלים */
  height?: number;
  /** רוחב הלוגו בפיקסלים (ברירת מחדל לפי יחס גובה) */
  width?: number;
  /** הצגת כותרת משנה (למשל באזור ניהול) */
  subtitle?: string;
  /** האם לעטוף בקישור לדף הבית */
  href?: string;
  className?: string;
  /** לוגו לבן - לשימוש על רקע כהה/שקוף */
  light?: boolean;
  /** ריבוע קטן — חיתוך לאייקון בראש הלוגו, לסרגל מצומצם. */
  compact?: boolean;
}

export function BrandLogo({
  src = DEFAULT_LOGO_SRC,
  height = 44,
  width: widthProp,
  subtitle,
  href = "/",
  className,
  light = false,
  compact = false,
}: BrandLogoProps) {
  const width = compact ? height : (widthProp ?? Math.round(height * 2.05));

  const logo = (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          compact && "rounded-2xl"
        )}
        style={{ height, width }}
      >
        <Image
          src={src}
          alt="על הגובה"
          fill
          sizes={`${width}px`}
          className={cn(
            "transition-[filter] duration-300",
            compact
              ? "object-cover object-right"
              : "object-contain object-center",
            light && "brightness-0 invert"
          )}
          priority
        />
      </div>
      {subtitle && !compact && (
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
