"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReportForm, type SiteOption } from "@/components/reportes/report-form";
import { type Shift, shiftLabel } from "@/lib/shift";

interface ReportDialogProps {
  sites: SiteOption[];
  date: string;
  shift: Shift;
  rangeLabel: string;
}

export function ReportDialog({
  sites,
  date,
  shift,
  rangeLabel,
}: ReportDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon />
            Nuevo reporte
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar reporte</DialogTitle>
          <DialogDescription>
            {rangeLabel} · Turno {shiftLabel(shift)} · Si cargás el mismo sitio
            varias veces en el mismo turno, los montos se suman.
          </DialogDescription>
        </DialogHeader>
        <ReportForm
          sites={sites}
          date={date}
          shift={shift}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
