import Link from "next/link";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Dumbbell, Play } from "lucide-react";
import { getActiveProgram } from "@/data/programs";
import { getInProgressSession } from "@/data/sessions";

export async function AppHeader() {
  const [program, inProgress] = await Promise.all([
    getActiveProgram(),
    getInProgressSession(),
  ]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-foreground bg-background px-3 md:px-5">
      {/* Logo — mobile only */}
      <Link
        href="/"
        className="flex items-center gap-2 md:hidden"
      >
        <span className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
          <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span
          className="text-base uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          GymTrack
        </span>
      </Link>

      {/* Active program — desktop */}
      {program && (
        <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
          <span className="bg-foreground px-2 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-background">
            Active
          </span>
          <span
            className="truncate text-sm uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {program.name}
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {inProgress ? (
          <Button asChild size="sm" variant="default" className="h-8 gap-1.5">
            <Link href={`/workout/${inProgress.id}`}>
              <span className="h-2 w-2 animate-pulse bg-signal" />
              Resume
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="hidden h-8 md:flex">
            <Link href="/workout">
              <Play className="mr-1 h-3.5 w-3.5 fill-current" />
              Workout
            </Link>
          </Button>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
