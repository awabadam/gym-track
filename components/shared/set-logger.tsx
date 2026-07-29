"use client";

import { useEffect, useRef, useState } from "react";
import { logSet } from "@/app/actions/sessions";
import { Check, TriangleAlert } from "lucide-react";

interface SetLoggerProps {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  suggestedWeight: number;
  repRangeMin: number;
  repRangeMax: number;
  previousSet?: {
    weight: number;
    reps: number;
    rir: number | null;
  };
  bestSet?: {
    weight: number;
    reps: number;
  } | null;
  existingSet?: {
    id: string;
    weight: number;
    reps: number;
    rir: number | null;
  };
  defaultRir?: number;
}

function haptic() {
  if ("vibrate" in navigator) navigator.vibrate(10);
}

const RIR_LONG_PRESS_MS = 450;

/**
 * One compact row per set (Strong/Hevy-style): set # · previous · kg · reps ·
 * RIR (tap to cycle, hold to go down) · check. The check fills when the set
 * is logged; editing a field un-fills it until you confirm again. A failed
 * save turns the check into a visible retry state instead of silently
 * reverting.
 */
export function SetLogger({
  sessionId,
  exerciseId,
  setNumber,
  suggestedWeight,
  repRangeMin,
  repRangeMax,
  previousSet,
  existingSet,
  defaultRir = 2,
}: SetLoggerProps) {
  const [weight, setWeight] = useState(
    existingSet?.weight?.toString() ??
      previousSet?.weight?.toString() ??
      (suggestedWeight ? suggestedWeight.toString() : "")
  );
  const [reps, setReps] = useState(
    existingSet?.reps?.toString() ?? previousSet?.reps?.toString() ?? ""
  );
  const [rir, setRir] = useState<number>(
    existingSet?.rir ?? previousSet?.rir ?? defaultRir
  );
  const [saved, setSaved] = useState(!!existingSet);
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  // True once this set has been logged at least once and then edited again —
  // the DB still holds the old value until it's re-confirmed.
  const [dirty, setDirty] = useState(false);

  const rirTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rirLongPressed = useRef(false);
  // Bumped on every handleSave. A given call captures its value and only
  // applies its post-await result if it's still the latest — so a stale
  // in-flight save that resolves after the user edited again can't clear the
  // dirty flag or re-mark the row as saved.
  const saveGen = useRef(0);

  // Don't let a hold-in-progress RIR timer fire after unmount.
  useEffect(
    () => () => {
      if (rirTimer.current) clearTimeout(rirTimer.current);
    },
    []
  );

  // Editing a value un-confirms the set until the user checks it again.
  function markDirty() {
    if (saved) {
      setSaved(false);
      setDirty(true);
      // Invalidate any in-flight save: its post-await success must not clear
      // the dirty flag now that the on-screen values differ from what was sent.
      saveGen.current++;
    }
    if (error) setError(false);
  }

  async function handleSave() {
    if (!weight || !reps || saving) return;
    const w = parseFloat(weight);
    const r = parseInt(reps);
    const gen = ++saveGen.current;
    setSaving(true);
    setError(false);
    setSaved(true);
    setJustSaved(true);
    haptic();
    setTimeout(() => setJustSaved(false), 350);
    try {
      await logSet(sessionId, exerciseId, setNumber, w, r, rir);
      // Tell the rest timer a set was completed (auto-start).
      // detail lets listeners attribute the set (rest-timer ignores it; the
      // workout rail uses it to keep per-exercise counts exact on re-saves).
      window.dispatchEvent(
        new CustomEvent("gymtrack:set-logged", {
          detail: { exerciseId, setNumber },
        })
      );
      // Only reconcile "saved" state if the user hasn't edited (which starts a
      // newer save generation) since this request was dispatched. Otherwise
      // the on-screen values differ from what we just persisted, so leaving
      // the row dirty is correct — don't clear it for a stale resolution.
      if (gen === saveGen.current) {
        setDirty(false);
      }
    } catch {
      // Loud failure: never silently drop the typed values. Keep weight/reps
      // as-is, un-fill the check, and surface a retryable error state — but
      // only if the user hasn't edited since dispatch. If they did, the row is
      // already dirty with newer values they'll re-save, so a stale rejection
      // shouldn't flash an error over it.
      if (gen === saveGen.current) {
        setSaved(false);
        setError(true);
      }
    } finally {
      // Always release the in-flight lock — a second save can't start until
      // this one settles, so this is the only place that clears it. (Gen may
      // have advanced via an edit; that must not strand `saving` at true.)
      setSaving(false);
    }
  }

  function clearRirTimer() {
    if (rirTimer.current) {
      clearTimeout(rirTimer.current);
      rirTimer.current = null;
    }
  }

  function handleRirPointerDown() {
    rirLongPressed.current = false;
    clearRirTimer();
    rirTimer.current = setTimeout(() => {
      rirLongPressed.current = true;
      setRir((r) => (r + 5) % 6); // -1, wrapping
      markDirty();
      haptic();
    }, RIR_LONG_PRESS_MS);
  }

  function handleRirPointerUp() {
    clearRirTimer();
  }

  function handleRirClick() {
    if (rirLongPressed.current) {
      // The long-press already applied a decrement; swallow the trailing
      // click so it doesn't also increment.
      rirLongPressed.current = false;
      return;
    }
    setRir((r) => (r + 1) % 6);
    markDirty();
  }

  const inputClass =
    "h-11 w-full min-w-0 flex-1 border-2 border-foreground bg-background px-1 text-center font-mono text-base tabular-nums outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={`flex items-center gap-1.5 px-1 py-1 transition-colors ${
          saved ? "bg-signal/15" : ""
        } ${justSaved ? "animate-set-saved" : ""}`}
      >
        {/* set number */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-foreground font-mono text-xs font-bold tabular-nums">
          {setNumber}
        </span>

        {/* previous (reference) — visible at all breakpoints so the
            progressive-overload cue survives on phones. */}
        <span className="w-10 shrink-0 truncate text-right font-mono text-[11px] text-foreground/70">
          {previousSet ? `${previousSet.weight}×${previousSet.reps}` : ""}
        </span>

        {/* weight */}
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          placeholder="kg"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            markDirty();
          }}
          onFocus={(e) => e.target.select()}
          autoComplete="off"
          aria-label={`Weight, set ${setNumber}`}
          className={inputClass}
        />
        <span className="shrink-0 text-xs text-foreground/70">×</span>
        {/* reps */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={`${repRangeMin}-${repRangeMax}`}
          value={reps}
          onChange={(e) => {
            setReps(e.target.value);
            markDirty();
          }}
          onFocus={(e) => e.target.select()}
          autoComplete="off"
          aria-label={`Reps, set ${setNumber}`}
          className={inputClass}
        />

        {/* RIR — tap to cycle up 0–5, hold to step down */}
        <button
          type="button"
          onPointerDown={handleRirPointerDown}
          onPointerUp={handleRirPointerUp}
          onPointerLeave={handleRirPointerUp}
          onPointerCancel={handleRirPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          onClick={handleRirClick}
          aria-label={`Reps in reserve, set ${setNumber}: ${rir}. Tap to increase, hold to decrease.`}
          title="Reps in reserve — tap +, hold −"
          className="flex h-11 shrink-0 items-center gap-1 border-2 border-foreground px-1.5"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">
            RIR
          </span>
          <span className="font-mono text-sm font-bold tabular-nums">{rir}</span>
        </button>

        {/* confirm */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!weight || !reps || saving}
          aria-label={
            error
              ? `Save failed for set ${setNumber} — tap to retry`
              : dirty
                ? `Set ${setNumber} edited — tap to save the update`
                : saved
                  ? `Set ${setNumber} logged`
                  : `Log set ${setNumber}`
          }
          title={
            error
              ? "Save failed — tap to retry"
              : dirty
                ? "Edited since last save — tap to update"
                : undefined
          }
          className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 transition-colors disabled:opacity-40 ${
            error
              ? "border-destructive bg-destructive text-destructive-foreground"
              : dirty
                ? "border-foreground bg-signal/25 text-foreground hover:bg-signal/40"
                : saved
                  ? "border-foreground bg-signal text-signal-foreground"
                  : "border-foreground bg-card text-foreground hover:bg-muted"
          }`}
        >
          {error ? (
            <TriangleAlert className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Check className="h-4 w-4" strokeWidth={3} />
          )}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="px-1 font-mono text-[11px] font-bold text-destructive"
        >
          Save failed — weight and reps kept, tap the check to retry.
        </p>
      )}
    </div>
  );
}
