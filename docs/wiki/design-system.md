# Design System

[← Wiki Home](README.md)

GymTrack uses a deliberately **brutalist** aesthetic — hard corners, heavy ink borders, offset drop shadows, monospace body type and a heavy display face, with a single high-chroma "signal" accent. The look is defined in `app/globals.css` (Tailwind v4 `@theme` + CSS variables) and applied through shared components like [`block.tsx` and `page-header.tsx`](components.md). Background on how this direction was chosen lives in [`../frontend-audit.md`](../frontend-audit.md) and the [`../design-explorations/`](../design-explorations/) mockups.

## Foundations

- **Tailwind v4**, imported with `@import "tailwindcss"`, plus `tw-animate-css` and `shadcn/tailwind.css`.
- **Dark variant** via `@custom-variant dark (&:is(.dark *))`. A pre-paint script in `app/layout.tsx` sets the `dark` class from `localStorage` (falling back to `prefers-color-scheme`) to avoid a flash. Toggled by [`theme-toggle.tsx`](components.md).
- Tokens are declared as CSS variables under `:root` (light / "Paper") and `.dark` (dark / "Ink"), then surfaced to Tailwind in `@theme inline`.

## Type

| Token | Font | Use |
|-------|------|-----|
| `--font-display` / `--font-heading` | **Archivo Black** | Headings, big numbers, day codes |
| `--font-sans` / `--font-mono` | **Space Mono** | Body and numerals (yes — the body font is mono, on purpose) |

Loaded via `next/font/google` in `app/layout.tsx` as `--font-archivo-black` and `--font-space-mono`.

## Color

Colors are **OKLCH**. The system is near-monochrome (paper/ink) with one accent:

- **`--signal`** — a high-chroma chartreuse/green (`oklch(0.9 0.22 124)` light, `0.88 0.21 124` dark) used for active/primary/"live" emphasis. `--signal-foreground` is near-black ink.
- **Light ("Paper")**: off-white background, near-black foreground, dark borders.
- **Dark ("Ink")**: dark grey background, light foreground, light-grey borders.
- `--destructive` is the usual red; charts map `--chart-1` to signal and the rest to greys.

## Signature treatments

- **Zero radius everywhere** — every `--radius-*` token is `0px`. Hard corners are the whole point.
- **Offset shadow** — `--shadow-color` drives the brutalist drop shadow, e.g. `shadow-[4px_4px_0_0_var(--shadow-color)]` (a global rule forces it on relevant elements). Gives the stacked-paper / sticker look.
- **Heavy borders** — `border-2 border-foreground` on cards/blocks; the app shell itself has `md:border-x-2`.
- **Signal hover states** — interactive rows flip to `bg-signal` / `text-signal-foreground` on hover.
- **`.reveal`** — a staggered block-reveal entrance animation (defined in `globals.css`) applied to dashboard sections.

## Working with it

- Reach for the [`Block`](components.md) component for carded sections and [`PageHeader`](components.md) for page tops rather than re-deriving the border/shadow/eyebrow pattern.
- Use semantic tokens (`bg-card`, `text-muted-foreground`, `bg-signal`) — they're already wired for both themes. Avoid hard-coded colors.
- Keep corners square and prefer the mono/display fonts already mapped to the Tailwind font utilities.
