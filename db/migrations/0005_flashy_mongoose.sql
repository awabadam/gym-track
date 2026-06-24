CREATE TABLE "trainer_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" text NOT NULL,
	"client_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "trainers_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trainer_clients_active_client_idx" ON "trainer_clients" USING btree ("client_id") WHERE "trainer_clients"."status" = 'active';