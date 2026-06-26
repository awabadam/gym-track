"use client";

import { useMemo } from "react";
import Model, { type IExerciseData } from "react-body-highlighter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMuscleSlug, muscleLabel } from "@/lib/muscles";

// Heat ramp by set count. Index 0 = "assisting" (a supporting muscle with no
// direct set count); indices 1–5 = direct-volume tiers (lightest → deepest).
const HIGHLIGHT_COLORS = [
  "#ecfccb", // assist
  "#d9f99d",
  "#bef264",
  "#a3e635",
  "#84cc16",
  "#65a30d",
];
// Two-tier colours for the highlight-only variant: [secondary, primary].
const HIGHLIGHT_PAIR = ["#d9f99d", "#65a30d"];
const UNWORKED = "#d4d4d4";

// Map a set total to a 1–5 colour bucket (0 = untrained).
function bucket(sets: number): number {
  if (sets <= 0) return 0;
  if (sets <= 3) return 1;
  if (sets <= 7) return 2;
  if (sets <= 11) return 3;
  if (sets <= 15) return 4;
  return 5;
}

export interface VolumeEntry {
  // Fine muscle slugs (lib/muscles). `primary` carries the direct set volume;
  // `secondary` muscles are shown as lightly assisting.
  primary: string | null;
  secondary?: string[] | null;
  sets: number;
}

/** Front + back body figures. `widthRem` sets each figure's width (1:2 ratio). */
function BodyDiagram({
  data,
  highlightedColors,
  widthRem,
}: {
  data: IExerciseData[];
  highlightedColors: string[];
  widthRem: number;
}) {
  const style = { width: `${widthRem}rem`, height: `${widthRem * 2}rem` };
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Model
        data={data}
        type="anterior"
        bodyColor={UNWORKED}
        highlightedColors={highlightedColors}
        style={style}
      />
      <Model
        data={data}
        type="posterior"
        bodyColor={UNWORKED}
        highlightedColors={highlightedColors}
        style={style}
      />
    </div>
  );
}

/**
 * Body diagram heat-mapped by training volume (total sets) per muscle. Primary
 * muscles drive the set counts + heat; supporting (secondary) muscles are lit
 * lightly and listed separately. Feed any pre-aggregated `entries`.
 */
export function MuscleVolumeMap({
  entries,
  title = "Weekly muscle volume",
  subtitle = "Direct sets per muscle. Supporting muscles shown lighter.",
  emptyText = "Add exercises (with a muscle set) to see your volume light up here.",
}: {
  entries: VolumeEntry[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
}) {
  const { data, worked, assisting } = useMemo(() => {
    const primaryTotals = new Map<string, number>();
    const assist = new Set<string>();

    for (const e of entries) {
      if (isMuscleSlug(e.primary)) {
        primaryTotals.set(e.primary, (primaryTotals.get(e.primary) ?? 0) + e.sets);
      }
      for (const s of e.secondary ?? []) {
        if (isMuscleSlug(s)) assist.add(s);
      }
    }
    // A primary muscle is never also "just assisting".
    for (const slug of primaryTotals.keys()) assist.delete(slug);

    const worked = [...primaryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const assisting = [...assist].sort((a, b) =>
      muscleLabel(a).localeCompare(muscleLabel(b)),
    );

    const data: IExerciseData[] = [
      ...worked.map(([slug, sets]) => ({
        name: slug,
        muscles: [slug] as IExerciseData["muscles"],
        frequency: bucket(sets) + 1, // shift past the index-0 "assist" colour
      })),
      ...assisting.map((slug) => ({
        name: slug,
        muscles: [slug] as IExerciseData["muscles"],
        frequency: 1,
      })),
    ];
    return { data, worked, assisting };
  }, [entries]);

  const isEmpty = worked.length === 0 && assisting.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <BodyDiagram
              data={data}
              highlightedColors={HIGHLIGHT_COLORS}
              widthRem={9}
            />
            {worked.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {worked.map(([slug, sets]) => (
                  <li
                    key={slug}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 border border-foreground"
                        style={{
                          backgroundColor: HIGHLIGHT_COLORS[bucket(sets)],
                        }}
                      />
                      <span className="truncate">{muscleLabel(slug)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {sets} {sets === 1 ? "set" : "sets"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {assisting.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Assisting:</span>{" "}
                {assisting.map((s) => muscleLabel(s)).join(", ")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact, legend-free body diagram that highlights an exercise's primary
 * muscles (deep) and supporting muscles (light).
 */
export function MuscleHighlight({
  primary = [],
  secondary = [],
  widthRem = 7,
}: {
  primary?: (string | null)[];
  secondary?: (string | null)[];
  widthRem?: number;
}) {
  const data = useMemo<IExerciseData[]>(() => {
    const primaries = [...new Set(primary.filter(isMuscleSlug))];
    const primarySet = new Set(primaries);
    const secondaries = [...new Set(secondary.filter(isMuscleSlug))].filter(
      (s) => !primarySet.has(s),
    );

    const out: IExerciseData[] = [];
    if (secondaries.length > 0) {
      out.push({ name: "secondary", muscles: secondaries, frequency: 1 });
    }
    if (primaries.length > 0) {
      out.push({ name: "primary", muscles: primaries, frequency: 2 });
    }
    return out;
  }, [primary, secondary]);

  if (data.length === 0) return null;

  return (
    <BodyDiagram data={data} highlightedColors={HIGHLIGHT_PAIR} widthRem={widthRem} />
  );
}
