"use client";

import { useRef, useState } from "react";

interface HoverState {
  index: number;
  /** Tooltip position in container-relative CSS px, resolved from the
   * actual rendered SVG point (accounts for xMidYMid meet letterboxing). */
  x: number;
  y: number;
}

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
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border-2 border-foreground text-xs uppercase tracking-wide text-muted-foreground"
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
  const lastIndex = points.length - 1;
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

  // Map a client (screen) coordinate to the SVG's user-space, accounting for
  // whatever letterboxing `preserveAspectRatio="xMidYMid meet"` applies —
  // avoids the drift that a naive width/height ratio would introduce.
  function clientToSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  // Inverse: map an SVG user-space point to a position relative to the
  // container (in CSS px), for placing the HTML tooltip over the rendered
  // marker — recomputed from the actual render, not assumed proportions.
  function svgToContainerPoint(svgX: number, svgY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;
    const screenPt = pt.matrixTransform(ctm);
    const rect = svg.getBoundingClientRect();
    return { x: screenPt.x - rect.left, y: screenPt.y - rect.top };
  }

  function nearestIndex(clientX: number, clientY: number) {
    const svgPt = clientToSvgPoint(clientX, clientY);
    const mx = svgPt ? svgPt.x : clientX;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    return nearest;
  }

  // Resolve a data index into a HoverState, reading the SVG's rendered
  // geometry right here in the event handler (never during render) so the
  // tooltip position always matches the actual xMidYMid-meet layout.
  function hoverAt(index: number): HoverState {
    const p = points[index];
    const pos = svgToContainerPoint(p.x, p.y);
    return { index, x: pos?.x ?? p.x, y: pos?.y ?? p.y };
  }

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    setHover(hoverAt(nearestIndex(e.clientX, e.clientY)));
  }

  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setHover((h) => hoverAt(Math.min(lastIndex, (h?.index ?? -1) + 1)));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHover((h) => hoverAt(Math.max(0, (h?.index ?? lastIndex + 1) - 1)));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHover(hoverAt(0));
    } else if (e.key === "End") {
      e.preventDefault();
      setHover(hoverAt(lastIndex));
    } else if (e.key === "Escape") {
      setHover(null);
    }
  }

  const hp = hover != null ? points[hover.index] : null;

  const first = data[0];
  const last = data[lastIndex];
  const summary = `Line chart of ${unit ? unit + " " : ""}over ${data.length} ${
    data.length === 1 ? "point" : "points"
  }, from ${first.label}: ${fmt(first.value)}${unit ? " " + unit : ""} to ${last.label}: ${fmt(
    last.value
  )}${unit ? " " + unit : ""}.`;

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? hoverAt(lastIndex))}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
        className="block overflow-visible focus:outline-2 focus:outline-offset-2 focus:outline-foreground"
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

        {/* area fill under the line — signal tint, decorative only */}
        {areaPath && (
          <path d={areaPath} fill="var(--chart-1)" opacity={0.14} />
        )}

        {/* the line — foreground for legible contrast against paper/ink */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* markers (square = brutalist); the endpoint keeps a signal accent */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - 3}
            y={p.y - 3}
            width={6}
            height={6}
            fill={
              hover?.index === i || i === lastIndex
                ? "var(--chart-1)"
                : "var(--chart-2)"
            }
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

      {/* hover tooltip — positioned from the actual rendered point, not an
          assumed proportion, so it tracks correctly under xMidYMid meet */}
      {hp && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full border-2 border-foreground bg-card px-2 py-1 text-center shadow-[3px_3px_0_0_var(--shadow-color)]"
          style={{
            left: `${hover.x}px`,
            top: `${hover.y - 10}px`,
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

      {/* screen-reader data table — the accessible alternative to the SVG */}
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value{unit ? ` (${unit})` : ""}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.label}</td>
              <td>{fmt(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
