"use client";

import { useState } from "react";
import { MUSCLES, MUSCLES_BY_REGION } from "@/lib/muscles";
import { Label } from "@/components/ui/label";

/**
 * Primary-muscle <select> plus toggleable supporting muscles. Submits
 * `primaryMuscle` (one slug) and `secondaryMuscles` (a comma-separated hidden
 * input, since parseForm collapses repeated form keys).
 */
export function MuscleSelect({
  defaultPrimary = "",
  defaultSecondary = [],
}: {
  defaultPrimary?: string | null;
  defaultSecondary?: string[] | null;
}) {
  const [primary, setPrimary] = useState(defaultPrimary ?? "");
  const [secondary, setSecondary] = useState<string[]>(defaultSecondary ?? []);

  function toggle(slug: string) {
    setSecondary((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  // Never let the primary also count as a supporting muscle.
  const secondaryValue = secondary.filter((s) => s !== primary).join(",");

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="primaryMuscle">Primary muscle</Label>
        <select
          id="primaryMuscle"
          name="primaryMuscle"
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          className="mt-1 flex h-9 w-full border-2 border-foreground bg-transparent px-2.5 text-sm"
        >
          <option value="">Select…</option>
          {MUSCLES_BY_REGION.map((group) => (
            <optgroup key={group.region} label={group.label}>
              {group.muscles.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <Label>Supporting muscles</Label>
        <p className="text-xs text-muted-foreground">
          Optional — muscles this exercise also works.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {MUSCLES.filter((m) => m.slug !== primary).map((m) => {
            const on = secondary.includes(m.slug);
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => toggle(m.slug)}
                aria-pressed={on}
                className={`border-2 border-foreground px-2 py-1 text-xs transition-colors ${
                  on
                    ? "bg-signal text-signal-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="secondaryMuscles" value={secondaryValue} />
      </div>
    </div>
  );
}
