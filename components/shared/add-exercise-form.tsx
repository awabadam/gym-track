"use client";

import { addProgramExercise } from "@/app/actions/programs";
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
import { Plus } from "lucide-react";
import { useState } from "react";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
}

export function AddExerciseForm({
  dayId,
  programId,
  exercises,
}: {
  dayId: string;
  programId: string;
  exercises: Exercise[];
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await addProgramExercise(dayId, programId, formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          Add exercise
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add exercise to day</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label>Exercise</Label>
            <Select name="exerciseId" required>
              <SelectTrigger>
                <SelectValue placeholder="Pick an exercise..." />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                    {ex.muscleGroup && ` (${ex.muscleGroup})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Sets</Label>
              <Input name="sets" type="number" defaultValue="3" required min="1" />
            </div>
            <div>
              <Label>Rep min</Label>
              <Input name="repRangeMin" type="number" defaultValue="8" required min="1" />
            </div>
            <div>
              <Label>Rep max</Label>
              <Input name="repRangeMax" type="number" defaultValue="12" required min="1" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Notes</Label>
              <Input name="notes" placeholder="Optional" />
            </div>
            <div>
              <Label>Superset group</Label>
              <Input name="supersetGroup" placeholder="e.g. A" />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add exercise
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
