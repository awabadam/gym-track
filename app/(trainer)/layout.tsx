import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TrainerSidebar } from "@/components/shared/trainer-sidebar";
import { TrainerNav } from "@/components/shared/trainer-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SkipLink } from "@/components/shared/skip-link";
import { HeartHandshake, ArrowLeft } from "lucide-react";

export default async function TrainerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate the whole coach console here so every page is trainer-only (admins
  // aren't trainers — they'd use impersonation to view a trainer's console).
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== "trainer") redirect("/");

  return (
    <TooltipProvider>
      <SkipLink />
      <SidebarProvider>
        <TrainerSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-foreground bg-background px-4 md:px-10">
            {/* Brand — mobile only (the sidebar carries it on desktop) */}
            <Link href="/clients" className="flex items-center gap-2 md:hidden">
              <span className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
                <HeartHandshake className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span
                className="text-base uppercase tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Coach
              </span>
            </Link>

            <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground md:inline">
              Coach Console
            </span>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              {/* Exit — mobile only; the sidebar footer carries it on desktop */}
              <Link
                href="/"
                className="flex items-center gap-1.5 border-2 border-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background md:hidden"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Exit
              </Link>
            </div>
          </header>

          {/* Mobile section nav (the sidebar is hidden on mobile) */}
          <div className="border-b-2 border-foreground px-3 py-2 md:hidden">
            <TrainerNav />
          </div>

          <main
            id="main-content"
            className="w-full flex-1 p-4 pb-24 md:px-10 md:py-9 md:pb-9"
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
