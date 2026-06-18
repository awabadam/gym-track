import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Seeds the shared exercise catalog. Programs are now per-user and are created
// on first sign-in (see lib/onboarding.ts + db/seed-program.ts).
async function seed() {
  console.log("Seeding exercise catalog...");

  const exerciseData = [
    { name: "Bench Press", muscleGroup: "chest", type: "main", notes: "Chest. AMRAP-ish last set." },
    { name: "Barbell Row", muscleGroup: "back", type: "main", notes: "Back. Flat back, pull to belly." },
    { name: "Overhead Press", muscleGroup: "shoulders", type: "compound", notes: "Shoulders + triceps." },
    { name: "Lateral Raise", muscleGroup: "shoulders", type: "iso", notes: "Side delts. Light, high reps." },
    { name: "Triceps Pushdown", muscleGroup: "triceps", type: "iso", notes: "SS with Lateral Raise to save time." },
    { name: "Incline Curl", muscleGroup: "biceps", type: "iso", notes: "Biceps." },
    { name: "Squat", muscleGroup: "quads", type: "main", notes: "Quads. To parallel." },
    { name: "Leg Press", muscleGroup: "quads", type: "compound", notes: "More quad volume, low back rests." },
    { name: "Romanian Deadlift", muscleGroup: "hamstrings", type: "compound", notes: "Hamstrings + glutes." },
    { name: "Lying Leg Curl", muscleGroup: "hamstrings", type: "iso", notes: "Hamstrings (knee flexion)." },
    { name: "Calf Raise", muscleGroup: "calves", type: "iso", notes: "Calves." },
    { name: "Hanging Leg Raise", muscleGroup: "core", type: "core", notes: "Abs + decompress after squats." },
    { name: "Incline Dumbbell Press", muscleGroup: "chest", type: "main", notes: "Upper chest." },
    { name: "Lat Pulldown", muscleGroup: "back", type: "main", notes: "Back width (or Pull-ups)." },
    { name: "Seated Cable Row", muscleGroup: "back", type: "compound", notes: "Mid-back thickness." },
    { name: "DB Shoulder Press", muscleGroup: "shoulders", type: "compound", notes: "Shoulders." },
    { name: "Face Pull", muscleGroup: "shoulders", type: "iso", notes: "Rear delts + posture." },
    { name: "Hammer Curl", muscleGroup: "biceps", type: "iso", notes: "Biceps + forearm." },
    { name: "Deadlift", muscleGroup: "hamstrings", type: "main", notes: "Posterior chain. Only 3 sets (CNS-heavy)." },
    { name: "Front Squat", muscleGroup: "quads", type: "compound", notes: "Quad-focused (or Hack Squat)." },
    { name: "Bulgarian Split Squat", muscleGroup: "quads", type: "compound", notes: "Per leg. Quads + glutes + balance." },
    { name: "Hip Thrust", muscleGroup: "glutes", type: "compound", notes: "Glutes at peak contraction." },
    { name: "Seated Leg Curl", muscleGroup: "hamstrings", type: "iso", notes: "Hamstrings." },
  ];

  // Idempotent: only insert catalog entries that don't already exist (matched
  // by name). Safe to run on every deploy without duplicating exercises.
  const existing = await db.select({ name: exercises.name }).from(exercises);
  const existingNames = new Set(existing.map((e) => e.name));
  const toInsert = exerciseData.filter((e) => !existingNames.has(e.name));

  if (toInsert.length > 0) {
    await db.insert(exercises).values(toInsert);
  }

  console.log(
    `Catalog: ${toInsert.length} added, ${existingNames.size} already present`
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
