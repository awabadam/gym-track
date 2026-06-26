/**
 * Fine-grained muscle taxonomy. Each slug maps 1:1 to a region the body
 * diagram (react-body-highlighter) can highlight, so an exercise's primary +
 * secondary muscles render exactly where they're worked.
 *
 * `coarse` is the legacy 10-group bucket (lib/validation MUSCLE_GROUPS) that the
 * rest of the app still uses for progression (isUpperBody) and progress
 * grouping — we derive it from an exercise's primary muscle on write.
 */
export const MUSCLES = [
  // Upper — push
  { slug: "chest", label: "Chest", region: "upper", coarse: "chest" },
  { slug: "front-deltoids", label: "Front delts", region: "upper", coarse: "shoulders" },
  { slug: "back-deltoids", label: "Rear delts", region: "upper", coarse: "shoulders" },
  { slug: "triceps", label: "Triceps", region: "upper", coarse: "triceps" },
  // Upper — pull
  { slug: "upper-back", label: "Upper back / lats", region: "upper", coarse: "back" },
  { slug: "lower-back", label: "Lower back", region: "upper", coarse: "back" },
  { slug: "trapezius", label: "Traps", region: "upper", coarse: "back" },
  { slug: "biceps", label: "Biceps", region: "upper", coarse: "biceps" },
  { slug: "forearm", label: "Forearms", region: "upper", coarse: "biceps" },
  // Core
  { slug: "abs", label: "Abs", region: "core", coarse: "core" },
  { slug: "obliques", label: "Obliques", region: "core", coarse: "core" },
  // Lower
  { slug: "quadriceps", label: "Quads", region: "lower", coarse: "quads" },
  { slug: "hamstring", label: "Hamstrings", region: "lower", coarse: "hamstrings" },
  { slug: "gluteal", label: "Glutes", region: "lower", coarse: "glutes" },
  { slug: "adductor", label: "Adductors", region: "lower", coarse: "quads" },
  { slug: "calves", label: "Calves", region: "lower", coarse: "calves" },
] as const;

export type MuscleSlug = (typeof MUSCLES)[number]["slug"];

export const MUSCLE_SLUGS = MUSCLES.map((m) => m.slug) as [
  MuscleSlug,
  ...MuscleSlug[],
];

const BY_SLUG = new Map(MUSCLES.map((m) => [m.slug, m]));

export function isMuscleSlug(value: string | null | undefined): value is MuscleSlug {
  return !!value && BY_SLUG.has(value as MuscleSlug);
}

/** Human label for a slug (falls back to the raw slug). */
export function muscleLabel(slug: string): string {
  return BY_SLUG.get(slug as MuscleSlug)?.label ?? slug;
}

/** Derive the legacy coarse 10-group bucket from a fine primary muscle. */
export function fineToCoarse(slug: string | null | undefined): string | null {
  return BY_SLUG.get(slug as MuscleSlug)?.coarse ?? null;
}

/** A representative fine muscle for a legacy coarse group (backfill direction). */
const COARSE_TO_FINE: Record<string, MuscleSlug> = {
  chest: "chest",
  back: "upper-back",
  shoulders: "front-deltoids",
  biceps: "biceps",
  triceps: "triceps",
  quads: "quadriceps",
  hamstrings: "hamstring",
  glutes: "gluteal",
  calves: "calves",
  core: "abs",
};

export function coarseToFine(group: string | null | undefined): MuscleSlug | null {
  return group ? (COARSE_TO_FINE[group] ?? null) : null;
}

/** Muscles grouped by body region, for grouped <select>/checkbox UIs. */
export const MUSCLES_BY_REGION = (["upper", "core", "lower"] as const).map(
  (region) => ({
    region,
    label: region[0].toUpperCase() + region.slice(1) + " body",
    muscles: MUSCLES.filter((m) => m.region === region),
  }),
);
