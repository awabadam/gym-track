"use client";

import { useState, useTransition } from "react";
import { setActiveProgram } from "@/app/actions/programs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/**
 * Activates a program. Unlike start/complete session or duplicate, this
 * action doesn't redirect — it just revalidates the page in place — so we
 * show a brief inline confirmation while the fresh server data streams in
 * (the button itself unmounts once the revalidated list marks it active).
 */
export function SetActiveButton({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    setDone(false);
    startTransition(async () => {
      await setActiveProgram(programId);
      setDone(true);
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {done && (
        <span
          role="status"
          className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
        >
          Updated
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={`Set ${programName} as active`}
      >
        <Check className="h-3.5 w-3.5 mr-1" />
        {pending ? "Setting…" : "Set active"}
      </Button>
    </span>
  );
}
