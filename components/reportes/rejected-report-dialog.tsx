"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangleIcon, PencilIcon, SendIcon } from "lucide-react";

import { resendRectified } from "@/lib/actions/reportes";
import { formatLongDate, formatMoney } from "@/lib/format";
import {
  RangeSelector,
  type RangeKey,
} from "@/components/dashboard/range-selector";
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
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ReportForm } from "@/components/reportes/report-form";
import { cn } from "@/lib/utils";

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

export interface RejectedGroup {
  id: string;
  userName: string;
  teamName: string;
  dateKey: string;
  totalAmount: number;
  rows: RejectedRow[];
}

interface RejectedReportDialogProps {
  groups: RejectedGroup[];
  sites: { id: number; name: string; balanceInicio: number }[];
  showName: boolean;
  range: RangeKey;
  from?: string;
  to?: string;
  prefix?: string;
}

export function RejectedReportDialog({
  groups,
  sites,
  showName,
  range,
  from,
  to,
  prefix,
}: RejectedReportDialogProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<{
    row: RejectedRow;
    dateKey: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const resend = (group: RejectedGroup) => {
    setError(null);
    setPendingId(group.id);
    startTransition(async () => {
      const result = await resendRectified(
        group.dateKey,
        group.rows.filter((r) => r.marked).map((r) => r.id),
      );
      setPendingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <RangeSelector range={range} from={from} to={to} prefix={prefix} />

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay reportes rechazados en el rango seleccionado.
        </p>
      ) : (
        <Accordion>
          {groups.map((group) => {
            const reason = group.rows[0]?.rejectionNote ?? "";
            const markedRows = group.rows.filter((r) => r.marked);
            const rowChanged = (r: RejectedRow) =>
              (r.originalAmount !== null && r.amount !== r.originalAmount) ||
              (r.originalSite !== null && r.site !== r.originalSite);
            const allMarkedFixed = markedRows.every(rowChanged);
            const canResend = markedRows.length === 0 || allMarkedFixed;
            const resendHint =
              markedRows.length > 0 && !allMarkedFixed
                ? "Corrige las filas marcadas para habilitar el reenvío."
                : "";

            return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionHeader>
                  <AccordionTrigger className="flex flex-wrap gap-x-2 text-sm">
                    {showName && (
                      <span className="font-semibold">{group.userName}</span>
                    )}
                    <span>{group.teamName}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {formatLongDate(group.dateKey)}
                    </span>
                    <span className="ml-auto font-semibold tabular-nums">
                      Total {formatMoney(group.totalAmount)}
                    </span>
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <div className="flex flex-col gap-2">
                    {reason && (
                      <p className="text-sm">
                        <span className="font-semibold text-destructive">
                          Motivo del rechazo:{" "}
                        </span>
                        {reason}
                      </p>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead />
                          <TableHead className="font-semibold">Sitio</TableHead>
                          <TableCell />
                          <TableCell />
                          <TableHead className="text-right font-semibold">
                            Monto
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((r) => {
                          const siteChanged =
                            r.originalSite != null && r.originalSite !== r.site;
                          const amountChanged =
                            r.originalAmount != null &&
                            r.amount !== r.originalAmount;
                          const changed = siteChanged || amountChanged;

                          return (
                            <TableRow
                              key={r.id}
                              className={cn(
                                "font-medium",
                                r.marked && !changed && "bg-destructive/10",
                              )}
                            >
                              <TableCell>
                                {r.marked && !changed && (
                                  <AlertTriangleIcon className="size-4 text-destructive" />
                                )}
                              </TableCell>
                              <TableCell>{r.site}</TableCell>
                              <TableCell className="text-destructive line-through w-full">
                                {siteChanged ? r.originalSite : ""}
                              </TableCell>
                              <TableCell className="text-right text-destructive line-through">
                                {amountChanged
                                  ? formatMoney(r.originalAmount!)
                                  : ""}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoney(r.amount)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Editar reporte rechazado de ${r.site}`}
                                  disabled={isPending}
                                  onClick={() =>
                                    setEditing({
                                      row: r,
                                      dateKey: group.dateKey,
                                    })
                                  }
                                >
                                  <PencilIcon />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {resendHint && (
                      <p className="text-sm text-amber-600">{resendHint}</p>
                    )}

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button
                      type="button"
                      className="self-end w-full sm:w-fit"
                      disabled={isPending || !canResend}
                      onClick={() => resend(group)}
                    >
                      {isPending && pendingId === group.id ? (
                        <Spinner />
                      ) : (
                        <SendIcon />
                      )}
                      {isPending && pendingId === group.id
                        ? "Reenviando…"
                        : " Reenviar"}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Dialog
        open={editing != null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar reporte rechazado</DialogTitle>
            <DialogDescription>
              {editing?.row.rejectionNote
                ? `Motivo del rechazo: ${editing.row.rejectionNote}`
                : "Corregí los valores y guardá los cambios."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <ReportForm
              sites={sites}
              date={editing.dateKey}
              reportId={editing.row.id}
              initial={{
                websiteId: editing.row.websiteId,
                amount: editing.row.amount,
              }}
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
