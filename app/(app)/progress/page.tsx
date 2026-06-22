import Link from "next/link";
import { getActiveProgram } from "@/data/programs";
import { getProgressForProgram } from "@/data/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Sparkline } from "@/components/shared/sparkline";
import { TrendingUp } from "lucide-react";

export default async function ProgressPage() {
  const program = await getActiveProgram();

  if (!program) {
    return (
      <div className="space-y-6">
        <PageHeader title="Progress" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No active program</p>
            <p className="text-sm mt-1">Create and activate a program to start tracking progress</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/programs">Go to programs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = await getProgressForProgram(program.id, program.targetRir);

  // Group progress by muscle group
  const grouped = new Map<string, typeof progress>();
  for (const p of progress) {
    const group = p.muscleGroup ?? "Other";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(p);
  }

  // Compute weekly sets per muscle group from program structure
  // Each program exercise has a `sets` count; sum across all days for each muscle group
  const weeklyVolume = new Map<string, number>();
  for (const day of program.days) {
    for (const ex of day.exercises) {
      const group = ex.muscleGroup ?? "Other";
      weeklyVolume.set(group, (weeklyVolume.get(group) ?? 0) + ex.sets);
    }
  }

  // Sort muscle groups: by volume descending, "Other" last
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    if (a[0] === "Other") return 1;
    if (b[0] === "Other") return -1;
    return (weeklyVolume.get(b[0]) ?? 0) - (weeklyVolume.get(a[0]) ?? 0);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        subtitle={program.name}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`/programs/${program.slug}/edit`}>
              Target RIR: {program.targetRir}
            </Link>
          </Button>
        }
      />

      {/* Weekly volume summary with bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-baseline gap-2">
            Weekly volume
            <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
              sets / muscle / week
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {(() => {
              const sorted = [...weeklyVolume.entries()].sort((a, b) => {
                if (a[0] === "Other") return 1;
                if (b[0] === "Other") return -1;
                return b[1] - a[1];
              });
              const maxSets = Math.max(...sorted.map(([, s]) => s), 1);
              return sorted.map(([group, sets]) => (
                <div key={group} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs font-bold uppercase tracking-wide">
                    {group}
                  </span>
                  <div className="h-3 flex-1 border border-foreground bg-muted">
                    <div
                      className="h-full bg-signal"
                      style={{ width: `${(sets / maxSets) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right font-mono text-xs font-bold tabular-nums">
                    {sets}
                  </span>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Progress table grouped by muscle group */}
      {sortedGroups.map(([group, exercises]) => (
        <Card key={group}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize flex items-center gap-2">
              {group}
              {weeklyVolume.has(group) && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {weeklyVolume.get(group)} sets/wk
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: compact list — no sparkline, no horizontal scroll */}
            <div className="md:hidden">
              {exercises.map((p) => (
                <Link
                  key={p.exerciseId}
                  href={`/exercises/${p.exerciseId}`}
                  className="block border-b-2 border-foreground px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold uppercase tracking-wide">
                      {p.exerciseName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-bold">
                      {p.recommendation}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                    <span>Range {p.repRange}</span>
                    <span>Best {p.bestE1RM > 0 ? `${p.bestE1RM}kg` : "—"}</span>
                    <span>Last {p.lastWeight > 0 ? `${p.lastWeight}kg` : "—"}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden md:block">
            <Table className="min-w-[760px] table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[21%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead className="text-right">Best E1RM</TableHead>
                  <TableHead className="text-right">Last Weight</TableHead>
                  <TableHead className="text-right">Low Reps</TableHead>
                  <TableHead>Next move</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercises.map((p) => (
                  <TableRow key={p.exerciseId}>
                    <TableCell>
                      <Link
                        href={`/exercises/${p.exerciseId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {p.exerciseName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/exercises/${p.exerciseId}`}
                        aria-label={`${p.exerciseName} progress`}
                        className="inline-block"
                      >
                        <Sparkline values={p.series.map((s) => s.e1rm)} />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {p.repRange}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {p.bestE1RM > 0 ? `${p.bestE1RM} kg` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {p.lastWeight > 0 ? `${p.lastWeight} kg` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {p.lastLowestReps > 0 ? p.lastLowestReps : "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs break-words whitespace-normal">
                      {p.recommendation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
