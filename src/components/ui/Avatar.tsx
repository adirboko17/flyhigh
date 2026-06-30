import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white",
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
