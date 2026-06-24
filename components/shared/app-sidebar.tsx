"use client";

import Link from "next/link";
import {
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  TrendingUp,
  Library,
  Play,
  Shield,
  GraduationCap,
} from "lucide-react";
import { NavSidebar, type NavItem } from "@/components/shared/nav-sidebar";

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { title: "Workout", href: "/workout", icon: Dumbbell },
  { title: "Programs", href: "/programs", icon: ListChecks },
  { title: "Log", href: "/log", icon: ClipboardList },
  { title: "Progress", href: "/progress", icon: TrendingUp },
  { title: "Exercises", href: "/exercises", icon: Library },
];

export function AppSidebar({
  isAdmin = false,
  isTrainer = false,
}: {
  isAdmin?: boolean;
  isTrainer?: boolean;
}) {
  const items = [...navItems];
  // Non-trainers (and non-admins) get a path to apply for trainer access.
  if (!isTrainer && !isAdmin) {
    items.push({
      title: "Become a trainer",
      href: "/become-a-trainer",
      icon: GraduationCap,
    });
  }
  if (isAdmin) {
    items.push({ title: "Admin", href: "/admin", icon: Shield });
  }

  return (
    <NavSidebar
      brand={{ href: "/", icon: Dumbbell, title: "GYMTRACK", subtitle: "Training Log" }}
      items={items}
      footer={
        <Link
          href="/workout"
          className="group flex items-center justify-center gap-2 border-2 border-foreground bg-signal px-3 py-3.5 text-sm font-bold uppercase tracking-wide text-signal-foreground transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Play className="h-4 w-4 fill-current" strokeWidth={2.5} />
          Start Workout
        </Link>
      }
    />
  );
}
