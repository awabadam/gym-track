"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, RotateCcw, X, Zap } from "lucide-react";

const PRESETS = [
  { label: "1:30", seconds: 90 },
  { label: "2:00", seconds: 120 },
  { label: "3:00", seconds: 180 },
];

const DEFAULT_REST = 120;

// Persisted so the countdown survives a refresh and stays accurate when the
// tab is backgrounded / the phone locks (we anchor to a real timestamp
// instead of trusting a running setInterval).
const STORAGE_KEY = "gymtrack:rest-timer";

// If we come back to a countdown that already finished while we were away,
// only surface the "rest over" cue if it finished recently — otherwise it's
// a stale timer from a past session and we just clear it silently.
const STALE_FINISH_WINDOW_MS = 5 * 60 * 1000;
// Same idea for a resumed stopwatch (mode "up"): don't resurrect one that's
// hours old.
const STALE_STOPWATCH_WINDOW_MS = 60 * 60 * 1000;

type PersistedRest = { mode: "down"; endAt: number; totalSeconds: number };
type PersistedStopwatch = { mode: "up"; startAt: number };
type Persisted = PersistedRest | PersistedStopwatch;

function isPersisted(value: unknown): value is Persisted {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.mode === "down") {
    return typeof v.endAt === "number" && typeof v.totalSeconds === "number";
  }
  if (v.mode === "up") {
    return typeof v.startAt === "number";
  }
  return false;
}

function persistState(state: Persisted | null) {
  if (typeof window === "undefined") return;
  try {
    if (state) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — degrade to
    // in-memory-only timing, nothing else to do.
  }
}

function loadPersistedState(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersisted(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function playBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
    oscillator.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Audio blocked/unsupported (autoplay policy, no AudioContext, etc.) —
    // vibration + the visible label still carry the signal.
  }
}

function fireFinishSignal() {
  if (typeof window === "undefined") return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Vibration unsupported/blocked — ignore.
  }
  playBeep();
}

export function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"up" | "down">("up");
  const [countdownFrom, setCountdownFrom] = useState(0);
  const [finished, setFinished] = useState(false);
  const [auto, setAuto] = useState(true);
  // Remember the last rest length chosen, used for auto-start.
  const restLenRef = useRef(DEFAULT_REST);

  // Timestamp anchors for the current run — the source of truth for
  // "how much time is left/elapsed" is always Date.now() vs. these, never
  // a decrement counter, so drift/backgrounding/refresh can't desync it.
  const endAtRef = useRef<number | null>(null);
  const startAtRef = useRef<number | null>(null);
  const countdownFromRef = useRef(countdownFrom);
  useEffect(() => {
    countdownFromRef.current = countdownFrom;
  }, [countdownFrom]);

  // Recompute the displayed value from the timestamp anchors. Called on
  // every tick and whenever the tab regains visibility.
  const tick = useCallback(() => {
    if (mode === "down") {
      if (endAtRef.current == null) return;
      const remaining = Math.max(
        0,
        Math.ceil((endAtRef.current - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (remaining <= 0) {
        endAtRef.current = null;
        setRunning(false);
        setFinished(true);
        persistState(null);
        fireFinishSignal();
      }
    } else if (mode === "up") {
      if (startAtRef.current == null) return;
      const elapsed = Math.max(
        0,
        Math.round((Date.now() - startAtRef.current) / 1000),
      );
      setSeconds(elapsed);
    }
  }, [mode]);

  useEffect(() => {
    if (!running) return;
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [running, tick]);

  // Correct for throttled/paused timers as soon as the tab (or phone
  // screen) becomes visible again, rather than waiting for the next tick.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tick]);

  useEffect(() => {
    if (!finished) return;
    const timeout = setTimeout(() => setFinished(false), 5000);
    return () => clearTimeout(timeout);
  }, [finished]);

  // Resume a running timer after a refresh, or drop a stale one. This is a
  // deliberate one-time hydration from an external system (localStorage),
  // deferred into an effect (rather than a useState lazy initializer) so
  // the first client render still matches the server-rendered markup and
  // we don't trigger a hydration mismatch. That makes a synchronous
  // multi-field setState here the correct shape, not an accident —
  // disabling the compiler's cascading-render heuristic for this block only.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persisted = loadPersistedState();
    if (!persisted) return;
    if (persisted.mode === "down") {
      const remainingMs = persisted.endAt - Date.now();
      if (remainingMs > 0) {
        endAtRef.current = persisted.endAt;
        restLenRef.current = persisted.totalSeconds;
        setCountdownFrom(persisted.totalSeconds);
        setSeconds(Math.ceil(remainingMs / 1000));
        setMode("down");
        setRunning(true);
      } else if (remainingMs > -STALE_FINISH_WINDOW_MS) {
        // Finished while we were away, and recently enough to still tell
        // the user about it.
        setCountdownFrom(persisted.totalSeconds);
        setMode("down");
        setSeconds(0);
        setFinished(true);
        persistState(null);
      } else {
        persistState(null);
      }
    } else {
      const elapsedMs = Date.now() - persisted.startAt;
      if (elapsedMs >= 0 && elapsedMs < STALE_STOPWATCH_WINDOW_MS) {
        startAtRef.current = persisted.startAt;
        setSeconds(Math.round(elapsedMs / 1000));
        setMode("up");
        setRunning(true);
      } else {
        persistState(null);
      }
    }
    // Runs once on mount only — this is a one-time resume, not a
    // reactive sync.
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const startCountdown = useCallback((presetSeconds: number) => {
    restLenRef.current = presetSeconds;
    const endAt = Date.now() + presetSeconds * 1000;
    endAtRef.current = endAt;
    startAtRef.current = null;
    setCountdownFrom(presetSeconds);
    setSeconds(presetSeconds);
    setMode("down");
    setFinished(false);
    setRunning(true);
    persistState({ mode: "down", endAt, totalSeconds: presetSeconds });
  }, []);

  // Auto-start a rest countdown when a set is logged.
  const autoRef = useRef(auto);
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);
  useEffect(() => {
    const onSet = () => {
      if (autoRef.current) startCountdown(restLenRef.current);
    };
    window.addEventListener("gymtrack:set-logged", onSet);
    return () => window.removeEventListener("gymtrack:set-logged", onSet);
  }, [startCountdown]);

  const toggle = useCallback(() => {
    if (!running) {
      const startAt = Date.now();
      startAtRef.current = startAt;
      endAtRef.current = null;
      setSeconds(0);
      setMode("up");
      setFinished(false);
      persistState({ mode: "up", startAt });
    }
    setRunning((r) => !r);
  }, [running]);

  const reset = useCallback(() => {
    endAtRef.current = null;
    startAtRef.current = null;
    persistState(null);
    setSeconds(0);
    setRunning(false);
    setFinished(false);
    setMode("up");
  }, []);

  const addTime = useCallback(
    (delta: number) => {
      setSeconds((s) => {
        const next = Math.max(0, s + delta);
        if (mode === "down") {
          // Always re-anchor to a real timestamp, even at 0 — that lets
          // the next tick() run the normal finish transition (vibration,
          // beep, persisted-state cleanup) instead of getting stuck
          // showing 0:00 forever.
          const newEndAt = Date.now() + next * 1000;
          endAtRef.current = newEndAt;
          persistState({
            mode: "down",
            endAt: newEndAt,
            totalSeconds: countdownFromRef.current || next,
          });
        }
        return next;
      });
    },
    [mode],
  );

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  const counting = running && mode === "down";
  const numberClass = finished
    ? "text-destructive"
    : counting && seconds <= 10
      ? "text-signal"
      : counting
        ? "text-foreground"
        : "text-muted-foreground";

  return (
    <div className="sticky top-14 z-30 -mx-1 border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--shadow-color)]">
      <div
        className={`flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center ${finished ? "animate-pulse" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            className={`font-mono text-2xl font-bold tabular-nums sm:text-3xl ${numberClass}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {display}
          </span>
          {!finished && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {mode === "down" ? "Rest" : "Elapsed"}
            </span>
          )}
          {finished && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">
              Rest over
            </span>
          )}

          {/* +/- time while counting */}
          {counting && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => addTime(-15)}
                aria-label="Subtract 15 seconds"
                className="flex h-11 min-w-11 items-center justify-center border-2 border-foreground px-2 font-mono text-[11px] font-bold hover:bg-muted"
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => addTime(15)}
                aria-label="Add 15 seconds"
                className="flex h-11 min-w-11 items-center justify-center border-2 border-foreground px-2 font-mono text-[11px] font-bold hover:bg-muted"
              >
                +15
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
          {/* AUTO toggle */}
          <button
            type="button"
            onClick={() => setAuto((a) => !a)}
            aria-label={auto ? "Auto rest on" : "Auto rest off"}
            title="Auto-start rest after each set"
            className={`flex h-11 items-center gap-1 border-2 border-foreground px-2 text-[10px] font-bold uppercase tracking-wide ${
              auto
                ? "bg-signal text-signal-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            <Zap className="h-3 w-3" />
            Auto
          </button>

          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => startCountdown(preset.seconds)}
              aria-label={`${preset.label} rest`}
              className={`flex h-11 min-w-11 items-center justify-center border-2 border-foreground px-2 font-mono text-[11px] font-bold ${
                counting && countdownFrom === preset.seconds
                  ? "bg-foreground text-background"
                  : "hover:bg-muted"
              }`}
            >
              {preset.label}
            </button>
          ))}

          {running ? (
            <button
              type="button"
              onClick={reset}
              aria-label="Skip rest"
              className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          ) : seconds > 0 ? (
            <button
              type="button"
              onClick={reset}
              aria-label="Reset timer"
              className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-foreground hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggle}
              aria-label="Start stopwatch"
              className="flex h-11 items-center border-2 border-foreground px-3 text-[11px] font-bold uppercase hover:bg-muted"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
