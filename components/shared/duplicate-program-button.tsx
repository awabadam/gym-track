"use client";

import { useTransition } from "react";
import { duplicateProgram } from "@/app/actions/programs";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

/**
 * Duplicates a program. `duplicateProgram` redirects to the new program's
 * edit page on success, which surfaces as a thrown NEXT_REDIRECT — swallow
 * that and let it propagate the navigation, only surface genuine errors.
 */
export function DuplicateProgramButton({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await duplicateProgram(programId);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes("NEXT_REDIRECT"))) {
          throw e;
        }
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="h-10 w-10 p-0"
      onClick={handleClick}
      disabled={pending}
      aria-label={pending ? `Duplicating ${programName}…` : `Duplicate ${programName}`}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}
