ALTER TABLE "exercises" ADD COLUMN "primary_muscle" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "secondary_muscles" text[];--> statement-breakpoint

-- Backfill: derive a fine primary muscle from the legacy coarse muscle_group
-- for every existing exercise (covers user-custom exercises too).
UPDATE "exercises" SET "primary_muscle" = CASE "muscle_group"
  WHEN 'chest' THEN 'chest'
  WHEN 'back' THEN 'upper-back'
  WHEN 'shoulders' THEN 'front-deltoids'
  WHEN 'biceps' THEN 'biceps'
  WHEN 'triceps' THEN 'triceps'
  WHEN 'quads' THEN 'quadriceps'
  WHEN 'hamstrings' THEN 'hamstring'
  WHEN 'glutes' THEN 'gluteal'
  WHEN 'calves' THEN 'calves'
  WHEN 'core' THEN 'abs'
  ELSE "primary_muscle"
END
WHERE "primary_muscle" IS NULL;--> statement-breakpoint

-- Richer backfill for the built-in (system) catalog: accurate primary +
-- supporting muscles per movement. Scoped to seed rows (user_id IS NULL).
UPDATE "exercises" SET "primary_muscle" = 'chest', "secondary_muscles" = ARRAY['front-deltoids','triceps'] WHERE "name" = 'Bench Press' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'upper-back', "secondary_muscles" = ARRAY['biceps','back-deltoids','trapezius'] WHERE "name" = 'Barbell Row' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'front-deltoids', "secondary_muscles" = ARRAY['triceps','trapezius'] WHERE "name" = 'Overhead Press' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'front-deltoids', "secondary_muscles" = ARRAY[]::text[] WHERE "name" = 'Lateral Raise' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'triceps', "secondary_muscles" = ARRAY[]::text[] WHERE "name" = 'Triceps Pushdown' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'biceps', "secondary_muscles" = ARRAY['forearm'] WHERE "name" = 'Incline Curl' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'quadriceps', "secondary_muscles" = ARRAY['gluteal','hamstring','lower-back','adductor'] WHERE "name" = 'Squat' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'quadriceps', "secondary_muscles" = ARRAY['gluteal','hamstring'] WHERE "name" = 'Leg Press' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'hamstring', "secondary_muscles" = ARRAY['gluteal','lower-back'] WHERE "name" = 'Romanian Deadlift' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'hamstring', "secondary_muscles" = ARRAY['calves'] WHERE "name" = 'Lying Leg Curl' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'calves', "secondary_muscles" = ARRAY[]::text[] WHERE "name" = 'Calf Raise' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'abs', "secondary_muscles" = ARRAY['obliques','forearm'] WHERE "name" = 'Hanging Leg Raise' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'chest', "secondary_muscles" = ARRAY['front-deltoids','triceps'] WHERE "name" = 'Incline Dumbbell Press' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'upper-back', "secondary_muscles" = ARRAY['biceps','back-deltoids'] WHERE "name" = 'Lat Pulldown' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'upper-back', "secondary_muscles" = ARRAY['biceps','back-deltoids','trapezius'] WHERE "name" = 'Seated Cable Row' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'front-deltoids', "secondary_muscles" = ARRAY['triceps'] WHERE "name" = 'DB Shoulder Press' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'back-deltoids', "secondary_muscles" = ARRAY['trapezius','upper-back'] WHERE "name" = 'Face Pull' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'biceps', "secondary_muscles" = ARRAY['forearm'] WHERE "name" = 'Hammer Curl' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'hamstring', "secondary_muscles" = ARRAY['gluteal','lower-back','upper-back','trapezius','forearm'] WHERE "name" = 'Deadlift' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'quadriceps', "secondary_muscles" = ARRAY['gluteal','abs','upper-back'] WHERE "name" = 'Front Squat' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'quadriceps', "secondary_muscles" = ARRAY['gluteal','hamstring','adductor'] WHERE "name" = 'Bulgarian Split Squat' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'gluteal', "secondary_muscles" = ARRAY['hamstring'] WHERE "name" = 'Hip Thrust' AND "user_id" IS NULL;--> statement-breakpoint
UPDATE "exercises" SET "primary_muscle" = 'hamstring', "secondary_muscles" = ARRAY['calves'] WHERE "name" = 'Seated Leg Curl' AND "user_id" IS NULL;
