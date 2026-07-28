"use client";

import { useState } from "react";
import { createProgram } from "@/app/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewProgramForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await createProgram(formData);
    } catch (e) {
      // createProgram redirects on success, which throws a NEXT_REDIRECT
      // control-flow signal — let it propagate instead of surfacing it as
      // an error.
      if (
        e &&
        typeof e === "object" &&
        "digest" in e &&
        typeof (e as { digest?: string }).digest === "string" &&
        (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw e;
      }
      setError(e instanceof Error ? e.message : "Failed to create program");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Upper/Lower 4 Day Split"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="Optional description..."
        />
      </div>
      <div>
        <Label htmlFor="targetRir">Target RIR</Label>
        <Select name="targetRir" defaultValue="2">
          <SelectTrigger id="targetRir" className="mt-1 h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {n === 1 ? "rep" : "reps"} in reserve
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Reps left in the tank before the app suggests adding weight.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit">Create &amp; add days</Button>
    </form>
  );
}
