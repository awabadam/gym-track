"use client";

import { useState } from "react";
import type { AdminUser } from "@/data/admin";
import { setUserRole, banUser, unbanUser } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserRowActions } from "@/components/shared/user-row-actions";
import { ShieldCheck, UserRound, Ban, RotateCcw, X } from "lucide-react";

function RoleBadge({ role }: { role?: string | null }) {
  if (role === "admin") {
    return (
      <Badge className="bg-signal text-signal-foreground border-foreground uppercase text-[10px]">
        Admin
      </Badge>
    );
  }
  if (role === "trainer") {
    return (
      <Badge variant="secondary" className="border-foreground uppercase text-[10px]">
        Trainer
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="uppercase text-[10px]">
      User
    </Badge>
  );
}

/** Brutalist native checkbox — no radix dependency. */
function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      className="h-4 w-4 shrink-0 cursor-pointer accent-signal"
    />
  );
}

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Never act on your own account (mirrors the per-row guard).
  const selectableIds = users
    .filter((u) => u.id !== currentUserId)
    .map((u) => u.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size >= selectableIds.length && allSelected
        ? new Set()
        : new Set(selectableIds)
    );
  }

  function clearSelection() {
    setSelected(new Set());
  }

  /** Run a per-user server action across the selection, then reset. */
  async function runBulk(fn: (id: string) => Promise<unknown>) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      for (const id of ids) {
        await fn(id);
      }
      clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setRunning(false);
    }
  }

  const count = selected.size;

  return (
    <div className="space-y-3">
      {count > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-2 border-foreground bg-card p-2 shadow-[4px_4px_0_0_var(--shadow-color)]">
          <span className="px-1 text-sm font-bold uppercase tracking-wide">
            {count} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => runBulk((id) => setUserRole(id, "admin"))}
            >
              <ShieldCheck className="mr-1 h-4 w-4" />
              Make admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => runBulk((id) => setUserRole(id, "user"))}
            >
              <UserRound className="mr-1 h-4 w-4" />
              Make user
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => runBulk((id) => unbanUser(id))}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Unban
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={running}
              onClick={() => setConfirmBan(true)}
            >
              <Ban className="mr-1 h-4 w-4" />
              Ban
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={running}
              onClick={clearSelection}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Mobile: card list */}
          <div className="sm:hidden divide-y">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-2 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {!isSelf && (
                      <SelectBox
                        checked={selected.has(u.id)}
                        onChange={() => toggle(u.id)}
                        label={`Select ${u.name}`}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {u.name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {u.email}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <RoleBadge role={u.role} />
                        {u.banned && (
                          <Badge variant="destructive" className="text-[10px] uppercase">
                            Banned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <UserRowActions user={u} isSelf={isSelf} />
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <SelectBox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      label="Select all users"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <TableRow key={u.id} data-state={selected.has(u.id) ? "selected" : undefined}>
                      <TableCell>
                        {!isSelf && (
                          <SelectBox
                            checked={selected.has(u.id)}
                            onChange={() => toggle(u.id)}
                            label={`Select ${u.name}`}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {u.banned ? (
                          <Badge variant="destructive" className="text-[10px] uppercase">
                            Banned
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <UserRowActions user={u} isSelf={isSelf} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk ban confirm — permanent ban, no reason (matches per-row default). */}
      <AlertDialog open={confirmBan} onOpenChange={setConfirmBan}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban {count} user{count === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Each selected account will be permanently banned and unable to sign
              in. You can unban them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmBan(false);
                runBulk((id) => banUser(id, new FormData()));
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ban {count} user{count === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error surface for bulk failures. */}
      <AlertDialog open={error !== null} onOpenChange={(o) => !o && setError(null)}>
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
    </div>
  );
}
