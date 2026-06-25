import { notFound } from "next/navigation";
import { getExerciseById, getExerciseHistory, getExerciseStats } from "@/data/exercises";
import { formatDate } from "@/lib/format";
import { bestEstimated1RM, totalVolume } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExerciseActions } from "@/components/shared/exercise-actions";
import { MuscleHighlight } from "@/components/shared/muscle-volume-map";
import { Block } from "@/components/shared/block";
import { LineChart } from "@/components/shared/line-chart";
import { Dumbbell, TrendingUp, Calendar, Hash, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [exercise, history, stats] = await Promise.all([
    getExerciseById(id),
    getExerciseHistory(id),
    getExerciseStats(id),
  ]);

  if (!exercise) notFound();

  // Build time series (oldest → newest) from session history for the charts
  const chrono = [...history].reverse();
  const e1rmSeries = chrono.map((h) => ({
    label: formatDate(h.date),
    value: bestEstimated1RM(h.sets),
  }));
  const volumeSeries = chrono.map((h) => ({
    label: formatDate(h.date),
    value: totalVolume(h.sets),
  }));
  const bestE1rm = e1rmSeries.length
    ? Math.max(...e1rmSeries.map((p) => p.value))
    : 0;
  const latestE1rm = e1rmSeries.length
    ? e1rmSeries[e1rmSeries.length - 1].value
    : 0;
  const prevE1rm =
    e1rmSeries.length > 1 ? e1rmSeries[e1rmSeries.length - 2].value : null;
  const e1rmDelta =
    prevE1rm != null ? Math.round((latestE1rm - prevE1rm) * 10) / 10 : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 shrink-0">
              <Link href="/exercises" aria-label="Back to exercises">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold truncate">{exercise.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-10">
            {exercise.muscleGroup && (
              <Badge variant="outline" className="capitalize text-xs">
                {exercise.muscleGroup}
              </Badge>
            )}
            {exercise.type && (
              <Badge variant="secondary" className="capitalize text-xs">
                {exercise.type}
              </Badge>
            )}
          </div>
          {exercise.notes && (
            <p className="text-sm text-muted-foreground ml-10">{exercise.notes}</p>
          )}
        </div>
        {exercise.isOwner && <ExerciseActions exercise={exercise} />}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs">Best e1RM</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {bestE1rm > 0 ? `${bestE1rm}kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Sessions</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Hash className="h-3.5 w-3.5" />
              <span className="text-xs">Total sets</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats.totalSets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Dumbbell className="h-3.5 w-3.5" />
              <span className="text-xs">Best weight</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {stats.maxWeight ? `${stats.maxWeight}kg` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Best reps</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {stats.maxReps ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program usage */}
      {stats.programs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Used in:</span>
          {stats.programs.map((p, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {p.programName} — {p.dayName}
            </Badge>
          ))}
        </div>
      )}

      {/* Muscle targeted */}
      {exercise.muscleGroup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize">
              Targets: {exercise.muscleGroup}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MuscleHighlight groups={[exercise.muscleGroup]} />
          </CardContent>
        </Card>
      )}

      {/* Analytics charts */}
      {history.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Block
            title="Estimated 1RM"
            tag={
              e1rmDelta != null && e1rmDelta !== 0
                ? `${e1rmDelta > 0 ? "▲" : "▼"} ${Math.abs(e1rmDelta)}kg`
                : `best ${bestE1rm}kg`
            }
          >
            <div className="p-4">
              <LineChart data={e1rmSeries} unit="kg" />
            </div>
          </Block>
          <Block title="Volume / Session" tag={`${chrono.length} sessions`}>
            <div className="p-4">
              <LineChart data={volumeSeries} unit="kg" />
            </div>
          </Block>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          History
          {history.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {history.length} {history.length === 1 ? "session" : "sessions"}
            </span>
          )}
        </h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No sets logged yet</p>
              <p className="text-xs mt-1">Complete a workout with this exercise to see history</p>
            </CardContent>
          </Card>
        ) : (
          history.slice(0, 20).map((session) => (
            <Card key={session.sessionId}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/log/${session.sessionId}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {formatDate(session.date)}
                  </Link>
                  <Badge variant="secondary" className="text-xs">
                    {session.dayName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {/* Mobile: compact list */}
                <div className="sm:hidden space-y-1.5">
                  {session.sets.map((s) => (
                    <div key={s.setNumber} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground font-mono w-4 text-right">{s.setNumber}</span>
                      <span className="font-mono tabular-nums font-medium">{s.weight}kg × {s.reps}</span>
                      {s.rir !== null && (
                        <span className="text-xs text-muted-foreground">RIR {s.rir}</span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Set</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Reps</TableHead>
                        <TableHead>RIR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.sets.map((s) => (
                        <TableRow key={s.setNumber}>
                          <TableCell className="font-mono text-muted-foreground">
                            {s.setNumber}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">
                            {s.weight}kg
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">
                            {s.reps}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-muted-foreground">
                            {s.rir ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {history.length > 20 && (
          <p className="text-xs text-center text-muted-foreground">
            Showing latest 20 of {history.length} sessions
          </p>
        )}
      </div>
    </div>
  );
}
