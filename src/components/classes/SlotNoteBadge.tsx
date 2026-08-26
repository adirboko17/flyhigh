import { Badge } from "@/components/ui/Badge";

export function SlotNoteBadge({
  note,
  className,
}: {
  note?: string | null;
  className?: string;
}) {
  const text = note?.trim();
  if (!text) return null;

  return (
    <Badge tone="warning" className={className}>
      {text}
    </Badge>
  );
}
