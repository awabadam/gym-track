import { db } from "@/db";
import { goals, personalRecords, sessionSets, sessions, exercises } from "@/db/schema";
import { and, eq, inArray, asc, desc, isNull, or } from "drizzle-orm";
import { bestEstimated1RM } from "@/lib/calculations";
import { requireUserId } from "@/lib/auth";

export interface OneRmRecord {
  id: string;
  value: number;
  achievedOn: string;
  note: string | null;
}

export interface StrengthGoal {
  id: string;
  targetValue: number;
  targetDate: string | null;
  status: string;
}

export interface TrackedLift {
  exerciseId: string;
  exerciseName: string;
  /** Current true (tested) 1RM = best of the manually logged records. */
  currentOneRm: number | null;
  /** Tested-1RM history, oldest → newest. */
  oneRmHistory: OneRmRecord[];
  /** Best estimated 1RM derived from logged sets ("trending"). */
  estimatedOneRm: number;
  goal: StrengthGoal | null;
  /** current (true, else estimated) ÷ target, as a percentage; null if no goal. */
  progressPct: number | null;
}

export interface StrengthData {
  tracked: TrackedLift[];
  exerciseOptions: { id: string; name: string }[];
}

/**
 * Everything the Strength section of /goals needs: each lift the user is
 * tracking (has a logged 1RM and/or an active goal), plus the full exercise
 * list for the "track a new lift" picker.
 */
export async function getStrengthData(): Promise<StrengthData> {
  const uid = await requireUserId();

  const [records, activeGoals, exerciseOptions] = await Promise.all([
    db
      .select({
        id: personalRecords.id,
        exerciseId: personalRecords.exerciseId,
        value: personalRecords.value,
        achievedOn: personalRecords.achievedOn,
        note: personalRecords.note,
      })
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.userId, uid),
          eq(personalRecords.kind, "one_rep_max")
        )
      )
      .orderBy(asc(personalRecords.achievedOn)),
    db
      .select({
        id: goals.id,
        exerciseId: goals.exerciseId,
        targetValue: goals.targetValue,
        targetDate: goals.targetDate,
        status: goals.status,
      })
      .from(goals)
      .where(
        and(
          eq(goals.userId, uid),
          eq(goals.type, "strength"),
          eq(goals.status, "active")
        )
      ),
    db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      // A user may track records/goals against shared (system) or their own lifts.
      .where(or(isNull(exercises.userId), eq(exercises.userId, uid)))
      .orderBy(asc(exercises.name)),
  ]);

  // Union of every lift that has a record or a goal.
  const trackedIds = new Set<string>();
  for (const r of records) trackedIds.add(r.exerciseId);
  for (const g of activeGoals) if (g.exerciseId) trackedIds.add(g.exerciseId);

  if (trackedIds.size === 0) {
    return { tracked: [], exerciseOptions };
  }

  const ids = [...trackedIds];

  // Best estimated 1RM per tracked lift, computed from completed-session sets.
  const sets = await db
    .select({
      exerciseId: sessionSets.exerciseId,
      weight: sessionSets.weight,
      reps: sessionSets.reps,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessionSets.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, uid),
        eq(sessions.status, "completed"),
        inArray(sessionSets.exerciseId, ids)
      )
    );

  const setsByExercise = new Map<string, { weight: number; reps: number }[]>();
  for (const s of sets) {
    if (!setsByExercise.has(s.exerciseId)) setsByExercise.set(s.exerciseId, []);
    setsByExercise.get(s.exerciseId)!.push({ weight: s.weight, reps: s.reps });
  }

  const nameById = new Map(exerciseOptions.map((e) => [e.id, e.name]));
  const recordsByExercise = new Map<string, OneRmRecord[]>();
  for (const r of records) {
    if (!recordsByExercise.has(r.exerciseId)) recordsByExercise.set(r.exerciseId, []);
    recordsByExercise.get(r.exerciseId)!.push({
      id: r.id,
      value: r.value,
      achievedOn: r.achievedOn,
      note: r.note,
    });
  }
  const goalByExercise = new Map(
    activeGoals.filter((g) => g.exerciseId).map((g) => [g.exerciseId as string, g])
  );

  const tracked: TrackedLift[] = ids.map((exerciseId) => {
    const history = recordsByExercise.get(exerciseId) ?? [];
    const currentOneRm = history.length
      ? Math.max(...history.map((r) => r.value))
      : null;
    const estimatedOneRm = bestEstimated1RM(setsByExercise.get(exerciseId) ?? []);
    const g = goalByExercise.get(exerciseId) ?? null;
    const goal: StrengthGoal | null = g
      ? {
          id: g.id,
          targetValue: g.targetValue,
          targetDate: g.targetDate,
          status: g.status,
        }
      : null;
    const basis = currentOneRm ?? estimatedOneRm;
    const progressPct =
      goal && goal.targetValue > 0
        ? Math.round((basis / goal.targetValue) * 100)
        : null;

    return {
      exerciseId,
      exerciseName: nameById.get(exerciseId) ?? "Unknown lift",
      currentOneRm,
      oneRmHistory: history,
      estimatedOneRm,
      goal,
      progressPct,
    };
  });

  // Lifts with a goal first, then by current 1RM (highest first).
  tracked.sort((a, b) => {
    if (!!a.goal !== !!b.goal) return a.goal ? -1 : 1;
    return (b.currentOneRm ?? 0) - (a.currentOneRm ?? 0);
  });

  return { tracked, exerciseOptions };
}

export interface AchievedGoal {
  id: string;
  exerciseName: string;
  targetValue: number;
  /** ISO date (YYYY-MM-DD) the goal was achieved. */
  achievedOn: string | null;
}

/**
 * Goals the user has hit — the trophy case shown on the Goals and Progress
 * pages. Newest first.
 */
export async function getAchievedGoals(limit = 50): Promise<AchievedGoal[]> {
  const uid = await requireUserId();
  const rows = await db
    .select({
      id: goals.id,
      targetValue: goals.targetValue,
      achievedAt: goals.achievedAt,
      exerciseName: exercises.name,
    })
    .from(goals)
    .innerJoin(exercises, eq(goals.exerciseId, exercises.id))
    .where(
      and(
        eq(goals.userId, uid),
        eq(goals.type, "strength"),
        eq(goals.status, "achieved")
      )
    )
    .orderBy(desc(goals.achievedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    exerciseName: r.exerciseName,
    targetValue: r.targetValue,
    achievedOn: r.achievedAt ? r.achievedAt.toISOString().split("T")[0] : null,
  }));
}
