"use client";

import { useState } from "react";
import { MUSCLES_BY_REGION } from "@/lib/muscles";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Primary-muscle Select plus toggleable supporting muscles. Submits
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
        <Select name="primaryMuscle" value={primary} onValueChange={setPrimary}>
          <SelectTrigger id="primaryMuscle" className="mt-1 h-11 w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {MUSCLES_BY_REGION.map((group) => (
              <SelectGroup key={group.region}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.muscles.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Supporting muscles</Label>
        <p className="text-xs text-muted-foreground">
          Optional — muscles this exercise also works.
        </p>
        <div className="mt-1.5 space-y-3">
          {MUSCLES_BY_REGION.map((group) => {
            const options = group.muscles.filter((m) => m.slug !== primary);
            if (options.length === 0) return null;
            return (
              <div key={group.region}>
                <p className="text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {options.map((m) => {
                    const on = secondary.includes(m.slug);
                    return (
                      <button
                        key={m.slug}
                        type="button"
                        onClick={() => toggle(m.slug)}
                        aria-pressed={on}
                        className={`flex min-h-11 items-center justify-center border-2 border-foreground px-3 text-sm transition-colors ${
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
              </div>
            );
          })}
        </div>
        <input type="hidden" name="secondaryMuscles" value={secondaryValue} />
      </div>
    </div>
  );
}
