"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 px-2"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
