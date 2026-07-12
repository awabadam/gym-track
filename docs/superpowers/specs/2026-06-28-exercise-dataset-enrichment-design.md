# Exercise Dataset Enrichment — Plan

**Date:** 2026-06-28
**Status:** SHIPPED (metadata-only import). Catalog grown from 23 curated to
**1311 system exercises**.

## What we built (final approach)

Rather than import images/GIFs (the licensing minefield), we import **only
non-copyrightable facts** from
[`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset):
the **exercise name** and **which muscles it works**. The how-to instructions,
images, and GIFs are NOT imported. In the app, "how to perform" is a **Google
search link** derived from the exercise name.

This sidesteps the dataset's non-commercial license entirely: facts (names,
muscle targeting) aren't protected; only the prose/media would be, and we take
neither.

### Decision log
- **2026-06-28 (a):** Considered `free-exercise-db` (public domain) to get
  product-safe media — but it's static JPGs, not GIFs.
- **2026-06-28 (b):** Pivoted away from media altogether. Import **name +
  muscles only** from `hasaneyldrm`; derive a Google link for how-to. No images,
  no stored instructions → no licensing exposure, no media hosting, **zero
  schema changes**.

## Source shape (`hasaneyldrm/exercises-dataset`, `data/exercises.json`)

1324 records. Fields used: `name`, `target` (primary muscle),
`secondary_muscles[]`. Ignored: `instructions`, `image`, `gif_url`, `equipment`,
`category`, etc.

## Schema changes

**None.** The existing `exercises` table already has `name`, `muscleGroup`,
`primaryMuscle`, `secondaryMuscles`. Imported rows are **system** exercises
(`userId` null), exactly like the seeded catalog.

## Import pipeline (`db/import-exercises.ts`, `npm run db:import-exercises`)

1. Fetch the source JSON from GitHub raw.
2. Map their muscle vocab → our fine slugs (`lib/muscles`) via `MUSCLE_MAP`;
   derive coarse `muscleGroup` with `fineToCoarse`. Unmapped terms are dropped
   and reported.
3. Skip records with no mappable primary muscle (29 cardio rows — our body map
   and progression are muscle-based, so a muscle-less row has no home).
4. Title-case names; dedup within the dataset and against the existing catalog
   by **normalized (lowercased) name**, so curated rows like "Bench Press" are
   never duplicated.
5. Insert in 200-row chunks. Idempotent: re-runs are a no-op.
6. `IMPORT_RESET=1` deletes prior imported system rows (curated + per-user rows
   preserved) so an improved mapping re-applies cleanly.

### Muscle mapping notes
Their `target`/`secondary_muscles` vocab maps onto our 16 fine slugs. A few
terms with no anatomical slug are intentionally dropped (and logged): ankles,
feet, hands, wrists, shins, hip flexors, sternocleidomastoid.

## UI changes

- **Exercise detail page** (`app/(app)/exercises/[id]`): a "↗ How to perform"
  link → `google.com/search?q=how to perform <name> exercise` (new tab). No new
  column — derived from the name at render.

## Results (verified 2026-06-28)

- 1288 imported + 23 curated = **1311 system exercises**, all with a primary
  muscle, spread across all 10 coarse groups.
- Detail page renders muscle badges + the body diagram + the Google link;
  muscle-group filter works on imported rows.

## Not done (deliberately)

Images/GIFs, stored instructions, equipment field, `force`/`level`/`mechanic`
metadata. Revisit only if in-app demos become a requirement — that reopens the
media-licensing question (free-exercise-db for public-domain stills, or a
licensed ExerciseDB plan for true GIFs).
