import { notFound, redirect } from "next/navigation";
import { getSessionById, getLastSessionSets, getBestSet } from "@/data/sessions";
import { getProgression, isUpperBody } from "@/lib/progression";
import { completeSession } from "@/app/actions/sessions";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SetLogger } from "@/components/shared/set-logger";
import { RestTimer } from "@/components/shared/rest-timer";
import { WakeLock } from "@/components/shared/wake-lock";
import { CheckCircle, Trophy, ArrowLeft, Pencil, Check } from "lucide-react";
import { CancelSessionButton } from "@/components/shared/cancel-session-button";
import { MuscleVolumeMap } from "@/components/shared/muscle-volume-map";
import Link from "next/link";

/**
 * Shared session view used by two routes:
 *  - `/workout/[sessionId]` (section="workout") — active logging
 *  - `/log/[sessionId]`     (section="log")     — read-only review
 * Each route redirects to the other when the status doesn't match the
 * section, so the URL always reflects where the user actually is.
 */
export async function SessionDetail({
  sessionId,
  section,
  edit = false,
}: {
  sessionId: string;
  section: "workout" | "log";
  edit?: boolean;
}) {
  const session = await getSessionById(sessionId);

  if (!session) notFound();

  const isComplete = session.status === "completed";

  // Keep the URL in the right section: review completed sessions under /log,
  // resume active sessions under /workout.
  if (isComplete && section === "workout") redirect(`/log/${sessionId}`);
  if (!isComplete && section === "log") redirect(`/workout/${sessionId}`);

  // Active sessions are always editable; completed sessions only when ?edit=1.
  const editing = !isComplete || edit;

  const targetRir = session.targetRir;

  const exerciseData = await Promise.all(
    session.plan.map(async (pe) => {
      const [lastSets, bestSet] = await Promise.all([
        getLastSessionSets(pe.exerciseId, session.programDayId, sessionId),
        getBestSet(pe.exerciseId),
      ]);

      const progression = getProgression(
        lastSets,
        { repRangeMin: pe.repRangeMin, repRangeMax: pe.repRangeMax },
        isUpperBody(pe.muscleGroup),
        targetRir
      );

      const loggedSetsForExercise = session.loggedSets.filter(
        (s) => s.exerciseId === pe.exerciseId
      );

      const previousSetsByNumber = new Map(
        lastSets.map((s) => [s.setNumber, { weight: s.weight, reps: s.reps, rir: s.rir }])
      );

      return {
        ...pe,
        progression,
        loggedSets: loggedSetsForExercise,
        previousSetsByNumber,
        bestSet,
        suggestedWeight: progression.suggestedWeight || lastSets[0]?.weight || 0,
      };
    })
  );

  const totalPlannedSets = session.plan.reduce((sum, pe) => sum + pe.sets, 0);
  const totalLoggedSets = session.loggedSets.length;

  return (
    <div
      className={`mx-auto space-y-4 pb-20 ${editing ? "max-w-xl" : "max-w-5xl"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {isComplete && (
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 -ml-2 mb-1">
              <Link href={edit ? `/log/${sessionId}` : "/log"}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                {edit ? "Cancel" : "Back to log"}
              </Link>
            </Button>
          )}
          <h1 className="text-2xl font-bold">{session.dayName}</h1>
          <p className="text-sm text-muted-foreground">
            {session.dayCode} &mdash; {formatDate(session.date)}
            {edit && (
              <span className="ml-2 border-2 border-foreground bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-foreground">
                Editing
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={isComplete ? "default" : "secondary"} className="font-mono">
            {isComplete && !edit
              ? `${totalLoggedSets} sets`
              : `${totalLoggedSets}/${totalPlannedSets} sets`}
          </Badge>
          {isComplete && !edit && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/log/${sessionId}?edit=1`}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Link>
            </Button>
          )}
          {!isComplete && <CancelSessionButton sessionId={sessionId} />}
        </div>
      </div>

      {/* Completed-session summary: which muscles this workout actually hit. */}
      {isComplete && !editing && totalLoggedSets > 0 && (
        <MuscleVolumeMap
          entries={exerciseData.map((ex) => ({
            muscleGroup: ex.muscleGroup,
            sets: ex.loggedSets.length,
          }))}
          title="Muscles worked"
          subtitle="Sets logged this session"
          emptyText="No sets logged this session."
        />
      )}

      {!isComplete && <RestTimer />}

      <div
        className={
          editing ? "space-y-4" : "grid items-start gap-4 sm:grid-cols-2"
        }
      >
      {exerciseData.map((ex) => {
        const loggedCount = ex.loggedSets.length;

        return (
          <Card key={ex.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ex.exerciseName}</CardTitle>
                <div className="flex items-center gap-2">
                  {!isComplete && (
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {loggedCount}/{ex.sets}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {ex.sets} &times; {ex.repRangeMin}-{ex.repRangeMax}
                  </Badge>
                  {ex.supersetGroup && (
                    <Badge variant="secondary" className="text-xs">
                      SS {ex.supersetGroup}
                    </Badge>
                  )}
                </div>
              </div>
              {!isComplete && (
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {ex.progression.message}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {!editing ? (
                  ex.loggedSets.length > 0 ? (
                    ex.loggedSets
                      .sort((a, b) => a.setNumber - b.setNumber)
                      .map((s) => {
                        const isPR = ex.bestSet
                          ? s.weight > ex.bestSet.weight ||
                            (s.weight === ex.bestSet.weight && s.reps > ex.bestSet.reps)
                          : false;

                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg"
                          >
                            <Badge
                              variant="outline"
                              className="font-mono text-xs w-6 h-6 justify-center shrink-0"
                            >
                              {s.setNumber}
                            </Badge>
                            <span className="font-mono text-sm tabular-nums font-medium">
                              {s.weight}kg
                            </span>
                            <span className="text-muted-foreground">&times;</span>
                            <span className="font-mono text-sm tabular-nums font-medium">
                              {s.reps}
                            </span>
                            {s.rir !== null && (
                              <span className="text-xs text-muted-foreground">
                                RIR {s.rir}
                              </span>
                            )}
                            {isPR && (
                              <Badge className="text-[11px] px-1.5 py-0 bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                                <Trophy className="h-2.5 w-2.5 mr-0.5" />
                                PR
                              </Badge>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      No sets logged
                    </p>
                  )
                ) : (
                  Array.from({ length: ex.sets }, (_, setIdx) => {
                    const setNum = setIdx + 1;
                    const existing = ex.loggedSets.find(
                      (s) => s.setNumber === setNum
                    );

                    return (
                      <SetLogger
                        key={`${ex.exerciseId}-${setNum}`}
                        sessionId={sessionId}
                        exerciseId={ex.exerciseId}
                        setNumber={setNum}
                        defaultRir={targetRir}
                        suggestedWeight={ex.suggestedWeight}
                        repRangeMin={ex.repRangeMin}
                        repRangeMax={ex.repRangeMax}
                        previousSet={ex.previousSetsByNumber.get(setNum)}
                        bestSet={ex.bestSet}
                        existingSet={
                          existing
                            ? {
                                id: existing.id,
                                weight: existing.weight,
                                reps: existing.reps,
                                rir: existing.rir,
                              }
                            : undefined
                        }
                      />
                    );
                  })
                )}
              </div>
              {ex.notes && (
                <>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground">{ex.notes}</p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
      </div>

      {!isComplete && (
        <form action={completeSession.bind(null, sessionId)}>
          <Button className="w-full" size="lg">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finish workout
          </Button>
        </form>
      )}

      {isComplete && edit && (
        <Button asChild className="w-full" size="lg">
          <Link href={`/log/${sessionId}`}>
            <Check className="h-4 w-4 mr-2" />
            Done editing
          </Link>
        </Button>
      )}

      {!isComplete && <WakeLock />}
    </div>
  );
}
