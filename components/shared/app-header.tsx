import Link from "next/link";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Dumbbell, Play, Shield, UserX, HeartHandshake, Users, Bell } from "lucide-react";
import { auth, userIsAdmin } from "@/lib/auth";
import { stopImpersonating } from "@/app/actions/admin";
import { getActiveProgram } from "@/data/programs";
import { getInProgressSession } from "@/data/sessions";
import { getMyUnreadCount } from "@/data/notifications";

export async function AppHeader() {
  const [session, program, inProgress, unreadCount] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getActiveProgram(),
    getInProgressSession(),
    getMyUnreadCount(),
  ]);

  const isAdmin = session?.user ? userIsAdmin(session.user) : false;
  const isTrainer = session?.user?.role === "trainer";
  const impersonating = Boolean(
    (session?.session as { impersonatedBy?: string | null } | undefined)
      ?.impersonatedBy,
  );

  return (
    <>
      {impersonating && (
        <div className="flex items-center justify-between gap-2 border-b-2 border-foreground bg-destructive px-3 py-1.5 text-destructive-foreground md:px-5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
            <UserX className="h-3.5 w-3.5" />
            Impersonating {session?.user?.name ?? "user"}
          </span>
          <form action={stopImpersonating}>
            <button
              type="submit"
              className="border border-destructive-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide hover:bg-destructive-foreground hover:text-destructive"
            >
              Stop
            </button>
          </form>
        </div>
      )}
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
        {isTrainer && (
          // Mobile entry point for the trainer's clients (the desktop sidebar
          // carries it on larger screens).
          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 md:hidden" aria-label="Clients">
            <Link href="/clients">
              <Users className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {!isAdmin && (
          // Mobile entry point for the client-facing coaching page (the desktop
          // sidebar carries it on larger screens). Shown to trainers too, since
          // a trainer can also be coached.
          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 md:hidden" aria-label="Coach">
            <Link href="/coach">
              <HeartHandshake className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {isAdmin && (
          <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Admin">
            <Link href="/admin">
              <Shield className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="relative h-8 w-8 p-0"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border border-foreground bg-signal px-0.5 text-[9px] font-bold leading-none text-signal-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </Button>
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
    </>
  );
}
