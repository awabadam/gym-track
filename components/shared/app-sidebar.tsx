"use client";

import Link from "next/link";
import {
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  TrendingUp,
  Target,
  Library,
  Play,
  Shield,
  HeartHandshake,
  Users,
} from "lucide-react";
import { NavSidebar, type NavItem } from "@/components/shared/nav-sidebar";

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, exact: true, section: "// Train" },
  { title: "Log", href: "/log", icon: ClipboardList, section: "// Train" },
  { title: "Progress", href: "/progress", icon: TrendingUp, section: "// Train" },
  { title: "Goals", href: "/goals", icon: Target, section: "// Train" },
  { title: "Programs", href: "/programs", icon: ListChecks, section: "// Build" },
  { title: "Exercises", href: "/exercises", icon: Library, section: "// Build" },
];

export function AppSidebar({
  isAdmin = false,
  isTrainer = false,
}: {
  isAdmin?: boolean;
  isTrainer?: boolean;
}) {
  const items = [...navItems];
  // Trainers manage the lifters they coach — authoring-adjacent, so it sits
  // under Build alongside programs and exercises.
  if (isTrainer) {
    items.push({ title: "Clients", href: "/clients", icon: Users, section: "// Build" });
  }
  // Everyone except admins gets the client-facing coaching entry (a trainer can
  // also be coached). For non-trainers it also links out to /become-a-trainer.
  if (!isAdmin) {
    items.push({ title: "Coach", href: "/coach", icon: HeartHandshake, section: "// Build" });
  }
  if (isAdmin) {
    items.push({ title: "Admin", href: "/admin", icon: Shield, section: "// Admin" });
  }

  return (
    <NavSidebar
      brand={{ href: "/", icon: Dumbbell, title: "GYMTRACK", subtitle: "Training Log" }}
      items={items}
      footer={
        <Link
          href="/"
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
