"use client";

import { useState } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}

const W = 640;
const H = 240;
const PAD = { top: 18, right: 16, bottom: 28, left: 44 };

export function LineChart({
  data,
  unit = "",
  height = 240,
}: {
  data: ChartPoint[];
  unit?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-border text-xs uppercase tracking-wide text-muted-foreground"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const x0 = PAD.left;
  const x1 = W - PAD.right;
  const y0 = PAD.top;
  const y1 = H - PAD.bottom;

  const values = data.map((d) => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // Avoid a flat divide-by-zero; pad around the single value
    min = min === 0 ? 0 : min * 0.95;
    max = max === 0 ? 1 : max * 1.05;
  } else {
    const span = max - min;
    min = Math.max(0, min - span * 0.12);
    max = max + span * 0.12;
  }

  const xAt = (i: number) =>
    data.length === 1 ? (x0 + x1) / 2 : x0 + (i / (data.length - 1)) * (x1 - x0);
  const yAt = (v: number) => y1 - ((v - min) / (max - min)) * (y1 - y0);

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), ...d }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)} ${y1} L${points[0].x.toFixed(1)} ${y1} Z`
      : "";

  const yTicks = [min, (min + max) / 2, max];
  const fmt = (v: number) =>
    Number.isInteger(v) ? `${v}` : v.toFixed(v < 10 ? 1 : 0);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const hp = hover != null ? points[hover] : null;

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        className="overflow-visible"
      >
        {/* y gridlines + labels */}
        {yTicks.map((v, i) => {
          const y = yAt(v);
          return (
            <g key={i}>
              <line
                x1={x0}
                x2={x1}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? "0" : "3 4"}
              />
              <text
                x={x0 - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={11}
                fontFamily="var(--font-mono)"
                fill="var(--muted-foreground)"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* area fill under the line */}
        {areaPath && (
          <path d={areaPath} fill="var(--signal)" opacity={0.14} />
        )}

        {/* the line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* markers (square = brutalist) */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - 3}
            y={p.y - 3}
            width={6}
            height={6}
            fill={hover === i ? "var(--signal)" : "var(--foreground)"}
            stroke="var(--background)"
            strokeWidth={1.5}
          />
        ))}

        {/* x labels: first + last */}
        <text
          x={x0}
          y={H - 8}
          textAnchor="start"
          fontSize={11}
          fontFamily="var(--font-mono)"
          fill="var(--muted-foreground)"
        >
          {data[0].label}
        </text>
        {data.length > 1 && (
          <text
            x={x1}
            y={H - 8}
            textAnchor="end"
            fontSize={11}
            fontFamily="var(--font-mono)"
            fill="var(--muted-foreground)"
          >
            {data[data.length - 1].label}
          </text>
        )}

        {/* hover crosshair */}
        {hp && (
          <line
            x1={hp.x}
            x2={hp.x}
            y1={y0}
            y2={y1}
            stroke="var(--foreground)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* hover tooltip */}
      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full border-2 border-foreground bg-card px-2 py-1 text-center shadow-[3px_3px_0_0_var(--shadow-color)]"
          style={{
            left: `${(hp.x / W) * 100}%`,
            top: `${(hp.y / H) * height - 10}px`,
          }}
        >
          <div
            className="text-sm leading-none tabular-nums"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmt(hp.value)}
            {unit && <span className="ml-0.5 text-[10px]">{unit}</span>}
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            {hp.label}
          </div>
        </div>
      )}
    </div>
  );
}
