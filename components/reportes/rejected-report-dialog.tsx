"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangleIcon, PencilIcon, SendIcon } from "lucide-react";

import { resendRectified } from "@/lib/actions/reportes";
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
import { Spinner } from "@/components/ui/spinner";
import { ReportForm } from "@/components/reportes/report-form";

interface RejectedRow {
  id: number;
  websiteId: number;
  site: string;
  amount: number;
  rejectionNote: string | null;
  marked: boolean;
  originalAmount: number | null;
  originalSite: string | null;
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
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editingReport = rows.find((r) => r.id === editingId) ?? null;
  const close = () => setEditingId(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay reportes rechazados para este día.
      </p>
    );
  }

  const markedRows = rows.filter((r) => r.marked);
  const rowChanged = (r: RejectedRow) =>
    (r.originalAmount !== null && r.amount !== r.originalAmount) ||
    (r.originalSite !== null && r.site !== r.originalSite);
  const allMarkedFixed = markedRows.every(rowChanged);
  const canResend = markedRows.length === 0 || allMarkedFixed;

  const reason = rows[0]?.rejectionNote ?? "";

  const resend = () => {
    setError(null);
    startTransition(async () => {
      const result = await resendRectified(
        date,
        markedRows.map((r) => r.id),
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const resendHint =
    markedRows.length > 0 && !allMarkedFixed
      ? "Corrige las filas marcadas para habilitar el reenvío."
      : "";

  return (
    <div className="flex flex-col gap-2">
      {reason && <p className="text-destructive">{reason}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full font-semibold">Sitio</TableHead>
            <TableHead className="text-right font-semibold">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const siteChanged =
              r.originalSite != null && r.originalSite !== r.site;
            const amountChanged =
              r.originalAmount != null && r.amount !== r.originalAmount;
            const changed = siteChanged || amountChanged;

            return (
              <TableRow
                key={r.id}
                className={r.marked && !changed ? "bg-destructive/5" : ""}
              >
                <TableCell className={"font-medium flex items-center gap-4"}>
                  {siteChanged ? (
                    <div>
                      {r.site}
                      <span className="text-destructive line-through ml-4">
                        {r.originalSite}
                      </span>
                    </div>
                  ) : (
                    `${r.site}`
                  )}
                  {r.marked && !changed && (
                    <AlertTriangleIcon className="text-destructive size-4" />
                  )}
                </TableCell>
                <TableCell className={`text-right tabular-nums font-medium`}>
                  {r.originalAmount != null &&
                  r.originalAmount !== r.amount &&
                  amountChanged ? (
                    <div>
                      <span className="text-destructive line-through mr-4">
                        {formatMoney(r.originalAmount)}
                      </span>
                      {formatMoney(r.amount)}
                    </div>
                  ) : (
                    formatMoney(r.amount)
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar reporte rechazado de ${r.site}`}
                    disabled={isPending}
                    onClick={() => setEditingId(r.id)}
                  >
                    <PencilIcon />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {resendHint && <p className="text-sm text-amber-600">{resendHint}</p>}

      <Button
        type="button"
        className="w-full sm:w-fit self-end"
        disabled={isPending || !canResend}
        onClick={resend}
      >
        {isPending ? <Spinner /> : <SendIcon />}
        {isPending ? "Reenviando…" : " Reenviar"}
      </Button>

      <Dialog open={editingReport != null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar reporte rechazado</DialogTitle>
            <DialogDescription>
              {editingReport && editingReport.rejectionNote
                ? `Motivo del rechazo: ${editingReport.rejectionNote}`
                : "Corregí los valores y guardá los cambios."}
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
    </div>
  );
}
