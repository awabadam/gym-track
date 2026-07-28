"use client";

import { useMemo, useState } from "react";
import {
  updateProgramExercise,
  reorderProgramExercise,
  deleteProgramExercise,
  deleteProgramDay,
  addTrainingDay,
  quickAddExercise,
  renameProgramDay,
  setDayWeekday,
} from "@/app/actions/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MuscleVolumeMap } from "@/components/shared/muscle-volume-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Pencil,
} from "lucide-react";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Weekday = (typeof WEEKDAYS)[number];

interface BuilderExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  primaryMuscle: string | null;
  secondaryMuscles: string[] | null;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  sortOrder: number;
  notes: string | null;
  supersetGroup: string | null;
}

interface BuilderDay {
  id: string;
  name: string;
  dayCode: string;
  scheduledDay: string | null;
  sortOrder: number;
  exercises: BuilderExercise[];
}

interface CatalogExercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  type: string | null;
}

interface BuilderProgram {
  id: string;
  name: string;
  description: string | null;
  targetRir: number;
  days: BuilderDay[];
}

function label(weekday: string): string {
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}


export function ProgramWeekBuilder({
  program,
  exercises,
  updateDetailsAction,
}: {
  program: BuilderProgram;
  exercises: CatalogExercise[];
  // Context-specific details save: updateProgram (user/trainer) or
  // updateRecommendedProgram (admin template). Bound with programId by the page.
  updateDetailsAction: (formData: FormData) => Promise<void>;
}) {
  const programId = program.id;

  // Map each weekday to a single day, keeping the FIRST day seen on it. Any day
  // without a weekday OR colliding on an already-claimed weekday (possible with
  // legacy data) is surfaced in the Unscheduled section so nothing is silently
  // dropped — the user can reassign it to a free weekday there.
  const { byWeekday, unscheduled } = useMemo(() => {
    const map = new Map<Weekday, BuilderDay>();
    const extras: BuilderDay[] = [];
    for (const day of program.days) {
      const wd = day.scheduledDay as Weekday | null;
      if (wd && WEEKDAYS.includes(wd) && !map.has(wd)) {
        map.set(wd, day);
      } else {
        extras.push(day);
      }
    }
    return { byWeekday: map, unscheduled: extras };
  }, [program.days]);

  return (
    <div className="space-y-4">
      <DetailsHeader program={program} updateDetailsAction={updateDetailsAction} />

      {/* Whole week visible at once as a grid: 1 / 2 / 3 columns by width.
          Each cell is the day's full inline editor. */}
      <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {WEEKDAYS.map((weekday) => {
          const day = byWeekday.get(weekday);
          return day ? (
            <TrainingDayCard
              key={weekday}
              weekday={weekday}
              day={day}
              programId={programId}
              exercises={exercises}
            />
          ) : (
            <RestDayCard key={weekday} weekday={weekday} programId={programId} />
          );
        })}
      </div>

      <MuscleVolumeMap
        entries={program.days.flatMap((d) =>
          d.exercises.map((e) => ({
            primary: e.primaryMuscle,
            secondary: e.secondaryMuscles,
            sets: e.sets,
          })),
        )}
      />

      {unscheduled.length > 0 && (
        <UnscheduledSection
          days={unscheduled}
          programId={programId}
          exercises={exercises}
        />
      )}
    </div>
  );
}

function DetailsHeader({
  program,
  updateDetailsAction,
}: {
  program: BuilderProgram;
  updateDetailsAction: (formData: FormData) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await updateDetailsAction(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save details");
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form action={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={program.name} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={program.description ?? ""}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
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
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function RestDayCard({
  weekday,
  programId,
}: {
  weekday: Weekday;
  programId: string;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    try {
      await addTrainingDay(programId, weekday);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add training day");
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-2 py-3">
        <div>
          <p className="font-bold">{label(weekday)}</p>
          <p className="text-xs text-muted-foreground">Rest</p>
        </div>
        <form action={handleAdd}>
          <Button variant="outline" size="sm" type="submit" className="w-full">
            <Plus className="mr-1 h-3 w-3" />
            Add training
          </Button>
        </form>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function TrainingDayCard({
  weekday,
  day,
  programId,
  exercises,
}: {
  weekday: Weekday;
  day: BuilderDay;
  programId: string;
  exercises: CatalogExercise[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{label(weekday)}</CardTitle>
            <DayLabelEditor day={day} programId={programId} />
          </div>
          <RemoveDayButton day={day} programId={programId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {day.exercises.length > 0 ? (
          <div className="divide-y-2 divide-foreground border-2 border-foreground">
            {day.exercises.map((ex, idx) => (
              <ExerciseRow
                key={ex.id}
                entry={ex}
                programId={programId}
                isFirst={idx === 0}
                isLast={idx === day.exercises.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No exercises yet.</p>
        )}
        <ExercisePicker
          dayId={day.id}
          programId={programId}
          exercises={exercises}
        />
      </CardContent>
    </Card>
  );
}

function DayLabelEditor({
  day,
  programId,
}: {
  day: BuilderDay;
  programId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(day.name);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await renameProgramDay(day.id, programId, value);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename");
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(day.name);
          setEditing(true);
        }}
        className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Rename day label"
      >
        <span className="truncate">{day.name}</span>
        <Pencil className="h-3 w-3 shrink-0" />
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="h-8"
          aria-label="Day label"
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          type="button"
          onClick={save}
          aria-label="Save label"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RemoveDayButton({
  day,
  programId,
}: {
  day: BuilderDay;
  programId: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 shrink-0 p-0 text-destructive"
          aria-label={`Remove ${label(day.scheduledDay ?? day.name)}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make this a rest day?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the training day and all its exercises. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteProgramDay.bind(null, day.id, programId)}>
            <AlertDialogAction type="submit">Remove</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ExerciseRow({
  entry,
  programId,
  isFirst,
  isLast,
}: {
  entry: BuilderExercise;
  programId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(formData: FormData) {
    setError(null);
    const repRangeMin = Number(formData.get("repRangeMin"));
    const repRangeMax = Number(formData.get("repRangeMax"));
    if (repRangeMin > repRangeMax) {
      setError("Max reps must be ≥ min reps");
      return;
    }
    try {
      await updateProgramExercise(entry.id, programId, formData);
      setExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <div className="p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Edit ${entry.exerciseName}`}
          aria-expanded={expanded}
        >
          <span className="font-medium">{entry.exerciseName}</span>
          {entry.supersetGroup && (
            <Badge variant="outline" className="ml-2 text-xs">
              SS {entry.supersetGroup}
            </Badge>
          )}
          <span className="ml-2 font-mono text-sm text-muted-foreground">
            {entry.sets}x{entry.repRangeMin}-{entry.repRangeMax}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <form
            action={reorderProgramExercise.bind(
              null,
              entry.id,
              programId,
              "up"
            )}
          >
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
          <form
            action={reorderProgramExercise.bind(
              null,
              entry.id,
              programId,
              "down"
            )}
          >
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
          <form
            action={deleteProgramExercise.bind(null, entry.id, programId)}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              type="submit"
              aria-label={`Remove ${entry.exerciseName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {expanded && (
        <form action={handleUpdate} className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ExercisePicker({
  dayId,
  programId,
  exercises,
}: {
  dayId: string;
  programId: string;
  exercises: CatalogExercise[];
}) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const term = search.trim().toLowerCase();
  const results = term
    ? exercises
        .filter(
          (ex) =>
            ex.name.toLowerCase().includes(term) ||
            (ex.muscleGroup?.toLowerCase().includes(term) ?? false)
        )
        .slice(0, 8)
    : [];

  async function add(exerciseId: string) {
    setError(null);
    try {
      await quickAddExercise(dayId, programId, exerciseId);
      setSearch("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add exercise");
    }
  }

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Add exercise — search by name or muscle…"
        aria-label="Search exercises to add"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {results.length > 0 && (
        <div className="divide-y-2 divide-foreground border-2 border-foreground">
          {results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => add(ex.id)}
              className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-signal hover:text-signal-foreground"
            >
              <span className="font-medium">{ex.name}</span>
              {ex.muscleGroup && (
                <span className="text-xs capitalize text-muted-foreground">
                  {ex.muscleGroup}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UnscheduledSection({
  days,
  programId,
  exercises,
}: {
  days: BuilderDay[];
  programId: string;
  exercises: CatalogExercise[];
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Unscheduled days</CardTitle>
        <p className="text-xs text-muted-foreground">
          These days aren&apos;t pinned to a weekday yet. Assign each one to slot
          it into the week.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map((day) => (
          <UnscheduledDay
            key={day.id}
            day={day}
            programId={programId}
            exercises={exercises}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function UnscheduledDay({
  day,
  programId,
  exercises,
}: {
  day: BuilderDay;
  programId: string;
  exercises: CatalogExercise[];
}) {
  const [error, setError] = useState<string | null>(null);

  async function assign(weekday: string) {
    setError(null);
    try {
      await setDayWeekday(day.id, programId, weekday);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign weekday");
    }
  }

  return (
    <div className="space-y-3 border-2 border-foreground p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{day.name}</p>
          <DayLabelEditor day={day} programId={programId} />
        </div>
        <div className="w-40 shrink-0">
          <Select onValueChange={assign}>
            <SelectTrigger aria-label={`Assign ${day.name} to a weekday`}>
              <SelectValue placeholder="Assign day…" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  <span className="capitalize">{d}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {day.exercises.length > 0 ? (
        <div className="divide-y-2 divide-foreground border-2 border-foreground">
          {day.exercises.map((ex, idx) => (
            <ExerciseRow
              key={ex.id}
              entry={ex}
              programId={programId}
              isFirst={idx === 0}
              isLast={idx === day.exercises.length - 1}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No exercises yet.</p>
      )}
      <ExercisePicker
        dayId={day.id}
        programId={programId}
        exercises={exercises}
      />
    </div>
  );
}
