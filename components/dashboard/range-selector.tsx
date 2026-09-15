"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRangeIcon, ChevronDownIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateFromKey, localDateKey } from "@/lib/range";

export type RangeKey = "week" | "month" | "custom";

interface RangeSelectorProps {
  range: RangeKey;
  from?: string;
  to?: string;
  prefix?: string;
}

function rangeFromKeys(from?: string, to?: string): DateRange | undefined {
  const fromDate = dateFromKey(from);
  const toDate = dateFromKey(to);
  if (fromDate && toDate) return { from: fromDate, to: toDate };
  return undefined;
}

function formatLabel(date: Date): string {
  return format(date, "d MMM.", { locale: es });
}

export function RangeSelector({ range, from, to, prefix = "" }: RangeSelectorProps) {
  const router = useRouter();
  const [active, setActive] = React.useState<RangeKey>(range);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    rangeFromKeys(from, to),
  );
  const [synced, setSynced] = React.useState({ range, from, to });

  if (synced.range !== range || synced.from !== from || synced.to !== to) {
    setSynced({ range, from, to });
    setActive(range);
    setDateRange(rangeFromKeys(from, to));
  }

  const route = (nextRange: RangeKey, nextFrom?: string, nextTo?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(`${prefix}range`, nextRange);
    if (nextRange === "custom" && nextFrom && nextTo) {
      params.set(`${prefix}from`, nextFrom);
      params.set(`${prefix}to`, nextTo);
    } else {
      params.delete(`${prefix}from`);
      params.delete(`${prefix}to`);
    }
    router.replace(`?${params.toString()}`);
  };

  const hasSelection = Boolean(dateRange?.from && dateRange?.to);

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

  const apply = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    route("custom", localDateKey(dateRange.from), localDateKey(dateRange.to));
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <ToggleGroup
        value={[active]}
        onValueChange={handleChange}
        variant="outline"
      >
        <ToggleGroupItem className="w-20" value="week">
          Semana
        </ToggleGroupItem>
        <ToggleGroupItem className="w-20" value="month">
          Mes
        </ToggleGroupItem>
        <ToggleGroupItem className="w-20" value="custom">
          <CalendarRangeIcon />
        </ToggleGroupItem>
      </ToggleGroup>

      {active === "custom" && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                data-empty={!dateRange || !hasSelection}
                className="justify-between font-normal text-left data-[empty=true]:text-muted-foreground"
              >
                {dateRange?.from && dateRange?.to ? (
                  `${formatLabel(dateRange.from)} – ${formatLabel(dateRange.to)}`
                ) : (
                  <span>Seleccionar rango</span>
                )}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              defaultMonth={dateRange?.from}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      )}
      {active === "custom" && (
        <Button
          className="w-20"
          type="button"
          disabled={!hasSelection}
          onClick={apply}
        >
          Aplicar
        </Button>
      )}
    </div>
  );
}
