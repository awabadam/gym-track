import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getClientDetail,
  getClientRecentSessions,
  getClientNotes,
} from "@/data/trainer";
import { formatDate } from "@/lib/format";
import {
  deleteAssignedProgram,
  addCoachNote,
  deleteCoachNote,
} from "@/app/actions/trainer";
import { CoachNoteForm } from "@/components/shared/coach-note-form";
import { CoachNotesList } from "@/components/shared/coach-notes-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AssignProgramForm } from "@/components/shared/assign-program-form";
import { MuscleVolumeMap } from "@/components/shared/muscle-volume-map";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const detail = await getClientDetail(clientId);

  if (!detail) notFound();

  const { client, program, volume } = detail;
  const [recentSessions, notes] = await Promise.all([
    getClientRecentSessions(clientId, 15),
    getClientNotes(clientId),
  ]);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2"
        aria-label="Back to clients"
      >
        <Link href="/clients">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Clients
        </Link>
      </Button>
      <PageHeader
        eyebrow="Client"
        title={client.name ?? "Unknown user"}
        subtitle={client.email ?? "—"}
      />

      {program ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assigned program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{program.name}</p>
                <p className="text-sm text-muted-foreground">
                  {program.days.length}{" "}
                  {program.days.length === 1 ? "day" : "days"}
                  {program.description ? ` · ${program.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/clients/${clientId}/program/edit`}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0"
                      aria-label={`Delete ${program.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete &quot;{program.name}&quot;?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Permanently deletes this assigned program and all its
                        days and exercises. The client&apos;s own programs and
                        workout logs are preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <form action={deleteAssignedProgram.bind(null, program.id)}>
                        <AlertDialogAction type="submit">
                          Delete program
                        </AlertDialogAction>
                      </form>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assign a program</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignProgramForm clientId={clientId} />
          </CardContent>
        </Card>
      )}

      <MuscleVolumeMap
        entries={volume}
        title="Trained volume"
        subtitle={`${client.name ?? "This client"}'s logged sets · last 30 days`}
        emptyText="No sets logged in the last 30 days."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Coaching notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CoachNoteForm action={addCoachNote.bind(null, clientId, null)} />
          <CoachNotesList
            notes={notes}
            emptyText="No notes yet. Leave feedback for this client above."
            deleteAction={deleteCoachNote}
            sessionHref={(sessionId) =>
              `/clients/${clientId}/sessions/${sessionId}`
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent workouts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentSessions.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              No workouts logged yet.
            </p>
          ) : (
            <ul className="divide-y-2 divide-foreground border-t-2 border-foreground">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/clients/${clientId}/sessions/${s.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold uppercase tracking-wide">
                        {s.dayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(s.date)}
                        {s.status !== "completed" ? ` · ${s.status}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {s.setCount} {s.setCount === 1 ? "set" : "sets"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
