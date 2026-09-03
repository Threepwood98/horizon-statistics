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
import { ReportForm } from "@/components/reportes/report-form";

interface ReportDialogProps {
  sites: { id: number; name: string; balanceInicio: number }[];
  date: string;
  rangeLabel: string;
}

export function ReportDialog({
  sites,
  date,
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
            {rangeLabel} · Si cargás el mismo sitio varias veces el mismo día,
            los montos se suman.
          </DialogDescription>
        </DialogHeader>
        <ReportForm
          sites={sites}
          date={date}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
