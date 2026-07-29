"use client";

import { useState } from "react";
import { createExercise } from "@/app/actions/exercises";
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
import { MuscleSelect } from "@/components/shared/muscle-select";
import { Plus } from "lucide-react";

const exerciseTypes = ["main", "compound", "iso", "core"];

export function AddExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await createExercise(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create exercise");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add exercise
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New exercise</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <MuscleSelect />
          <div>
            <Label htmlFor="type">Type</Label>
            <Select name="type">
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
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Create exercise
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
