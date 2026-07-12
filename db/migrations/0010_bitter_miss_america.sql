CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"exercise_id" uuid,
	"muscle" text,
	"target_value" real NOT NULL,
	"period" text,
	"target_date" text,
	"status" text DEFAULT 'active' NOT NULL,
	"achieved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "goals_type_fields_ck" CHECK (
        ("goals"."type" = 'strength'    and "goals"."exercise_id" is not null and "goals"."muscle" is null     and "goals"."period" is null) or
        ("goals"."type" = 'volume'      and "goals"."muscle" is not null     and "goals"."exercise_id" is null and "goals"."period" is null) or
        ("goals"."type" = 'consistency' and "goals"."period" is not null     and "goals"."exercise_id" is null and "goals"."muscle" is null) or
        ("goals"."type" = 'bodyweight'  and "goals"."exercise_id" is null     and "goals"."muscle" is null     and "goals"."period" is null)
      )
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"exercise_id" uuid NOT NULL,
	"kind" text DEFAULT 'one_rep_max' NOT NULL,
	"value" real NOT NULL,
	"reps" integer,
	"achieved_on" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goals_active_strength_idx" ON "goals" USING btree ("user_id","exercise_id") WHERE "goals"."type" = 'strength' and "goals"."status" = 'active';