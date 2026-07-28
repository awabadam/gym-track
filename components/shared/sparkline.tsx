/**
 * Minimal static sparkline (no axes, no interactivity) — a foreground trend
 * line (readable in both themes) with a signal-accented square cap on the
 * latest point. Server-renderable.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) {
    return <span className="font-mono text-xs text-muted-foreground">—</span>;
  }
  if (values.length === 1) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <rect
          x={width / 2 - 3}
          y={height / 2 - 3}
          width={6}
          height={6}
          fill="var(--chart-1)"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 4;
  const xAt = (i: number) =>
    pad + (i / (values.length - 1)) * (width - pad * 2);
  const yAt = (v: number) =>
    max === min
      ? height / 2
      : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(" ");

  const lastX = xAt(values.length - 1);
  const lastY = yAt(values[values.length - 1]);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke="var(--chart-2)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x={lastX - 2.5} y={lastY - 2.5} width={5} height={5} fill="var(--chart-1)" />
    </svg>
  );
}
