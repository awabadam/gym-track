"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  TrendingUp,
  Library,
  Play,
  Shield,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Workout", href: "/workout", icon: Dumbbell },
  { title: "Programs", href: "/programs", icon: ListChecks },
  { title: "Log", href: "/log", icon: ClipboardList },
  { title: "Progress", href: "/progress", icon: TrendingUp },
  { title: "Exercises", href: "/exercises", icon: Library },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const items = isAdmin
    ? [...navItems, { title: "Admin", href: "/admin", icon: Shield }]
    : navItems;

  // On mobile we use BottomNav instead — don't render the sidebar at all
  if (isMobile) return null;

  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 h-svh self-start border-r-2 border-foreground"
    >
      <SidebarHeader className="h-14 justify-center gap-0 border-b-2 border-foreground p-0">
        <Link
          href="/"
          className="group flex h-full items-center gap-2.5 px-4"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-foreground bg-signal text-signal-foreground transition-transform group-hover:-translate-y-0.5 group-hover:shadow-[3px_3px_0_0_var(--foreground)]">
            <Dumbbell className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="text-lg leading-none tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              GYMTRACK
            </span>
            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              Training Log
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="p-0">
          <div className="px-2 pb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {"// Navigate"}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item, i) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      data-active={isActive}
                      className="group flex items-center gap-3 border-2 px-3 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-none data-[active=false]:border-transparent data-[active=false]:text-foreground data-[active=false]:hover:border-foreground data-[active=false]:hover:bg-foreground data-[active=false]:hover:text-background data-[active=true]:border-foreground data-[active=true]:bg-signal data-[active=true]:text-signal-foreground data-[active=true]:shadow-[3px_3px_0_0_var(--foreground)]"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} />
                      <span>{item.title}</span>
                      <span className="ml-auto font-mono text-[10px] opacity-60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t-2 border-foreground p-3">
        <Link
          href="/workout"
          className="group flex items-center justify-center gap-2 border-2 border-foreground bg-signal px-3 py-3.5 text-sm font-bold uppercase tracking-wide text-signal-foreground transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Play className="h-4 w-4 fill-current" strokeWidth={2.5} />
          Start Workout
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
