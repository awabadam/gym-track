"use client";

import { useState } from "react";
import {
  updateRecommendedExercise,
  deleteRecommendedExercise,
} from "@/app/actions/admin";
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

interface RecommendedExercise {
  id: string;
  name: string;
  primaryMuscle: string | null;
  secondaryMuscles: string[] | null;
  type: string | null;
  notes: string | null;
}

export function RecommendedExerciseActions({
  exercise,
}: {
  exercise: RecommendedExercise;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleUpdate(formData: FormData) {
    setEditError(null);
    try {
      await updateRecommendedExercise(exercise.id, formData);
      setEditOpen(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleDelete() {
    try {
      await deleteRecommendedExercise(exercise.id);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Edit ${exercise.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {exercise.name}</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-rec-name">Name</Label>
              <Input id="edit-rec-name" name="name" defaultValue={exercise.name} required />
            </div>
            <MuscleSelect
              defaultPrimary={exercise.primaryMuscle}
              defaultSecondary={exercise.secondaryMuscles}
            />
            <div>
              <Label htmlFor="edit-rec-type">Type</Label>
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
              <Label htmlFor="edit-rec-notes">Notes</Label>
              <Input id="edit-rec-notes" name="notes" defaultValue={exercise.notes ?? ""} />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <Button type="submit" className="w-full">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={(o) => !o && setDeleteError(null)}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label={`Delete ${exercise.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {exercise.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes this exercise from the recommended catalog for all users.
              Exercises in use in any program or with logged history can&apos;t
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
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
