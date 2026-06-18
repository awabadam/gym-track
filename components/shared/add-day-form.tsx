"use client";

import { useState } from "react";
import { addProgramDay } from "@/app/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const weekdays = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

function generateDayCode(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AddDayForm({ programId }: { programId: string }) {
  const [name, setName] = useState("");
  const [dayCode, setDayCode] = useState("");
  const [codeManual, setCodeManual] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!codeManual) {
      setDayCode(generateDayCode(value));
    }
  }

  function handleCodeChange(value: string) {
    setDayCode(value);
    setCodeManual(true);
  }

  return (
    <form
      action={addProgramDay.bind(null, programId)}
      className="space-y-4"
      onSubmit={() => {
        setName("");
        setDayCode("");
        setCodeManual(false);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Day name</Label>
          <Input
            name="name"
            placeholder="e.g. Upper A"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div>
          <Label>Day code</Label>
          <Input
            name="dayCode"
            placeholder="e.g. UA"
            required
            value={dayCode}
            onChange={(e) => handleCodeChange(e.target.value)}
          />
        </div>
        <div>
          <Label>Scheduled day</Label>
          <Select name="scheduledDay">
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {weekdays.map((d) => (
                <SelectItem key={d} value={d}>
                  <span className="capitalize">{d}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" size="sm">
        Add day
      </Button>
    </form>
  );
}
