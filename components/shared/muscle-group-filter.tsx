"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

export function MuscleGroupFilter({ groups }: { groups: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("muscle") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("muscle");
    } else {
      params.set("muscle", value);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={current || "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-[180px] h-9">
        <SelectValue placeholder="All muscles" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All muscles</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g} value={g}>
            <span className="capitalize">{g}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
