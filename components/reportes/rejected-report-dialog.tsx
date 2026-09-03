"use client";

import * as React from "react";
import { PencilIcon } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportForm } from "@/components/reportes/report-form";

interface RejectedRow {
  id: number;
  websiteId: number;
  site: string;
  amount: number;
  rejectionNote?: string | null;
}

interface RejectedReportDialogProps {
  rows: RejectedRow[];
  sites: { id: number; name: string; balanceInicio: number }[];
  date: string;
}

export function RejectedReportDialog({
  rows,
  sites,
  date,
}: RejectedReportDialogProps) {
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const editingReport = rows.find((r) => r.id === editingId) ?? null;

  const close = () => setEditingId(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay reportes rechazados para este día.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Sitio</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.site}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatMoney(r.amount)}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar reporte rechazado de ${r.site}`}
                  onClick={() => setEditingId(r.id)}
                >
                  <PencilIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editingReport != null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar reporte rechazado</DialogTitle>
            <DialogDescription>
              {editingReport && (
                <>
                  Sitio: <span className="font-medium">{editingReport.site}</span>
                  {editingReport.rejectionNote && (
                    <>
                      <br />
                      Motivo del rechazo:{" "}
                      <span className="text-destructive font-medium">
                        {editingReport.rejectionNote}
                      </span>
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {editingReport && (
            <ReportForm
              sites={sites}
              date={date}
              reportId={editingReport.id}
              initial={{
                websiteId: editingReport.websiteId,
                amount: editingReport.amount,
              }}
              onSuccess={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}