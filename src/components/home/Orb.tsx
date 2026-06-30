interface OrbProps {
  color: string;
  size: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  blur?: number;
  opacity?: number;
}

export function Orb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  blur = 60,
  opacity = 0.5,
}: OrbProps) {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        background: color,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
}
