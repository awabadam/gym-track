"use client";

import { useTransition } from "react";
import { startSession } from "@/app/actions/sessions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Play } from "lucide-react";

type Day = {
  id: string;
  name: string;
  dayCode: string;
  scheduledDay: string | null;
};

const WEEKDAY_ABBR: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

/**
 * Dropdown that starts a live session for any day of the active program.
 * Used on the dashboard so a workout can begin without the old /workout page.
 */
export function StartWorkoutPicker({
  days,
  todayDayId,
  label = "Start another day",
  triggerClassName,
  align = "end",
}: {
  days: Day[];
  todayDayId?: string;
  label?: string;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
}) {
  const [pending, start] = useTransition();

  function go(id: string) {
    start(async () => {
      try {
        await startSession(id);
      } catch (e) {
        // startSession redirects on success, which throws NEXT_REDIRECT — only
        // surface genuine errors.
        if (!(e instanceof Error && e.message.includes("NEXT_REDIRECT"))) {
          throw e;
        }
      }
    });
  }

  if (days.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={
          triggerClassName ??
          "group inline-flex items-center justify-center gap-1.5 border-2 border-foreground bg-card px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--shadow-color)] disabled:opacity-60"
        }
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Play className="h-4 w-4 fill-current" strokeWidth={2.5} />
        {pending ? "Starting…" : label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Start a workout
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {days.map((d) => (
          <DropdownMenuItem
            key={d.id}
            onSelect={() => go(d.id)}
            className="gap-2.5"
          >
            <span className="flex h-6 min-w-6 items-center justify-center bg-foreground px-1 font-mono text-[11px] font-bold text-background">
              {d.dayCode}
            </span>
            <span className="truncate text-sm font-bold uppercase tracking-wide">
              {d.name}
            </span>
            {d.id === todayDayId ? (
              <span className="ml-auto border border-foreground bg-signal px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-signal-foreground">
                Today
              </span>
            ) : d.scheduledDay ? (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_ABBR[d.scheduledDay] ?? ""}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
