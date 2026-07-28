"use client";

import { useState } from "react";
import {
  setUserRole,
  banUser,
  unbanUser,
  setUserPassword,
  removeUser,
  impersonateUser,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface AdminUserLite {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
}

type ActiveDialog =
  | "ban"
  | "password"
  | "remove"
  | "promote"
  | "impersonate"
  | "error"
  | null;

export function UserRowActions({
  user,
  isSelf,
}: {
  user: AdminUserLite;
  isSelf: boolean;
}) {
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user.role === "admin";

  function close() {
    setDialog(null);
  }

  /** Run a direct (dialog-less) action, surfacing any error in the error dialog. */
  function run(fn: () => Promise<unknown>) {
    return async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
        setDialog("error");
      }
    };
  }

  async function handleBan(formData: FormData) {
    setError(null);
    try {
      await banUser(user.id, formData);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ban user");
    }
  }

  async function handleSetPassword(formData: FormData) {
    setError(null);
    try {
      await setUserPassword(user.id, formData);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set password");
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await removeUser(user.id);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove user");
    }
  }

  async function handlePromote() {
    setError(null);
    try {
      await setUserRole(user.id, "admin");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to promote user");
    }
  }

  async function handleImpersonate() {
    setError(null);
    try {
      await impersonateUser(user.id);
      close();
    } catch (e) {
      // impersonateUser redirects on success, which throws a NEXT_REDIRECT
      // control-flow signal — let it propagate instead of surfacing it as
      // an error.
      if (
        e &&
        typeof e === "object" &&
        "digest" in e &&
        typeof (e as { digest?: string }).digest === "string" &&
        (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw e;
      }
      setError(e instanceof Error ? e.message : "Failed to impersonate user");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={`Actions for ${user.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={isSelf}
            onSelect={
              isAdmin
                ? run(() => setUserRole(user.id, "user"))
                : (e) => {
                    e.preventDefault();
                    setError(null);
                    setDialog("promote");
                  }
            }
          >
            {isAdmin ? "Demote to user" : "Promote to admin"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSelf}
            onSelect={(e) => {
              e.preventDefault();
              setError(null);
              setDialog("impersonate");
            }}
          >
            Impersonate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setError(null);
              setDialog("password");
            }}
          >
            Set password
          </DropdownMenuItem>
          {user.banned ? (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={run(() => unbanUser(user.id))}
            >
              Unban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={(e) => {
                e.preventDefault();
                setError(null);
                setDialog("ban");
              }}
            >
              Ban
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isSelf}
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setError(null);
              setDialog("remove");
            }}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ban */}
      <Dialog open={dialog === "ban"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {user.name}?</DialogTitle>
            <DialogDescription>
              A banned user can&apos;t sign in. Leave the duration empty for a
              permanent ban.
            </DialogDescription>
          </DialogHeader>
          <form action={handleBan} className="space-y-4">
            <div>
              <Label htmlFor="ban-reason">Reason</Label>
              <Input id="ban-reason" name="reason" placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="ban-days">Expires in (days)</Label>
              <Input
                id="ban-days"
                name="expiresInDays"
                type="number"
                min="0"
                placeholder="0 = permanent"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ban user
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Set password */}
      <Dialog open={dialog === "password"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set password for {user.name}</DialogTitle>
            <DialogDescription>
              The user&apos;s existing sessions stay valid; they&apos;ll use the
              new password next sign-in.
            </DialogDescription>
          </DialogHeader>
          <form action={handleSetPassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                minLength={8}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Set password
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <AlertDialog open={dialog === "remove"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account along with their programs,
              sessions, and logged history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote to admin */}
      <AlertDialog
        open={dialog === "promote"}
        onOpenChange={(o) => !o && close()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote {user.name} to admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Admins have full platform access: they can manage every
              user&apos;s role, impersonate any account, and delete data
              across the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePromote();
              }}
            >
              Promote to admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Impersonate */}
      <AlertDialog
        open={dialog === "impersonate"}
        onOpenChange={(o) => !o && close()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impersonate {user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll be signed in as {user.name} and can view and act on
              their account until you stop impersonating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleImpersonate();
              }}
            >
              Impersonate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error (for dialog-less actions) */}
      <AlertDialog open={dialog === "error"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Something went wrong</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
