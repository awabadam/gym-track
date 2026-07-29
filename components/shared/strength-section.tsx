"use client";

import { useState, useTransition, type CSSProperties } from "react";
import type { StrengthData, TrackedLift } from "@/data/goals";
import {
  logOneRepMax,
  setStrengthGoal,
  deleteStrengthGoal,
  deleteOneRepMax,
} from "@/app/actions/goals";
import { formatDate } from "@/lib/format";
import { Block } from "@/components/shared/block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkline } from "@/components/shared/sparkline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Target, Plus, Trash2, ChevronDown, TrendingUp } from "lucide-react";

const NEXT_REDIRECT = "NEXT_REDIRECT";

type Option = { id: string; name: string };

export function StrengthSection({
  data,
  today,
}: {
  data: StrengthData;
  today: string;
}) {
  const { tracked, exerciseOptions } = data;

  // Dialog state: a `null` exerciseId means "let the user pick a lift".
  const [logFor, setLogFor] = useState<string | null | undefined>(undefined);
  const [goalFor, setGoalFor] = useState<
    { exerciseId: string | null; goal: TrackedLift["goal"] } | undefined
  >(undefined);

  return (
    <>
      <Block
        title="Strength"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setGoalFor({ exerciseId: null, goal: null })}
              className="flex items-center gap-1 bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-signal hover:text-signal-foreground"
            >
              <Target className="h-3 w-3" /> Set goal
            </button>
            <button
              onClick={() => setLogFor(null)}
              className="flex items-center gap-1 bg-signal px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Log 1RM
            </button>
          </div>
        }
      >
        {tracked.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-bold uppercase tracking-wide">
              No lifts tracked yet
            </p>
            <p className="max-w-xs text-xs uppercase tracking-wide text-muted-foreground">
              Log a tested one-rep max or set a target to start tracking your
              strength.
            </p>
            <Button size="sm" className="mt-2" onClick={() => setLogFor(null)}>
              <Plus className="mr-1 h-4 w-4" /> Log your first 1RM
            </Button>
          </div>
        ) : (
          tracked.map((lift) => (
            <LiftRow
              key={lift.exerciseId}
              lift={lift}
              onLog={() => setLogFor(lift.exerciseId)}
              onEditGoal={() =>
                setGoalFor({ exerciseId: lift.exerciseId, goal: lift.goal })
              }
            />
          ))
        )}
      </Block>

      {logFor !== undefined && (
        <LogOneRmDialog
          fixedExerciseId={logFor}
          exerciseOptions={exerciseOptions}
          today={today}
          onClose={() => setLogFor(undefined)}
        />
      )}

      {goalFor !== undefined && (
        <GoalDialog
          fixedExerciseId={goalFor.exerciseId}
          existingGoal={goalFor.goal}
          exerciseOptions={exerciseOptions}
          onClose={() => setGoalFor(undefined)}
        />
      )}
    </>
  );
}

function LiftRow({
  lift,
  onLog,
  onEditGoal,
}: {
  lift: TrackedLift;
  onLog: () => void;
  onEditGoal: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [pending, start] = useTransition();

  const pct = lift.progressPct ?? 0;
  const achieved = lift.goal != null && pct >= 100;
  const basisIsEstimate = lift.currentOneRm == null;

  function removeRecord(id: string) {
    start(async () => {
      try {
        await deleteOneRepMax(id);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes(NEXT_REDIRECT))) throw e;
      }
    });
  }

  return (
    <div className="border-b-2 border-foreground last:border-b-0">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Lift + numbers */}
        <div className="flex items-center gap-4">
          <div className="flex min-w-[88px] flex-col items-center justify-center border-2 border-foreground bg-card px-3 py-2">
            <span
              className="text-3xl leading-none tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {lift.currentOneRm ?? "—"}
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {lift.currentOneRm != null ? "kg · 1RM" : "no 1RM"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold uppercase tracking-wide">
              {lift.exerciseName}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              est. {lift.estimatedOneRm > 0 ? `${lift.estimatedOneRm} kg` : "—"}
              {lift.oneRmHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory((s) => !s)}
                  className="ml-2 inline-flex items-center gap-0.5 underline"
                >
                  {lift.oneRmHistory.length} record
                  {lift.oneRmHistory.length > 1 ? "s" : ""}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showHistory ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </p>
          </div>
          {lift.oneRmHistory.length > 1 && (
            <div className="hidden sm:block">
              <Sparkline values={lift.oneRmHistory.map((r) => r.value)} />
            </div>
          )}
        </div>

        {/* Goal + progress */}
        <div className="flex items-center gap-4">
          {lift.goal ? (
            <div className="min-w-[140px]">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
                {achieved ? (
                  <span className="border-2 border-foreground bg-signal px-1.5 py-0.5 text-signal-foreground">
                    Achieved
                  </span>
                ) : (
                  <span className="text-muted-foreground">Goal</span>
                )}
                <span>→ {lift.goal.targetValue} kg</span>
              </div>
              <div className="mt-1 h-2.5 w-full border-2 border-foreground bg-card">
                <div
                  className="h-full bg-signal"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                <span className="tabular-nums">
                  {pct}%{basisIsEstimate ? " (est.)" : ""}
                </span>
                {lift.goal.targetDate && <span>by {formatDate(lift.goal.targetDate)}</span>}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEditGoal}>
              <Target className="mr-1 h-3.5 w-3.5" />
              {lift.goal ? "Edit" : "Goal"}
            </Button>
            <Button size="sm" onClick={onLog}>
              <Plus className="mr-1 h-3.5 w-3.5" /> 1RM
            </Button>
          </div>
        </div>
      </div>

      {/* History */}
      {showHistory && lift.oneRmHistory.length > 0 && (
        <div className="border-t-2 border-foreground bg-card/50 px-4 py-2">
          {[...lift.oneRmHistory].reverse().map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 py-1 text-xs"
            >
              <span className="font-mono tabular-nums">{r.value} kg</span>
              <span className="text-muted-foreground">{formatDate(r.achievedOn)}</span>
              <span className="flex-1 truncate text-muted-foreground">{r.note}</span>
              <button
                onClick={() => removeRecord(r.id)}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label="Delete record"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Confetti() {
  // 18 deterministic pieces (no RNG → stable) fanning out as they fall.
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }, (_, i) => {
        const left = (i * 37) % 100;
        const x = ((i * 53) % 120) - 60;
        const rot = 200 + ((i * 97) % 520);
        const delay = (i % 6) * 0.07;
        const filled = i % 2 === 0;
        return (
          <span
            key={i}
            className={`confetti-piece ${filled ? "bg-signal" : "bg-background"}`}
            style={
              {
                left: `${left}%`,
                "--x": `${x}px`,
                "--r": `${rot}deg`,
                "--d": `${delay}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function CelebrationView({
  celebration,
  liftName,
  onClose,
}: {
  celebration: {
    value: number;
    previousBest: number | null;
    isNewBest: boolean;
    achievedGoal: boolean;
    goalTarget: number | null;
  };
  liftName?: string;
  onClose: () => void;
}) {
  const { value, previousBest, isNewBest, achievedGoal, goalTarget } = celebration;
  const delta =
    previousBest != null ? Math.round((value - previousBest) * 10) / 10 : null;
  const celebrate = isNewBest || achievedGoal;

  return (
    <div className="relative flex flex-col items-center gap-3.5 overflow-hidden py-6 text-center">
      {celebrate && <Confetti />}

      <div
        className="animate-pop relative border-4 border-foreground bg-signal px-6 py-4 text-signal-foreground shadow-[6px_6px_0_0_var(--shadow-color)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <p className="text-xs uppercase tracking-[0.3em]">
          {isNewBest ? "New 1RM" : "Logged"}
        </p>
        <p className="text-6xl leading-none tabular-nums">
          {value}
          <span className="text-2xl"> kg</span>
        </p>
      </div>

      {isNewBest && delta != null && delta > 0 && (
        <span className="relative flex items-center gap-1 border-2 border-foreground bg-foreground px-3 py-1 text-sm font-bold uppercase tracking-wide text-background">
          <TrendingUp className="h-4 w-4" /> +{delta} kg · new best
        </span>
      )}
      {previousBest == null && (
        <span className="relative border-2 border-foreground bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide">
          First 1RM on record
        </span>
      )}
      {!isNewBest && previousBest != null && (
        <p className="relative text-xs text-muted-foreground">
          Your best stays {previousBest} kg
        </p>
      )}

      {achievedGoal && (
        <div
          className="relative flex items-center gap-2 border-2 border-foreground bg-signal px-4 py-2 text-signal-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-base uppercase tracking-wide">
            Goal {goalTarget} kg cleared!
          </span>
        </div>
      )}

      <p className="relative text-sm text-muted-foreground">
        {liftName} — logged and locked in.
      </p>
      <Button onClick={onClose} className="relative mt-1">
        Done
      </Button>
    </div>
  );
}

function LogOneRmDialog({
  fixedExerciseId,
  exerciseOptions,
  today,
  onClose,
}: {
  fixedExerciseId: string | null;
  exerciseOptions: Option[];
  today: string;
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState(fixedExerciseId ?? "");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    value: number;
    previousBest: number | null;
    isNewBest: boolean;
    achievedGoal: boolean;
    goalTarget: number | null;
  } | null>(null);
  const [pending, start] = useTransition();

  const fixedName = fixedExerciseId
    ? exerciseOptions.find((e) => e.id === fixedExerciseId)?.name
    : null;

  function submit() {
    if (!exerciseId) return setError("Pick a lift.");
    const num = Number(value);
    if (!num || num <= 0) return setError("Enter the weight you lifted.");
    if (!date) return setError("Pick the date.");
    setError(null);
    start(async () => {
      try {
        const result = await logOneRepMax({
          exerciseId,
          value: num,
          achievedOn: date,
          note: note || undefined,
        });
        setCelebration(result);
      } catch (e) {
        if (e instanceof Error && !e.message.includes(NEXT_REDIRECT)) {
          setError(e.message);
        }
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {celebration ? (
          <CelebrationView
            celebration={celebration}
            liftName={
              fixedName ?? exerciseOptions.find((e) => e.id === exerciseId)?.name
            }
            onClose={onClose}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Log a 1RM</DialogTitle>
              <DialogDescription>
                A tested one-rep max — the real thing you put on the bar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {fixedExerciseId ? (
                <div className="border-2 border-foreground bg-card px-3 py-2 text-sm font-bold uppercase tracking-wide">
                  {fixedName}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Lift</Label>
                  <Select value={exerciseId} onValueChange={setExerciseId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a lift" />
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="orm-value">Weight (kg)</Label>
                  <Input
                    id="orm-value"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="100"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orm-date">Date</Label>
                  <Input
                    id="orm-date"
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orm-note">Note (optional)</Label>
                <Input
                  id="orm-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Belt, fresh, etc."
                />
              </div>

              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Saving…" : "Log it"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({
  fixedExerciseId,
  existingGoal,
  exerciseOptions,
  onClose,
}: {
  fixedExerciseId: string | null;
  existingGoal: TrackedLift["goal"];
  exerciseOptions: Option[];
  onClose: () => void;
}) {
  const [exerciseId, setExerciseId] = useState(fixedExerciseId ?? "");
  const [target, setTarget] = useState(
    existingGoal ? String(existingGoal.targetValue) : ""
  );
  const [targetDate, setTargetDate] = useState(existingGoal?.targetDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fixedName = fixedExerciseId
    ? exerciseOptions.find((e) => e.id === fixedExerciseId)?.name
    : null;

  function submit() {
    if (!exerciseId) return setError("Pick a lift.");
    const num = Number(target);
    if (!num || num <= 0) return setError("Enter a target weight.");
    setError(null);
    start(async () => {
      try {
        await setStrengthGoal({
          exerciseId,
          targetValue: num,
          targetDate: targetDate || undefined,
        });
        onClose();
      } catch (e) {
        if (e instanceof Error && !e.message.includes(NEXT_REDIRECT)) {
          setError(e.message);
        }
      }
    });
  }

  function remove() {
    if (!existingGoal) return;
    start(async () => {
      try {
        await deleteStrengthGoal(existingGoal.id);
        onClose();
      } catch (e) {
        if (e instanceof Error && !e.message.includes(NEXT_REDIRECT)) {
          setError(e.message);
        }
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingGoal ? "Edit goal" : "Set a goal"}</DialogTitle>
          <DialogDescription>
            Target a one-rep max to chase. Progress tracks against your best 1RM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {fixedExerciseId ? (
            <div className="border-2 border-foreground bg-card px-3 py-2 text-sm font-bold uppercase tracking-wide">
              {fixedName}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Lift</Label>
              <Select value={exerciseId} onValueChange={setExerciseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a lift" />
                </SelectTrigger>
                <SelectContent>
                  {exerciseOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target 1RM (kg)</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="120"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">By (optional)</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          {existingGoal ? (
            <Button variant="ghost" onClick={remove} disabled={pending}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save goal"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
