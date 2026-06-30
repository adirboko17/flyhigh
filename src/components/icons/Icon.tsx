import { ICON_PATHS, type IconName } from "./paths";

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}

export function Icon({ name, size = 20, stroke = 1.75, className }: IconProps) {
  const d = ICON_PATHS[name] ?? "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
