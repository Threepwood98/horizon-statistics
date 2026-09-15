"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReportForm } from "@/components/reportes/report-form";
import type { SiteOption } from "@/lib/reports-shapes";
import { type Shift } from "@/lib/shift";

interface ReportDialogProps {
  sites: SiteOption[];
  date: string;
  shift: Shift;
}

export function ReportDialog({ sites, date, shift }: ReportDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="icon-lg" className="rounded-full">
            <PlusIcon />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar importe</DialogTitle>
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
