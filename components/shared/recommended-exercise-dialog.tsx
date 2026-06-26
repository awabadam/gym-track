"use client";

import { useState } from "react";
import { createRecommendedExercise } from "@/app/actions/admin";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MuscleSelect } from "@/components/shared/muscle-select";
import { Plus } from "lucide-react";

const exerciseTypes = ["main", "compound", "iso", "core"];

export function RecommendedExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await createRecommendedExercise(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create exercise");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add recommended
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recommended exercise</DialogTitle>
          <DialogDescription>
            Shared with every user. Only admins can edit or remove it.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rec-name">Name</Label>
            <Input id="rec-name" name="name" required />
          </div>
          <MuscleSelect />
          <div>
            <Label htmlFor="rec-type">Type</Label>
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
            <Label htmlFor="rec-notes">Notes</Label>
            <Input id="rec-notes" name="notes" />
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
