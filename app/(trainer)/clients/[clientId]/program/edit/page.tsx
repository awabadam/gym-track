import { notFound } from "next/navigation";
import { getClientDetail } from "@/data/trainer";
import { getAllExercises } from "@/data/exercises";
import { updateProgram } from "@/app/actions/programs";
import { deleteAssignedProgram } from "@/app/actions/trainer";
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
import { ProgramWeekBuilder } from "@/components/shared/program-week-builder";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Trash2 } from "lucide-react";

export default async function EditAssignedProgramPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [detail, exercises] = await Promise.all([
    getClientDetail(clientId),
    getAllExercises(),
  ]);

  // No active client, or no assigned program for them yet → nothing to edit.
  if (!detail || !detail.program) notFound();

  const { client, program } = detail;
  const programId = program.id;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Clients", href: "/clients" },
          {
            label: client.name ?? client.email ?? "Client",
            href: `/clients/${clientId}`,
          },
          { label: "Program" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold">Edit assigned program</h1>
        <p className="text-sm text-muted-foreground">
          For {client.name ?? client.email ?? "your client"}
        </p>
      </div>

      <ProgramWeekBuilder
        program={program}
        exercises={exercises}
        updateDetailsAction={updateProgram.bind(null, programId)}
      />

      {/* Danger zone — context-specific to a trainer-assigned program. */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-3 w-3" />
                Delete program
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{program.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently deletes the program you assigned to this client,
                  with all its days and exercises. Their logged workouts are
                  preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteAssignedProgram.bind(null, programId)}>
                  <AlertDialogAction type="submit">Delete program</AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
