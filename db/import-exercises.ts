import "dotenv/config";
import { and, isNull, notInArray } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises } from "./schema";
import { fineToCoarse, isMuscleSlug, type MuscleSlug } from "../lib/muscles";

// The hand-curated seed catalog (db/seed.ts). With IMPORT_RESET=1 we delete
// every other system exercise (userId IS NULL) before re-importing, so an
// improved muscle mapping actually re-applies instead of being skipped by the
// name-dedup. Curated rows are never touched.
const CURATED_NAMES = [
  "Bench Press", "Barbell Row", "Overhead Press", "Lateral Raise",
  "Triceps Pushdown", "Incline Curl", "Squat", "Leg Press",
  "Romanian Deadlift", "Lying Leg Curl", "Calf Raise", "Hanging Leg Raise",
  "Incline Dumbbell Press", "Lat Pulldown", "Seated Cable Row",
  "DB Shoulder Press", "Face Pull", "Hammer Curl", "Deadlift", "Front Squat",
  "Bulgarian Split Squat", "Hip Thrust", "Seated Leg Curl",
];

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const SOURCE_URL =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";

// We deliberately import ONLY non-copyrightable facts from this dataset: the
// exercise name and which muscles it works. The how-to prose (instructions.en)
// and the images/GIFs are NOT imported — in the app the "how to perform" comes
// from a Google search link derived from the name. So nothing here is
// third-party protected content.

type SourceExercise = {
  name: string;
  target?: string | null; // primary muscle (their vocab)
  secondary_muscles?: string[] | null; // their vocab
};

// Their muscle vocabulary (`target` + `secondary_muscles`) → our fine slugs
// (lib/muscles). Anything not listed is dropped and reported. "cardiovascular
// system" maps to nothing on purpose — those records are skipped as cardio.
const MUSCLE_MAP: Record<string, MuscleSlug> = {
  // chest
  pectorals: "chest",
  chest: "chest",
  "upper chest": "chest",
  // shoulders
  delts: "front-deltoids",
  deltoids: "front-deltoids",
  shoulders: "front-deltoids",
  "rear deltoids": "back-deltoids",
  "rotator cuff": "back-deltoids",
  // back
  back: "upper-back",
  lats: "upper-back",
  "latissimus dorsi": "upper-back",
  "upper back": "upper-back",
  rhomboids: "upper-back",
  spine: "lower-back",
  "lower back": "lower-back",
  traps: "trapezius",
  trapezius: "trapezius",
  "levator scapulae": "trapezius",
  // arms
  biceps: "biceps",
  brachialis: "biceps",
  triceps: "triceps",
  forearms: "forearm",
  "grip muscles": "forearm",
  "wrist extensors": "forearm",
  "wrist flexors": "forearm",
  // core
  abs: "abs",
  abdominals: "abs",
  "lower abs": "abs",
  core: "abs",
  "serratus anterior": "abs",
  obliques: "obliques",
  // legs
  quads: "quadriceps",
  quadriceps: "quadriceps",
  hamstrings: "hamstring",
  glutes: "gluteal",
  abductors: "gluteal",
  adductors: "adductor",
  "inner thighs": "adductor",
  groin: "adductor",
  calves: "calves",
  soleus: "calves",
};

const norm = (s: string) => s.trim().toLowerCase();

// Title-case for display, preserving separators like "/" and "-".
const titleCase = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function mapMuscle(raw: string | null | undefined, unmapped: Set<string>) {
  if (!raw) return null;
  const key = norm(raw);
  const slug = MUSCLE_MAP[key];
  if (slug && isMuscleSlug(slug)) return slug;
  if (key !== "cardiovascular system") unmapped.add(key);
  return null;
}

async function importExercises() {
  console.log(`Fetching ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const raw: SourceExercise[] = await res.json();
  console.log(`Source records: ${raw.length}`);

  const unmapped = new Set<string>();
  let skippedCardio = 0;

  // Build candidate rows, deduped within the dataset by normalized name.
  const byName = new Map<
    string,
    {
      name: string;
      muscleGroup: string | null;
      primaryMuscle: MuscleSlug;
      secondaryMuscles: MuscleSlug[];
    }
  >();

  for (const ex of raw) {
    if (!ex.name) continue;
    const primary = mapMuscle(ex.target, unmapped);
    if (!primary) {
      // No mappable primary muscle → cardio or unknown; skip (our body map and
      // progression are muscle-based, so a muscle-less row has no home).
      skippedCardio++;
      continue;
    }
    const secondary = [
      ...new Set(
        (ex.secondary_muscles ?? [])
          .map((m) => mapMuscle(m, unmapped))
          .filter((m): m is MuscleSlug => !!m && m !== primary),
      ),
    ];
    const key = norm(ex.name);
    if (byName.has(key)) continue; // first occurrence wins
    byName.set(key, {
      name: titleCase(ex.name),
      muscleGroup: fineToCoarse(primary),
      primaryMuscle: primary,
      secondaryMuscles: secondary,
    });
  }

  // Optional clean slate: drop previously-imported system rows so an improved
  // mapping re-applies. Custom (per-user) and curated rows are preserved.
  if (process.env.IMPORT_RESET === "1") {
    const deleted = await db
      .delete(exercises)
      .where(and(isNull(exercises.userId), notInArray(exercises.name, CURATED_NAMES)))
      .returning({ id: exercises.id });
    console.log(`IMPORT_RESET: deleted ${deleted.length} prior system rows`);
  }

  // Dedup against what's already in the catalog (curated rows + prior imports),
  // matched case-insensitively so "Bench Press" and "bench press" don't double.
  const existing = await db.select({ name: exercises.name }).from(exercises);
  const existingKeys = new Set(existing.map((e) => norm(e.name)));

  const toInsert = [...byName.entries()]
    .filter(([key]) => !existingKeys.has(key))
    .map(([, row]) => ({ ...row, type: null, userId: null }));

  // Insert in chunks to stay well under any statement-size limits.
  const CHUNK = 200;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    await db.insert(exercises).values(toInsert.slice(i, i + CHUNK));
  }

  console.log(
    `\nImport complete:\n` +
      `  candidates (deduped):     ${byName.size}\n` +
      `  already in catalog:       ${byName.size - toInsert.length}\n` +
      `  inserted:                 ${toInsert.length}\n` +
      `  skipped (cardio/no muscle): ${skippedCardio}`,
  );
  if (unmapped.size > 0) {
    console.log(
      `\nUnmapped muscle terms (dropped) — review if any matter:\n  ` +
        [...unmapped].sort().join(", "),
    );
  }
}

importExercises().catch((err) => {
  console.error(err);
  process.exit(1);
});
