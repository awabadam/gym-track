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

  // muscleGroup is the legacy coarse bucket (kept in sync with primaryMuscle);
  // primaryMuscle + secondaryMuscles drive the fine-grained body diagram.
  const exerciseData = [
    { name: "Bench Press", muscleGroup: "chest", primaryMuscle: "chest", secondaryMuscles: ["front-deltoids", "triceps"], type: "main", notes: "Chest. AMRAP-ish last set." },
    { name: "Barbell Row", muscleGroup: "back", primaryMuscle: "upper-back", secondaryMuscles: ["biceps", "back-deltoids", "trapezius"], type: "main", notes: "Back. Flat back, pull to belly." },
    { name: "Overhead Press", muscleGroup: "shoulders", primaryMuscle: "front-deltoids", secondaryMuscles: ["triceps", "trapezius"], type: "compound", notes: "Shoulders + triceps." },
    { name: "Lateral Raise", muscleGroup: "shoulders", primaryMuscle: "front-deltoids", secondaryMuscles: [], type: "iso", notes: "Side delts. Light, high reps." },
    { name: "Triceps Pushdown", muscleGroup: "triceps", primaryMuscle: "triceps", secondaryMuscles: [], type: "iso", notes: "SS with Lateral Raise to save time." },
    { name: "Incline Curl", muscleGroup: "biceps", primaryMuscle: "biceps", secondaryMuscles: ["forearm"], type: "iso", notes: "Biceps." },
    { name: "Squat", muscleGroup: "quads", primaryMuscle: "quadriceps", secondaryMuscles: ["gluteal", "hamstring", "lower-back", "adductor"], type: "main", notes: "Quads. To parallel." },
    { name: "Leg Press", muscleGroup: "quads", primaryMuscle: "quadriceps", secondaryMuscles: ["gluteal", "hamstring"], type: "compound", notes: "More quad volume, low back rests." },
    { name: "Romanian Deadlift", muscleGroup: "hamstrings", primaryMuscle: "hamstring", secondaryMuscles: ["gluteal", "lower-back"], type: "compound", notes: "Hamstrings + glutes." },
    { name: "Lying Leg Curl", muscleGroup: "hamstrings", primaryMuscle: "hamstring", secondaryMuscles: ["calves"], type: "iso", notes: "Hamstrings (knee flexion)." },
    { name: "Calf Raise", muscleGroup: "calves", primaryMuscle: "calves", secondaryMuscles: [], type: "iso", notes: "Calves." },
    { name: "Hanging Leg Raise", muscleGroup: "core", primaryMuscle: "abs", secondaryMuscles: ["obliques", "forearm"], type: "core", notes: "Abs + decompress after squats." },
    { name: "Incline Dumbbell Press", muscleGroup: "chest", primaryMuscle: "chest", secondaryMuscles: ["front-deltoids", "triceps"], type: "main", notes: "Upper chest." },
    { name: "Lat Pulldown", muscleGroup: "back", primaryMuscle: "upper-back", secondaryMuscles: ["biceps", "back-deltoids"], type: "main", notes: "Back width (or Pull-ups)." },
    { name: "Seated Cable Row", muscleGroup: "back", primaryMuscle: "upper-back", secondaryMuscles: ["biceps", "back-deltoids", "trapezius"], type: "compound", notes: "Mid-back thickness." },
    { name: "DB Shoulder Press", muscleGroup: "shoulders", primaryMuscle: "front-deltoids", secondaryMuscles: ["triceps"], type: "compound", notes: "Shoulders." },
    { name: "Face Pull", muscleGroup: "shoulders", primaryMuscle: "back-deltoids", secondaryMuscles: ["trapezius", "upper-back"], type: "iso", notes: "Rear delts + posture." },
    { name: "Hammer Curl", muscleGroup: "biceps", primaryMuscle: "biceps", secondaryMuscles: ["forearm"], type: "iso", notes: "Biceps + forearm." },
    { name: "Deadlift", muscleGroup: "hamstrings", primaryMuscle: "hamstring", secondaryMuscles: ["gluteal", "lower-back", "upper-back", "trapezius", "forearm"], type: "main", notes: "Posterior chain. Only 3 sets (CNS-heavy)." },
    { name: "Front Squat", muscleGroup: "quads", primaryMuscle: "quadriceps", secondaryMuscles: ["gluteal", "abs", "upper-back"], type: "compound", notes: "Quad-focused (or Hack Squat)." },
    { name: "Bulgarian Split Squat", muscleGroup: "quads", primaryMuscle: "quadriceps", secondaryMuscles: ["gluteal", "hamstring", "adductor"], type: "compound", notes: "Per leg. Quads + glutes + balance." },
    { name: "Hip Thrust", muscleGroup: "glutes", primaryMuscle: "gluteal", secondaryMuscles: ["hamstring"], type: "compound", notes: "Glutes at peak contraction." },
    { name: "Seated Leg Curl", muscleGroup: "hamstrings", primaryMuscle: "hamstring", secondaryMuscles: ["calves"], type: "iso", notes: "Hamstrings." },
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
