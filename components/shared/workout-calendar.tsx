"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

interface Session {
  id: string;
  date: string;
  status: string;
  dayName: string;
  dayCode: string;
}

interface WorkoutCalendarProps {
  sessions: Session[];
  initialYear: number;
  initialMonth: number; // 0-indexed
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  // Pad trailing
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function WorkoutCalendar({
  sessions,
  initialYear,
  initialMonth,
}: WorkoutCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);

  // Index sessions by date string
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const existing = map.get(s.date) ?? [];
      existing.push(s);
      map.set(s.date, existing);
    }
    return map;
  }, [sessions]);

  const todayStr = new Date().toISOString().split("T")[0];

  function prev() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function next() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={prev} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={next} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const daySessions = sessionsByDate.get(dateStr);
          const isToday = dateStr === todayStr;
          const hasCompleted = daySessions?.some((s) => s.status === "completed");
          const hasInProgress = daySessions?.some((s) => s.status === "in_progress");

          const cell = (
            <div
              className={`
                aspect-square flex flex-col items-center justify-center relative text-xs border-2
                ${isToday ? "border-foreground" : "border-transparent"}
                ${hasCompleted ? "bg-foreground text-background" : ""}
                ${hasInProgress && !hasCompleted ? "bg-signal text-signal-foreground" : ""}
                ${!daySessions && !isToday ? "text-muted-foreground" : ""}
              `}
            >
              <span className={`tabular-nums ${hasCompleted || isToday ? "font-bold" : ""}`}>
                {day}
              </span>
              {hasCompleted && (
                <Dumbbell className="h-2.5 w-2.5 mt-0.5" strokeWidth={2.5} />
              )}
              {hasInProgress && !hasCompleted && (
                <div className="h-1.5 w-1.5 bg-signal-foreground mt-0.5" />
              )}
            </div>
          );

          if (daySessions && daySessions.length > 0) {
            const firstSession = daySessions[0];
            return (
              <Tooltip key={dateStr}>
                <TooltipTrigger asChild>
                  <Link href={`/log/${firstSession.id}`}>{cell}</Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {daySessions.map((s) => (
                    <div key={s.id}>
                      {s.dayName} ({s.dayCode})
                      {s.status === "completed" ? " — done" : " — in progress"}
                    </div>
                  ))}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={dateStr}>{cell}</div>;
        })}
      </div>
    </div>
  );
}
