import { headers } from "next/headers";
import { auth, userIsAdmin } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { BottomNav } from "@/components/shared/bottom-nav";
import { SkipLink } from "@/components/shared/skip-link";

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
      <SkipLink />
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            isAdmin={userIsAdmin(session.user)}
            isTrainer={session.user.role === "trainer"}
          />
          <SidebarInset>
            <AppHeader />
            <main
              id="main-content"
              className="w-full flex-1 p-4 pb-24 md:px-10 md:py-9 md:pb-9"
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
