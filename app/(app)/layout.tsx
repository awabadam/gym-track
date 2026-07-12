import { headers } from "next/headers";
import { auth, userIsAdmin } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { BottomNav } from "@/components/shared/bottom-nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  // Signed-out: render full-bleed with no app shell. Auth screens and the
  // landing page own their own layout/centering.
  if (!session) return <>{children}</>;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <TooltipProvider>
        <SidebarProvider className="mx-auto max-w-[1440px] border-foreground md:border-x-2">
          <AppSidebar
            isAdmin={userIsAdmin(session.user)}
            isTrainer={session.user.role === "trainer"}
          />
          <SidebarInset>
            <AppHeader />
            <main
              id="main-content"
              className="w-full flex-1 p-4 pb-24 md:p-7 md:pb-7"
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <BottomNav
          isAdmin={userIsAdmin(session.user)}
          isTrainer={session.user.role === "trainer"}
        />
      </TooltipProvider>
    </>
  );
}
