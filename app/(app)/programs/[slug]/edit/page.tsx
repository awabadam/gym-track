import { notFound, redirect } from "next/navigation";
import { getProgramBySlug } from "@/data/programs";
import { getAllExercises } from "@/data/exercises";
import {
  updateProgram,
  deleteProgram,
  setActiveProgram,
} from "@/app/actions/programs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/shared/page-header";
import { Trash2 } from "lucide-react";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, exercises] = await Promise.all([
    getProgramBySlug(slug),
    getAllExercises(),
  ]);

  if (!program) notFound();
  // Clients can VIEW an assigned program but never reach its editor.
  if (!program.canEdit) redirect(`/programs/${slug}`);

  const programId = program.id;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Programs", href: "/programs" },
          { label: program.name, href: `/programs/${slug}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader title="Edit program" />

      <ProgramWeekBuilder
        program={program}
        exercises={exercises}
        updateDetailsAction={updateProgram.bind(null, programId)}
      />

      {/* Activation + danger zone — context-specific to the user's own program. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-4">
          {program.isActive ? (
            <Badge>Active program</Badge>
          ) : (
            <form action={setActiveProgram.bind(null, programId)}>
              <Button type="submit" variant="outline" size="sm">
                Set as active
              </Button>
            </form>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-3 w-3" />
                Delete program
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete &quot;{program.name}&quot;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the program, all its days, and
                  exercise assignments. Workout logs are preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteProgram.bind(null, programId)}>
                  <AlertDialogAction type="submit">
                    Delete program
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
