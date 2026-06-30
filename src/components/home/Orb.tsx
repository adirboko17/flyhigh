import { cn } from "@/utils/cn";

interface OrbProps {
  color: string;
  size: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  blur?: number;
  opacity?: number;
  motion?: "drift-a" | "drift-b" | "drift-c";
}

const motionClass: Record<NonNullable<OrbProps["motion"]>, string> = {
  "drift-a": "hero-orb hero-orb--a",
  "drift-b": "hero-orb hero-orb--b",
  "drift-c": "hero-orb hero-orb--c",
};

export function Orb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  blur = 60,
  opacity = 0.5,
  motion,
}: OrbProps) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
      }}
    >
      <div
        className={cn("h-full w-full rounded-full", motion && motionClass[motion])}
        style={{
          background: color,
          filter: `blur(${blur}px)`,
          opacity: motion ? undefined : opacity,
          ["--orb-opacity" as string]: opacity,
        }}
      />
    </div>
  );
}
