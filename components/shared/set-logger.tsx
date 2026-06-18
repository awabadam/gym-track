"use client";

import { useState } from "react";
import { logSet } from "@/app/actions/sessions";
import { Check } from "lucide-react";

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

/**
 * One compact row per set (Strong/Hevy-style): set # · previous · kg · reps ·
 * RIR (tap to cycle) · check. The check fills when the set is logged; editing a
 * field un-fills it until you confirm again.
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

  // Editing a value un-confirms the set until the user checks it again.
  function markDirty() {
    if (saved) setSaved(false);
  }

  async function handleSave() {
    if (!weight || !reps) return;
    const w = parseFloat(weight);
    const r = parseInt(reps);
    setSaved(true);
    setJustSaved(true);
    haptic();
    setTimeout(() => setJustSaved(false), 350);
    try {
      await logSet(sessionId, exerciseId, setNumber, w, r, rir);
      // Tell the rest timer a set was completed (auto-start).
      window.dispatchEvent(new CustomEvent("gymtrack:set-logged"));
    } catch {
      setSaved(false);
    }
  }

  const inputClass =
    "h-9 w-full min-w-0 flex-1 border-2 border-foreground bg-background px-1 text-center font-mono text-base tabular-nums outline-none focus:ring-2 focus:ring-ring";

  return (
    <div
      className={`flex items-center gap-1.5 px-1 py-1 transition-colors ${
        saved ? "bg-signal/15" : ""
      } ${justSaved ? "animate-set-saved" : ""}`}
    >
      {/* set number */}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-foreground font-mono text-xs font-bold tabular-nums">
        {setNumber}
      </span>

      {/* previous (reference) */}
      <span className="hidden w-12 shrink-0 truncate text-right font-mono text-[11px] text-muted-foreground sm:inline">
        {previousSet ? `${previousSet.weight}×${previousSet.reps}` : "—"}
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
      <span className="shrink-0 text-xs text-muted-foreground">×</span>
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

      {/* RIR — tap to cycle 0–5 */}
      <button
        type="button"
        onClick={() => {
          setRir((rir + 1) % 6);
          markDirty();
        }}
        aria-label={`Reps in reserve, set ${setNumber}: ${rir}`}
        title="Reps in reserve (tap to change)"
        className="flex h-9 shrink-0 items-center gap-1 border-2 border-foreground px-1.5"
      >
        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          RIR
        </span>
        <span className="font-mono text-sm font-bold tabular-nums">{rir}</span>
      </button>

      {/* confirm */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!weight || !reps}
        aria-label={saved ? `Set ${setNumber} logged` : `Log set ${setNumber}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground transition-colors disabled:opacity-40 ${
          saved
            ? "bg-signal text-signal-foreground"
            : "bg-card text-foreground hover:bg-muted"
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}
