"use client";

import { useState } from "react";
import { createRecommendedProgram } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function CreateRecommendedProgramDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      // Redirects to the builder on success.
      await createRecommendedProgram(formData);
    } catch (e) {
      // A redirect throws a special error that must propagate, not be swallowed.
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add program
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recommended program</DialogTitle>
          <DialogDescription>
            Create the template, then add days and exercises in the builder.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rp-name">Name</Label>
            <Input id="rp-name" name="name" required />
          </div>
          <div>
            <Label htmlFor="rp-description">Description</Label>
            <Input id="rp-description" name="description" />
          </div>
          <div>
            <Label htmlFor="rp-targetRir">Target RIR</Label>
            <select
              id="rp-targetRir"
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Create & build
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
