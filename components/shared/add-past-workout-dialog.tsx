"use client";

import { useMemo, useState, useTransition } from "react";
import { startPastSession } from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus } from "lucide-react";

type Day = {
  id: string;
  name: string;
  dayCode: string;
  programName: string;
};

export function AddPastWorkoutDialog({
  days,
  today,
}: {
  days: Day[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [dayId, setDayId] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Group days by program for the select
  const grouped = useMemo(() => {
    const map = new Map<string, Day[]>();
    for (const d of days) {
      if (!map.has(d.programName)) map.set(d.programName, []);
      map.get(d.programName)!.push(d);
    }
    return [...map.entries()];
  }, [days]);

  function submit() {
    if (!dayId) return setError("Pick a workout day.");
    if (!date) return setError("Pick a date.");
    if (date > today) return setError("Date can’t be in the future.");
    setError(null);
    startTransition(async () => {
      try {
        await startPastSession(dayId, date);
      } catch (e) {
        // redirect() throws internally on success — only surface real errors
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message);
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <CalendarPlus className="mr-1 h-3.5 w-3.5" />
          Log past workout
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a past workout</DialogTitle>
          <DialogDescription>
            Pick the day and the date it happened — you&apos;ll enter your sets
            on the next screen.
          </DialogDescription>
        </DialogHeader>

        {days.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No program days yet. Create a program first, then you can log past
            workouts.
          </p>
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="pw-date">Date</Label>
              <Input
                id="pw-date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Workout day</Label>
              <Select value={dayId} onValueChange={setDayId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {grouped.map(([programName, programDays]) => (
                    <SelectGroup key={programName}>
                      <SelectLabel>{programName}</SelectLabel>
                      {programDays.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.dayCode})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || days.length === 0}
          >
            {pending ? "Starting…" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
