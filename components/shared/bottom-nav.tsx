"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  ListChecks,
  ClipboardList,
  TrendingUp,
  Target,
  Library,
  Users,
  HeartHandshake,
  Shield,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Daily "train" destinations live in the bar; "build" destinations live behind
// the More sheet so the gym-context bar stays uncluttered.
const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/#start", label: "Start", icon: Dumbbell, primary: true },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

// Routes reachable from the More sheet — used to highlight the More tab.
const BUILD_PREFIXES = ["/goals", "/programs", "/exercises", "/coach", "/clients", "/admin"];

export function BottomNav({
  isAdmin = false,
  isTrainer = false,
}: {
  isAdmin?: boolean;
  isTrainer?: boolean;
}) {
  const pathname = usePathname();

  const buildLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/programs", label: "Programs", icon: ListChecks },
    { href: "/exercises", label: "Exercises", icon: Library },
  ];
  if (isTrainer) buildLinks.push({ href: "/clients", label: "Clients", icon: Users });
  if (!isAdmin) buildLinks.push({ href: "/coach", label: "Coach", icon: HeartHandshake });
  if (isAdmin) buildLinks.push({ href: "/admin", label: "Admin", icon: Shield });

  const moreActive = BUILD_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground bg-background md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : tab.href.startsWith("/#")
                ? false
                : pathname.startsWith(tab.href);

          if (tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 border-x-2 border-foreground bg-foreground py-2 text-background"
              >
                <tab.icon className="h-5 w-5" strokeWidth={2.4} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" strokeWidth={isActive ? 2.6 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {tab.label}
              </span>
              {isActive && <span className="mt-0.5 h-0.5 w-5 bg-foreground" />}
            </Link>
          );
        })}

        {/* MORE — opens the Build menu */}
        <Sheet>
          <SheetTrigger
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
              moreActive ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={moreActive ? 2.6 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              More
            </span>
            {moreActive && <span className="mt-0.5 h-0.5 w-5 bg-foreground" />}
          </SheetTrigger>
          <SheetContent side="bottom" className="border-t-2 border-foreground">
            <SheetHeader>
              <SheetTitle
                className="text-xl uppercase tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                More
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2.5 p-4">
              {buildLinks.map((link) => {
                const active =
                  pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      data-active={active}
                      className="group flex items-center gap-2.5 border-2 px-3 py-3 text-sm font-bold uppercase tracking-wide transition-none data-[active=false]:border-transparent data-[active=false]:bg-card data-[active=false]:hover:border-foreground data-[active=true]:border-foreground data-[active=true]:bg-signal data-[active=true]:text-signal-foreground data-[active=true]:shadow-[3px_3px_0_0_var(--foreground)]"
                    >
                      <link.icon className="h-5 w-5 shrink-0" strokeWidth={2.4} />
                      <span>{link.label}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
