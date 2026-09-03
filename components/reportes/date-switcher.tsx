"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDownIcon, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function keyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateSwitcher({ value }: { value: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const selected = dateFromKey(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="justify-between font-normal text-left"
            aria-label="Fecha del parte"
          >
            <span className="flex items-center gap-2">
              <CalendarIcon />
              {format(selected, "d MMM yyyy", { locale: es })}
            </span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ after: new Date() }}
          locale={es}
          onSelect={(date) => {
            if (date) {
              router.push(`/reportes?date=${keyFromDate(date)}`);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}