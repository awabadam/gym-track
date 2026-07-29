import Link from "next/link";
import { DeleteCoachNoteButton } from "@/components/shared/delete-coach-note-button";

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

/** Truncate a note body for use inside a confirm-dialog description. */
function excerpt(body: string, max = 80): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * Renders a list of coaching notes. Pass `deleteAction` (the unbound
 * deleteCoachNote server action) to show a remove button — bound per note here.
 * Pass `sessionHref` to link a note's session context to a workout view.
 *
 * This stays a Server Component: the delete confirm (which needs client state)
 * lives in the `DeleteCoachNoteButton` client child, so the plain `sessionHref`
 * closure passed by server parents never has to cross a client boundary.
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
                <DeleteCoachNoteButton
                  noteExcerpt={excerpt(note.body)}
                  deleteAction={deleteAction.bind(null, note.id)}
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
