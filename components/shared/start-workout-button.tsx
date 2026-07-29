"use client";

import { useTransition } from "react";
import { startSession } from "@/app/actions/sessions";
import { Play } from "lucide-react";

/**
 * Hero "Start Workout" button for today's scheduled day. `startSession`
 * redirects to /workout/[id] on success, which surfaces as a thrown
 * NEXT_REDIRECT — swallow that and let it propagate the navigation, only
 * surface genuine errors.
 */
export function StartWorkoutButton({ programDayId }: { programDayId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await startSession(programDayId);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes("NEXT_REDIRECT"))) {
          throw e;
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 bg-signal py-4 text-lg uppercase tracking-wide text-signal-foreground transition-colors hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-60"
      style={{ fontFamily: "var(--font-display)" }}
    >
      <Play className="h-5 w-5 fill-current" />
      {pending ? "Starting…" : "Start Workout"}
    </button>
  );
}
