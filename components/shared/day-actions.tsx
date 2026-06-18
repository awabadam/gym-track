"use client";

import { deleteProgramDay, updateProgramDay } from "@/app/actions/programs";
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
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface Day {
  id: string;
  name: string;
  dayCode: string;
  scheduledDay: string | null;
}

export function DayActions({
  day,
  programId,
}: {
  day: Day;
  programId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);

  async function handleUpdate(formData: FormData) {
    await updateProgramDay(day.id, programId, formData);
    setEditOpen(false);
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Edit ${day.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit day</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div>
              <Label>Day name</Label>
              <Input name="name" defaultValue={day.name} required />
            </div>
            <div>
              <Label>Day code</Label>
              <Input
                name="dayCode"
                defaultValue={day.dayCode}
                required
                placeholder="e.g. UA"
              />
            </div>
            <div>
              <Label>Scheduled day</Label>
              <Select name="scheduledDay" defaultValue={day.scheduledDay ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map((d) => (
                    <SelectItem key={d} value={d}>
                      <span className="capitalize">{d}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" aria-label={`Delete ${day.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {day.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the day and all its exercises. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteProgramDay.bind(null, day.id, programId)}>
              <AlertDialogAction type="submit">Delete</AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
