"use client";

import { useState } from "react";
import { assignProgram } from "@/app/actions/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AssignProgramForm({ clientId }: { clientId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await assignProgram(clientId, formData);
    } catch (e) {
      // redirect() throws a NEXT_REDIRECT control-flow signal on success —
      // let it propagate instead of surfacing it as an error.
      if (
        e &&
        typeof e === "object" &&
        "digest" in e &&
        typeof (e as { digest?: string }).digest === "string" &&
        (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw e;
      }
      setError(e instanceof Error ? e.message : "Failed to assign program");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Push / Pull / Legs" required />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" placeholder="Optional" />
        </div>
        <div>
          <Label htmlFor="targetRir">Target RIR</Label>
          <select
            id="targetRir"
            name="targetRir"
            defaultValue="2"
            className="mt-1 flex h-8 w-full border-2 border-foreground bg-transparent px-2.5 text-sm"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "rep" : "reps"} in reserve
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating…" : "Create program"}
      </Button>
    </form>
  );
}
