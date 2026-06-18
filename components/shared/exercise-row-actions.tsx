"use client";

import {
  deleteProgramExercise,
  updateProgramExercise,
  reorderProgramExercise,
} from "@/app/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ExerciseEntry {
  id: string;
  exerciseName: string;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  notes: string | null;
  supersetGroup: string | null;
  sortOrder: number;
}

export function ExerciseRowActions({
  entry,
  programId,
  isFirst,
  isLast,
}: {
  entry: ExerciseEntry;
  programId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  async function handleUpdate(formData: FormData) {
    await updateProgramExercise(entry.id, programId, formData);
    setEditOpen(false);
  }

  return (
    <div className="flex items-center gap-0.5">
      <form action={reorderProgramExercise.bind(null, entry.id, programId, "up")}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          type="submit"
          disabled={isFirst}
          aria-label={`Move ${entry.exerciseName} up`}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </form>
      <form action={reorderProgramExercise.bind(null, entry.id, programId, "down")}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          type="submit"
          disabled={isLast}
          aria-label={`Move ${entry.exerciseName} down`}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </form>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Edit ${entry.exerciseName}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {entry.exerciseName}</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Sets</Label>
                <Input
                  name="sets"
                  type="number"
                  defaultValue={entry.sets}
                  required
                  min="1"
                />
              </div>
              <div>
                <Label>Rep min</Label>
                <Input
                  name="repRangeMin"
                  type="number"
                  defaultValue={entry.repRangeMin}
                  required
                  min="1"
                />
              </div>
              <div>
                <Label>Rep max</Label>
                <Input
                  name="repRangeMax"
                  type="number"
                  defaultValue={entry.repRangeMax}
                  required
                  min="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Notes</Label>
                <Input
                  name="notes"
                  defaultValue={entry.notes ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Superset group</Label>
                <Input
                  name="supersetGroup"
                  defaultValue={entry.supersetGroup ?? ""}
                  placeholder="e.g. A"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label={`Remove ${entry.exerciseName}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {entry.exerciseName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the exercise from this day. The exercise itself
              stays in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteProgramExercise.bind(null, entry.id, programId)}>
              <AlertDialogAction type="submit">Remove</AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
