"use client";

import { useMemo } from "react";
import Model, { type IExerciseData, type Muscle } from "react-body-highlighter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Our catalog muscle groups (lib/validation MUSCLE_GROUPS) → react-body-highlighter
// slugs. A group can map to several slugs across the front/back views.
const MUSCLE_SLUGS: Record<string, Muscle[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["front-deltoids", "back-deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  core: ["abs", "obliques"],
};

// Heat ramp by set count. The library colors a muscle with
// highlightedColors[bucket - 1], so index 0 = lightest (least volume).
const HIGHLIGHT_COLORS = ["#d9f99d", "#bef264", "#a3e635", "#84cc16", "#65a30d"];
// Single accent for the highlight-only variant (exercise targets).
const ACCENT_COLOR = "#a3e635";
const UNWORKED = "#d4d4d4";

// Map a set total to a 1–5 colour bucket (0 = untrained, no colour).
function bucket(sets: number): number {
  if (sets <= 0) return 0;
  if (sets <= 3) return 1;
  if (sets <= 7) return 2;
  if (sets <= 11) return 3;
  if (sets <= 15) return 4;
  return 5;
}

export interface VolumeEntry {
  muscleGroup: string | null;
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
 * Body diagram heat-mapped by training volume (total sets) per muscle group,
 * with a per-muscle legend. Feed it any pre-aggregated `entries` — planned
 * program volume, actual logged volume, a single session, etc.
 */
export function MuscleVolumeMap({
  entries,
  title = "Weekly muscle volume",
  subtitle = "Total sets per muscle. More volume = deeper colour.",
  emptyText = "Add exercises (with a muscle group set) to see your volume light up here.",
}: {
  entries: VolumeEntry[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
}) {
  const { data, worked } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      if (!e.muscleGroup || !MUSCLE_SLUGS[e.muscleGroup]) continue;
      totals.set(e.muscleGroup, (totals.get(e.muscleGroup) ?? 0) + e.sets);
    }
    const worked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const data: IExerciseData[] = worked.map(([group, sets]) => ({
      name: group,
      muscles: MUSCLE_SLUGS[group],
      frequency: bucket(sets),
    }));
    return { data, worked };
  }, [entries]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {worked.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <BodyDiagram
              data={data}
              highlightedColors={HIGHLIGHT_COLORS}
              widthRem={9}
            />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {worked.map(([group, sets]) => (
                <li
                  key={group}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 border border-foreground"
                      style={{
                        backgroundColor: HIGHLIGHT_COLORS[bucket(sets) - 1],
                      }}
                    />
                    <span className="truncate capitalize">{group}</span>
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {sets} {sets === 1 ? "set" : "sets"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact, legend-free body diagram that just highlights the given muscle
 * group(s) in a single accent colour — e.g. the muscle one exercise targets.
 */
export function MuscleHighlight({
  groups,
  widthRem = 7,
}: {
  groups: (string | null)[];
  widthRem?: number;
}) {
  const data = useMemo<IExerciseData[]>(() => {
    const muscles = groups
      .filter((g): g is string => !!g && !!MUSCLE_SLUGS[g])
      .flatMap((g) => MUSCLE_SLUGS[g]);
    if (muscles.length === 0) return [];
    return [{ name: "target", muscles, frequency: 1 }];
  }, [groups]);

  if (data.length === 0) return null;

  return (
    <BodyDiagram data={data} highlightedColors={[ACCENT_COLOR]} widthRem={widthRem} />
  );
}
