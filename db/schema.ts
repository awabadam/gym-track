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
    // When set, this program is authored by `userId` (the trainer) and ASSIGNED
    // to this client. The client may follow/log it but not edit it; the trainer
    // keeps editing it and changes propagate live. NULL = a normal program.
    assignedClientId: text("assigned_client_id"),
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

export const trainerApplications = pgTable(
  "trainer_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Better Auth user id of the applicant.
    userId: text("user_id").notNull(),
    // 'pending' | 'approved' | 'declined'
    status: text("status").notNull().default("pending"),
    // Optional message from the applicant.
    note: text("note"),
    // Admin id who reviewed it, set on approve/decline.
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    // A user can have at most one open (pending) application at a time, but may
    // re-apply after a decline — so the uniqueness is partial on status.
    uniqueIndex("trainer_applications_pending_user_idx")
      .on(t.userId)
      .where(sql`${t.status} = 'pending'`),
  ]
);

export const trainers = pgTable("trainers", {
  // The trainer's Better Auth user id. One row per trainer; holds the invite
  // code plus any future trainer-specific data.
  userId: text("user_id").primaryKey(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainerClients = pgTable(
  "trainer_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The trainer's Better Auth user id (matches trainers.userId).
    trainerId: text("trainer_id").notNull(),
    // The coached user's Better Auth user id.
    clientId: text("client_id").notNull(),
    // 'active' | 'ended'. Links are kept as history; switching coaches ends the
    // old link and opens a new one.
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),
  },
  (t) => [
    // A client can have at most one ACTIVE trainer at a time — enforced by a
    // partial unique index on clientId (ended links don't count).
    uniqueIndex("trainer_clients_active_client_idx")
      .on(t.clientId)
      .where(sql`${t.status} = 'active'`),
  ]
);

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

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Recipient (Better Auth user id).
  userId: text("user_id").notNull(),
  // Event kind, e.g. 'coach_note' | 'program_assigned' | 'client_joined' |
  // 'client_left' | 'workout_logged'.
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  // Optional in-app destination for the notification (e.g. /coach).
  linkPath: text("link_path"),
  // NULL until the recipient has seen it.
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coachNotes = pgTable("coach_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Author (trainer) and subject (client) — both Better Auth user ids.
  trainerId: text("trainer_id").notNull(),
  clientId: text("client_id").notNull(),
  // Optional: a note left on a specific logged workout for context. NULL = a
  // general note about the client. Set null (not cascade) so deleting a session
  // keeps the coaching note as history.
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
