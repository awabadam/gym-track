import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgramBySlug } from "@/data/programs";
import { getAllExercises } from "@/data/exercises";
import {
  updateProgram,
  deleteProgram,
  setActiveProgram,
  addProgramDay,
  duplicateProgramDay,
} from "@/app/actions/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AddExerciseForm } from "@/components/shared/add-exercise-form";
import { ExerciseRowActions } from "@/components/shared/exercise-row-actions";
import { DayActions } from "@/components/shared/day-actions";
import { AddDayForm } from "@/components/shared/add-day-form";
import { ArrowLeft, Plus, Trash2, Copy } from "lucide-react";

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

  const programId = program.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild aria-label="Back to program">
          <Link href={`/programs/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit program</h1>
      </div>

      {/* Program details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateProgram.bind(null, programId)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={program.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={program.description ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="targetRir">Target RIR</Label>
                <select
                  id="targetRir"
                  name="targetRir"
                  defaultValue={String(program.targetRir)}
                  className="mt-1 flex h-8 w-full border-2 border-foreground bg-transparent px-2.5 text-sm"
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "rep" : "reps"} in reserve
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Target RIR = reps left in the tank before the app suggests adding
              weight.
            </p>
            <p className="text-xs text-muted-foreground">
              Slug: <code className="font-mono">{program.slug}</code> (auto-generated from name)
            </p>
            <Button type="submit" size="sm">
              Save details
            </Button>
          </form>
          <div className="flex items-center gap-2 mt-2">
            {!program.isActive && (
              <form action={setActiveProgram.bind(null, programId)}>
                <Button type="submit" variant="outline" size="sm">
                  Set as active
                </Button>
              </form>
            )}
            {program.isActive && (
              <Badge>Active program</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      {program.days.map((day) => (
        <Card key={day.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {day.dayCode}
                </Badge>
                <CardTitle className="text-base">{day.name}</CardTitle>
                {day.scheduledDay && (
                  <span className="text-xs text-muted-foreground capitalize">
                    ({day.scheduledDay})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <form action={duplicateProgramDay.bind(null, day.id, programId)}>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0" type="submit" aria-label={`Duplicate ${day.name}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </form>
                <DayActions day={day} programId={programId} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.exercises.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table className="table-fixed min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Exercise</TableHead>
                    <TableHead className="w-[8%]">Sets</TableHead>
                    <TableHead className="w-[10%]">Reps</TableHead>
                    <TableHead className="w-[22%]">Notes</TableHead>
                    <TableHead className="w-[20%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {day.exercises.map((ex, idx) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium">
                        {ex.exerciseName}
                        {ex.supersetGroup && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            SS {ex.supersetGroup}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{ex.sets}</TableCell>
                      <TableCell className="font-mono">
                        {ex.repRangeMin}-{ex.repRangeMax}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ex.notes}
                      </TableCell>
                      <TableCell>
                        <ExerciseRowActions
                          entry={ex}
                          programId={programId}
                          isFirst={idx === 0}
                          isLast={idx === day.exercises.length - 1}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No exercises yet.
              </p>
            )}
            <AddExerciseForm
              dayId={day.id}
              programId={programId}
              exercises={exercises}
            />
          </CardContent>
        </Card>
      ))}

      {/* Add day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddDayForm programId={programId} />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-3 w-3 mr-1" />
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
