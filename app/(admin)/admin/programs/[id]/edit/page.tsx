import { notFound } from "next/navigation";
import { getRecommendedProgramById, getAllRecommendedExercises } from "@/data/admin";
import {
  updateRecommendedProgram,
  deleteRecommendedProgram,
} from "@/app/actions/admin";
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

export default async function EditRecommendedProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [program, exercises] = await Promise.all([
    getRecommendedProgramById(id),
    getAllRecommendedExercises(),
  ]);

  if (!program) notFound();

  const programId = program.id;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Programs", href: "/admin/programs" },
          { label: "Edit" },
        ]}
      />
      <h1 className="text-2xl font-bold">Edit recommended program</h1>

      <ProgramWeekBuilder
        program={program}
        exercises={exercises}
        updateDetailsAction={updateRecommendedProgram.bind(null, programId)}
      />

      {/* Danger zone — context-specific to recommended templates. */}
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
                  Permanently deletes this recommended program and all its days
                  and exercises. Users who already cloned it keep their copy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteRecommendedProgram.bind(null, programId)}>
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
