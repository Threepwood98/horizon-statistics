"use client";

import { useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "lucide-react";

import { type ShiftParam } from "@/lib/shift";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TurnoSwitchProps {
  turno: ShiftParam;
  date: string;
}

export function TurnoSwitch({ turno, date }: TurnoSwitchProps) {
  const router = useRouter();

  const go = (value: ShiftParam) =>
    router.push(`/reportes?date=${date}&turno=${value}`);

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-secondary-foreground/5 p-1">
      <Button
        type="button"
        variant={turno === "manana" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "gap-1.5 rounded-full px-3",
          turno !== "manana" && "text-muted-foreground",
        )}
        onClick={() => go("manana")}
      >
        <SunIcon />
        Mañana
      </Button>
      <Button
        type="button"
        variant={turno === "tarde" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "gap-1.5 rounded-full px-3",
          turno !== "tarde" && "text-muted-foreground",
        )}
        onClick={() => go("tarde")}
      >
        <MoonIcon />
        Tarde
      </Button>
    </div>
  );
}