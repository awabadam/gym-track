import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, timestamp, boolean, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Owner of a custom exercise. NULL = a shared "system" exercise from the
  // seeded catalog: visible to everyone and editable/deletable by no one.
  // A non-NULL userId is a user's private exercise — only they see and manage it.
  userId: text("user_id"),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group"),
  type: text("type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Owner of the program. NULL = a shared "recommended" program template,
    // managed by admins and surfaced to all users (parallel to exercises.userId).
    // A non-NULL userId is a user's private program.
    userId: text("user_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(false),
    targetRir: integer("target_rir").notNull().default(2),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    // Slugs are unique per user, not globally — two users can each have a
    // "push-pull-legs" program without colliding.
    uniqueIndex("programs_user_slug_idx").on(t.userId, t.slug),
    // Recommended templates (userId IS NULL) must have globally unique slugs so
    // /admin/programs routing by slug is unambiguous.
    uniqueIndex("programs_template_slug_idx")
      .on(t.slug)
      .where(sql`${t.userId} is null`),
  ]
);

export const programDays = pgTable("program_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dayCode: text("day_code").notNull(),
  scheduledDay: text("scheduled_day"),
  sortOrder: integer("sort_order").notNull(),
});

export const programExercises = pgTable("program_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  programDayId: uuid("program_day_id")
    .notNull()
    .references(() => programDays.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id),
  sets: integer("sets").notNull(),
  repRangeMin: integer("rep_range_min").notNull(),
  repRangeMax: integer("rep_range_max").notNull(),
  sortOrder: integer("sort_order").notNull(),
  notes: text("notes"),
  supersetGroup: text("superset_group"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Clerk user id of the owner. Sessions (and their sets) are private per user.
  userId: text("user_id").notNull(),
  programDayId: uuid("program_day_id")
    .notNull()
    .references(() => programDays.id),
  date: text("date").notNull(),
  status: text("status").notNull().default("in_progress"),
  notes: text("notes"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const sessionSets = pgTable("session_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id),
  setNumber: integer("set_number").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  rir: integer("rir"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
