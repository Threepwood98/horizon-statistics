"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type RangeKey = "week" | "month" | "custom";

interface RangeSelectorProps {
  range: RangeKey;
  from?: string;
  to?: string;
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
}

export function RangeSelector({ range, from, to }: RangeSelectorProps) {
  const router = useRouter();
  const [active, setActive] = React.useState<RangeKey>(range);
  const [fromValue, setFromValue] = React.useState(from ?? "");
  const [toValue, setToValue] = React.useState(to ?? "");

  React.useEffect(() => {
    setActive(range);
    setFromValue(from ?? "");
    setToValue(to ?? "");
  }, [range, from, to]);

  const route = (nextRange: RangeKey, nextFrom?: string, nextTo?: string) => {
    const params = new URLSearchParams();
    params.set("range", nextRange);
    if (nextRange === "custom" && nextFrom && nextTo) {
      params.set("from", nextFrom);
      params.set("to", nextTo);
    }
    router.replace(`?${params.toString()}`);
  };

  const canApply = Boolean(
    fromValue &&
      toValue &&
      fromValue <= toValue &&
      fromValue <= todayISO(),
  );

  const handleChange = (values: string[]) => {
    const selection = values.at(-1) as RangeKey | undefined;
    if (!selection || selection === active) return;
    if (selection === "custom") {
      setActive("custom");
      return;
    }
    setActive(selection);
    route(selection);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <ToggleGroup
        value={[active]}
        onValueChange={handleChange}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="week">Semana</ToggleGroupItem>
        <ToggleGroupItem value="month">Mes</ToggleGroupItem>
        <ToggleGroupItem value="custom">Personalizado</ToggleGroupItem>
      </ToggleGroup>

      {active === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="range-from" className="text-xs text-muted-foreground">
              Desde
            </label>
            <Input
              id="range-from"
              type="date"
              max={toValue || todayISO()}
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="range-to" className="text-xs text-muted-foreground">
              Hasta
            </label>
            <Input
              id="range-to"
              type="date"
              min={fromValue || undefined}
              max={todayISO()}
              value={toValue}
              onChange={(e) => setToValue(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!canApply}
            onClick={() => route("custom", fromValue, toValue)}
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}