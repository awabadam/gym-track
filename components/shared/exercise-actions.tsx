"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateExercise, deleteExercise } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MuscleSelect } from "@/components/shared/muscle-select";
import { Pencil, Trash2 } from "lucide-react";

const exerciseTypes = ["main", "compound", "iso", "core"];

interface ExerciseActionsProps {
  exercise: {
    id: string;
    name: string;
    primaryMuscle: string | null;
    secondaryMuscles: string[] | null;
    type: string | null;
    notes: string | null;
  };
}

export function ExerciseActions({ exercise }: ExerciseActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  async function handleUpdate(formData: FormData) {
    setUpdateError(null);
    try {
      await updateExercise(exercise.id, formData);
      setEditOpen(false);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Failed to save changes");
    }
  }

  async function handleDelete() {
    try {
      await deleteExercise(exercise.id);
      router.push("/exercises");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Edit */}
      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) setUpdateError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label={`Edit ${exercise.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit exercise</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={exercise.name}
                required
              />
            </div>
            <MuscleSelect
              defaultPrimary={exercise.primaryMuscle}
              defaultSecondary={exercise.secondaryMuscles}
            />
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Select name="type" defaultValue={exercise.type ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {exerciseTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="capitalize">{t}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                name="notes"
                defaultValue={exercise.notes ?? ""}
              />
            </div>
            {updateError && (
              <p className="text-sm text-destructive">{updateError}</p>
            )}
            <Button type="submit" className="w-full">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-destructive hover:text-destructive" aria-label={`Delete ${exercise.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {exercise.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the exercise from your library.
              Exercises used in programs or with logged history cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteError(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
