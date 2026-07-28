"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

export interface DisplayNote {
  id: string;
  body: string;
  createdAt: Date | null;
  sessionId?: string | null;
  sessionDayName?: string | null;
  sessionDate?: string | null;
  trainerName?: string | null;
}

function formatStamp(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Renders a list of coaching notes. Pass `deleteAction` (the unbound
 * deleteCoachNote server action) to show a remove button — bound per note here.
 * Pass `sessionHref` to link a note's session context to a workout view.
 */
export function CoachNotesList({
  notes,
  emptyText = "No notes yet.",
  deleteAction,
  sessionHref,
}: {
  notes: DisplayNote[];
  emptyText?: string;
  deleteAction?: (noteId: string) => Promise<void>;
  sessionHref?: (sessionId: string) => string;
}) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => {
        const context =
          note.sessionId && note.sessionDayName
            ? `${note.sessionDayName}${note.sessionDate ? ` · ${note.sessionDate}` : ""}`
            : null;
        return (
          <li key={note.id} className="border-2 border-foreground p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm">
                {note.body}
              </p>
              {deleteAction && (
                <DeleteNoteButton
                  noteId={note.id}
                  noteBody={note.body}
                  deleteAction={deleteAction}
                />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {note.trainerName && (
                <span className="font-medium">{note.trainerName}</span>
              )}
              <span>{formatStamp(note.createdAt)}</span>
              {context &&
                (note.sessionId && sessionHref ? (
                  <Link
                    href={sessionHref(note.sessionId)}
                    className="border border-foreground px-1.5 py-0.5 uppercase tracking-wide hover:bg-muted"
                  >
                    {context}
                  </Link>
                ) : (
                  <span className="border border-foreground px-1.5 py-0.5 uppercase tracking-wide">
                    {context}
                  </span>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Truncate a note body for use inside a confirm-dialog description. */
function excerpt(body: string, max = 80): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function DeleteNoteButton({
  noteId,
  noteBody,
  deleteAction,
}: {
  noteId: string;
  noteBody: string;
  deleteAction: (noteId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteAction(noteId);
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 text-destructive hover:text-destructive"
          aria-label="Delete note"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{excerpt(noteBody)}&quot; will be permanently removed. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
