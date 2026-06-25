import { z } from "zod";

/**
 * Validation schemas for every server action input, plus small helpers to run
 * them. Actions call `parseForm(schema, formData)` (for `<form>` submissions)
 * or `parse(schema, { ...args })` (for actions invoked with typed arguments).
 * On invalid input a clean `Error` is thrown with a user-readable message.
 */

// Allowed enum values — kept in sync with the option lists in the exercise and
// program-day forms. `muscleGroup` also drives upper/lower body progression.
export const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "quads", "hamstrings", "glutes", "calves", "core",
] as const;
export const EXERCISE_TYPES = ["main", "compound", "iso", "core"] as const;
export const WEEKDAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

// --- field building blocks ----------------------------------------------------

const name = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(200, `${label} is too long`);

/** Optional free text: missing / empty → null, otherwise trimmed and bounded. */
const optionalText = (max = 1000) =>
  z.string().trim().max(max, "Too long").optional().transform((v) => (v ? v : null));

/** Optional value from a <select>: missing / empty → null, else must be in `values`. */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? (v as T[number]) : null));

const uuid = (label: string) => z.uuid(`Invalid ${label}`);

/** Standalone UUID schema for validating an id argument before it hits the DB. */
export const idSchema = uuid("id");
const setCount = z.coerce.number("Sets must be a number").int().min(1, "Need at least 1 set").max(100);
const repBound = z.coerce.number("Reps must be a number").int().min(1, "Reps must be at least 1").max(1000);

// --- exercises ----------------------------------------------------------------

export const exerciseSchema = z.object({
  name: name("Exercise name"),
  muscleGroup: optionalEnum(MUSCLE_GROUPS),
  type: optionalEnum(EXERCISE_TYPES),
  notes: optionalText(),
});

// --- programs -----------------------------------------------------------------

// Invalid/missing RIR falls back to 2 (mirrors the historical default).
const targetRir = z.coerce.number().int().min(0).max(5).catch(2);

export const programSchema = z.object({
  name: name("Program name"),
  description: optionalText(),
  targetRir,
});

export const programDaySchema = z.object({
  name: name("Day name"),
  dayCode: z.string().trim().min(1, "Day code is required").max(20),
  scheduledDay: optionalEnum(WEEKDAYS),
});

export const programExerciseSchema = z
  .object({
    exerciseId: uuid("exercise"),
    sets: setCount,
    repRangeMin: repBound,
    repRangeMax: repBound,
    notes: optionalText(),
    supersetGroup: optionalText(20),
  })
  .refine((v) => v.repRangeMax >= v.repRangeMin, {
    message: "Max reps must be ≥ min reps",
    path: ["repRangeMax"],
  });

// Update reuses the same fields but without exerciseId (it isn't editable).
export const programExerciseUpdateSchema = z
  .object({
    sets: setCount,
    repRangeMin: repBound,
    repRangeMax: repBound,
    notes: optionalText(),
    supersetGroup: optionalText(20),
  })
  .refine((v) => v.repRangeMax >= v.repRangeMin, {
    message: "Max reps must be ≥ min reps",
    path: ["repRangeMax"],
  });

// A single weekday, e.g. for the week-grid builder (add/assign a training day).
export const weekdaySchema = z.object({
  weekday: z.enum(WEEKDAYS),
});

// A bounded, non-empty name only — used to inline-rename a program day.
export const dayNameSchema = z.object({
  name: name("Day name"),
});

// --- sessions / sets ----------------------------------------------------------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");

export const startPastSessionSchema = z.object({
  programDayId: uuid("workout day"),
  date: isoDate,
});

// Logged set values (these actions take typed args, not FormData).
export const setValuesSchema = z.object({
  weight: z.number("Weight must be a number").min(0, "Weight can't be negative").max(10000),
  reps: z.number("Reps must be a number").int().min(0).max(1000),
  rir: z.number().int().min(0).max(50).nullable(),
});

// --- admin / user management --------------------------------------------------

// The roles the admin UI can assign. Mirrors the admin plugin config in
// lib/auth.ts (defaultRole "user", adminRoles ["admin"]).
export const USER_ROLES = ["user", "trainer", "admin"] as const;

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const createUserSchema = z.object({
  name: name("Name"),
  email: z.email("Enter a valid email"),
  password,
  role: z.enum(USER_ROLES),
});

export const setRoleSchema = z.object({ role: z.enum(USER_ROLES) });

// --- trainer applications -----------------------------------------------------

export const trainerApplicationSchema = z.object({
  note: optionalText(500),
});

export const setPasswordSchema = z.object({ newPassword: password });

export const banUserSchema = z.object({
  reason: optionalText(500),
  // 0 / empty → permanent ban (no expiry).
  expiresInDays: z.coerce.number().int().min(0).max(3650).catch(0),
});

// --- runners ------------------------------------------------------------------

function fail(error: z.ZodError): never {
  const issue = error.issues[0];
  const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
  throw new Error(`${field}${issue.message}`);
}

/** Validate an arbitrary value (for actions called with typed arguments). */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) fail(result.error);
  return result.data;
}

/** Validate a form submission. */
export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): z.infer<S> {
  return parse(schema, Object.fromEntries(formData));
}
