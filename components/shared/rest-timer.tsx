"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Timer, RotateCcw, X, Zap } from "lucide-react";

const PRESETS = [
  { label: "1:30", seconds: 90 },
  { label: "2:00", seconds: 120 },
  { label: "3:00", seconds: 180 },
];

const DEFAULT_REST = 120;

export function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"up" | "down">("up");
  const [countdownFrom, setCountdownFrom] = useState(0);
  const [finished, setFinished] = useState(false);
  const [auto, setAuto] = useState(true);
  // Remember the last rest length chosen, used for auto-start.
  const restLenRef = useRef(DEFAULT_REST);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (mode === "down") {
          if (s <= 1) {
            setRunning(false);
            setFinished(true);
            return 0;
          }
          return s - 1;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, mode]);

  useEffect(() => {
    if (!finished) return;
    const timeout = setTimeout(() => setFinished(false), 5000);
    return () => clearTimeout(timeout);
  }, [finished]);

  const startCountdown = useCallback((presetSeconds: number) => {
    restLenRef.current = presetSeconds;
    setCountdownFrom(presetSeconds);
    setSeconds(presetSeconds);
    setMode("down");
    setFinished(false);
    setRunning(true);
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
      setSeconds(0);
      setMode("up");
      setFinished(false);
    }
    setRunning((r) => !r);
  }, [running]);

  const reset = useCallback(() => {
    setSeconds(0);
    setRunning(false);
    setFinished(false);
    setMode("up");
  }, []);

  const addTime = useCallback((delta: number) => {
    setSeconds((s) => Math.max(0, s + delta));
  }, []);

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
        className={`flex items-center gap-2 px-3 py-2 ${finished ? "animate-pulse" : ""}`}
      >
        <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span
          className={`font-mono text-2xl font-bold tabular-nums sm:text-3xl ${numberClass}`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {display}
        </span>
        {finished && (
          <span className="hidden text-[10px] font-bold uppercase tracking-wide text-destructive sm:inline">
            Rest over
          </span>
        )}

        {/* +/- time while counting */}
        {counting && (
          <div className="ml-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => addTime(-15)}
              aria-label="Subtract 15 seconds"
              className="flex h-7 items-center border-2 border-foreground px-1.5 font-mono text-[11px] font-bold hover:bg-muted"
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => addTime(15)}
              aria-label="Add 15 seconds"
              className="flex h-7 items-center border-2 border-foreground px-1.5 font-mono text-[11px] font-bold hover:bg-muted"
            >
              +15
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* AUTO toggle */}
          <button
            type="button"
            onClick={() => setAuto((a) => !a)}
            aria-label={auto ? "Auto rest on" : "Auto rest off"}
            title="Auto-start rest after each set"
            className={`flex h-7 items-center gap-1 border-2 border-foreground px-1.5 text-[10px] font-bold uppercase tracking-wide ${
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
              className={`hidden h-7 items-center border-2 border-foreground px-1.5 font-mono text-[11px] font-bold sm:flex ${
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
              className="flex h-7 w-7 items-center justify-center border-2 border-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          ) : seconds > 0 ? (
            <button
              type="button"
              onClick={reset}
              aria-label="Reset timer"
              className="flex h-7 w-7 items-center justify-center border-2 border-foreground hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggle}
              aria-label="Start stopwatch"
              className="flex h-7 items-center border-2 border-foreground px-2 text-[11px] font-bold uppercase hover:bg-muted"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
