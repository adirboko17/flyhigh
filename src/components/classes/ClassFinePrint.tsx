import { cn } from "@/utils/cn";

export function ClassFinePrint({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  const note = text?.trim();
  if (!note) return null;
  const body = note.startsWith("*") ? note.slice(1).trim() : note;

  return (
    <p className={cn("text-xs leading-relaxed text-ink-500", className)}>
      *{body}
    </p>
  );
}
