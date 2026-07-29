import { Button } from "@/components/ui/Button";

export function SettingsSectionRow({
  title,
  description,
  buttonLabel = "עריכה",
  onAction,
}: {
  title: string;
  description?: string;
  buttonLabel?: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onAction}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
