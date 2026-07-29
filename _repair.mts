import "dotenv/config";
import { db } from "@/db";
import { programs, programDays, programExercises, exercises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PROGRAM_EXERCISE_DATA } from "@/db/seed-program";

// Re-link the seeded template programs whose exercises were wiped during the
// catalog import. Purely additive: only touches programs with the template
// name whose days currently have ZERO exercises.
const catalog = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
const byName = new Map(catalog.map((e) => [e.name, e.id]));

const targets = await db
  .select({ id: programs.id, name: programs.name, userId: programs.userId })
  .from(programs)
  .where(eq(programs.name, "Maximal Growth — Upper/Lower 4 Days"));

let repaired = 0, skipped = 0;
for (const p of targets) {
  const days = await db
    .select({ id: programDays.id, code: programDays.dayCode })
    .from(programDays)
    .where(eq(programDays.programId, p.id));
  const dayByCode = new Map(days.map((d) => [d.code, d.id]));
  // safety: only repair if EVERY day of this program is empty
  let hasAny = false;
  for (const d of days) {
    const ex = await db.select({ id: programExercises.id }).from(programExercises).where(eq(programExercises.programDayId, d.id));
    if (ex.length > 0) { hasAny = true; break; }
  }
  if (hasAny) { skipped++; continue; }
  const rows = PROGRAM_EXERCISE_DATA
    .filter((pe) => byName.has(pe.exercise) && dayByCode.has(pe.dayCode))
    .map((pe) => ({
      programDayId: dayByCode.get(pe.dayCode)!,
      exerciseId: byName.get(pe.exercise)!,
      sets: pe.sets,
      repRangeMin: pe.min,
      repRangeMax: pe.max,
      sortOrder: pe.order,
      supersetGroup: (pe as { superset?: string }).superset ?? null,
    }));
  if (rows.length === 24) { // 4 days × 6 exercises — full template only
    await db.insert(programExercises).values(rows);
    repaired++;
    console.log(`repaired: ${p.name} (user ${p.userId ?? "TEMPLATE"}) +${rows.length} rows`);
  } else {
    console.log(`SKIP (resolved ${rows.length}/24): user ${p.userId}`);
    skipped++;
  }
}
console.log(`\nDone: repaired ${repaired}, skipped ${skipped}`);
process.exit(0);
