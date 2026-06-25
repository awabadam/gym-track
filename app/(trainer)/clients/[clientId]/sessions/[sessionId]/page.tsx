import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientSessionDetail, getClientSessionNotes } from "@/data/trainer";
import { addCoachNote, deleteCoachNote } from "@/app/actions/trainer";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MuscleVolumeMap } from "@/components/shared/muscle-volume-map";
import { CoachNoteForm } from "@/components/shared/coach-note-form";
import { CoachNotesList } from "@/components/shared/coach-notes-list";
import { ArrowLeft } from "lucide-react";

export default async function ClientSessionPage({
  params,
}: {
  params: Promise<{ clientId: string; sessionId: string }>;
}) {
  const { clientId, sessionId } = await params;
  const session = await getClientSessionDetail(clientId, sessionId);

  if (!session) notFound();

  const notes = await getClientSessionNotes(clientId, sessionId);

  // Group the logged sets under each planned exercise.
  const setsByExercise = new Map<string, typeof session.loggedSets>();
  for (const set of session.loggedSets) {
    const list = setsByExercise.get(set.exerciseId) ?? [];
    list.push(set);
    setsByExercise.set(set.exerciseId, list);
  }

  const totalLogged = session.loggedSets.length;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2"
        aria-label="Back to client"
      >
        <Link href={`/clients/${clientId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Client
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{session.dayName}</h1>
          <p className="text-sm text-muted-foreground">
            {session.dayCode} &mdash; {formatDate(session.date)}
            {session.status !== "completed" ? ` · ${session.status}` : ""}
          </p>
        </div>
        <Badge variant="secondary" className="font-mono">
          {totalLogged} {totalLogged === 1 ? "set" : "sets"}
        </Badge>
      </div>

      {totalLogged > 0 && (
        <MuscleVolumeMap
          entries={session.plan.map((pe) => ({
            muscleGroup: pe.muscleGroup,
            sets: setsByExercise.get(pe.exerciseId)?.length ?? 0,
          }))}
          title="Muscles worked"
          subtitle="Sets logged this session"
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feedback on this workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CoachNoteForm
            action={addCoachNote.bind(null, clientId, sessionId)}
            placeholder="Leave feedback on this workout…"
          />
          <CoachNotesList
            notes={notes}
            emptyText="No feedback on this workout yet."
            deleteAction={deleteCoachNote}
          />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        {session.plan.map((pe) => {
          const logged = setsByExercise.get(pe.exerciseId) ?? [];
          return (
            <Card key={pe.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{pe.exerciseName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {pe.sets} &times; {pe.repRangeMin}-{pe.repRangeMax}
                    </Badge>
                    {pe.supersetGroup && (
                      <Badge variant="secondary" className="text-xs">
                        SS {pe.supersetGroup}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logged.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sets logged</p>
                ) : (
                  <div className="space-y-1.5">
                    {logged.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-4 text-right font-mono text-muted-foreground">
                          {s.setNumber}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {s.weight}kg &times; {s.reps}
                        </span>
                        {s.rir !== null && (
                          <span className="text-xs text-muted-foreground">
                            RIR {s.rir}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
