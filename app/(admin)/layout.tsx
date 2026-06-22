import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, userIsAdmin } from "@/lib/auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AdminNav } from "@/components/shared/admin-nav";
import { Shield, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate the whole admin console here so every admin page is admin-only.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !userIsAdmin(session.user)) redirect("/");

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-3 md:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground">
              <Shield className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="flex flex-col leading-none">
              <span
                className="text-base uppercase tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                GymTrack
              </span>
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Admin Console
              </span>
            </span>
          </Link>

          <div className="ml-6 hidden sm:block">
            <AdminNav />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="flex items-center gap-1.5 border-2 border-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Exit to app
            </Link>
          </div>
        </div>

        {/* Mobile section nav */}
        <div className="border-t-2 border-foreground px-3 py-2 sm:hidden">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] p-4 md:p-7">{children}</main>
    </div>
  );
}
