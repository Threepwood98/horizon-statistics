"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LockIcon,
  PencilIcon,
  SendIcon,
  TrashIcon,
} from "lucide-react";

import { closeShift, deleteDraft, sendPart } from "@/lib/actions/reportes";
import { formatLongDate, formatMoney } from "@/lib/format";
import { type Shift, shiftLabel } from "@/lib/shift";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportForm, type SiteOption } from "@/components/reportes/report-form";
import { Spinner } from "@/components/ui/spinner";

interface DraftRow {
  id: number;
  websiteId: number | null;
  site: string;
  amount: number;
  rejectionNote?: string | null;
}

interface DraftListProps {
  drafts: DraftRow[];
  date: string;
  shift: Shift;
  closed: boolean;
  sites: SiteOption[];
  showRejection?: boolean;
  hideSend?: boolean;
}

export function DraftList({
  drafts,
  date,
  shift,
  closed,
  sites,
  showRejection,
  hideSend,
}: DraftListProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const [closePending, setClosePending] = React.useState(false);
  const [editing, setEditing] = React.useState<DraftRow | null>(null);

  const remove = (id: number) => {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const result = await deleteDraft(id);
      setBusy(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const send = () => {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const result = await sendPart(date, shift);
      setBusy(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const close = () => {
    setError(null);
    setClosePending(true);
    startTransition(async () => {
      const result = await closeShift(date, shift);
      setClosePending(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const totalAmount = drafts.reduce((s, d) => s + d.amount, 0);
  const turnoLabel = shiftLabel(shift);
  const actionsDisabled = busy || closed;

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          No hay reportes para este turno.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {closed && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <LockIcon className="size-4" /> Turno cerrado
          </p>
        )}
        {!closed && !hideSend && (
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={closePending}
            className="w-full sm:w-fit self-end"
          >
            {closePending ? <Spinner /> : <LockIcon />}
            {closePending ? "Cerrando…" : `Cerrar turno ${turnoLabel}`}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Sitio</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.map((d) => (
            <React.Fragment key={d.id}>
              <TableRow>
                <TableCell className="font-medium">{d.site}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatMoney(d.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar borrador de ${d.site}`}
                      disabled={actionsDisabled}
                      onClick={() => setEditing(d)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Eliminar borrador de ${d.site}`}
                      disabled={actionsDisabled}
                      onClick={() => remove(d.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {showRejection && d.rejectionNote && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-sm text-destructive whitespace-pre-wrap"
                  >
                    Motivo: {d.rejectionNote}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
          <TableRow>
            <TableCell className="font-semibold w-full text-right">
              Total:
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {formatMoney(totalAmount)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {closed ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <LockIcon className="size-4" /> Turno cerrado el {formatLongDate(date)}
        </p>
      ) : (
        !hideSend && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={busy || closePending}
            >
              {closePending ? <Spinner /> : <LockIcon />}
              {closePending ? "Cerrando…" : `Cerrar turno ${turnoLabel}`}
            </Button>
            <Button
              type="button"
              onClick={send}
              disabled={busy || isPending || drafts.length === 0}
            >
              <SendIcon />
              {isPending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        )
      )}

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar reporte parcial</DialogTitle>
            <DialogDescription>
              {editing?.site ?? ""} · Turno {turnoLabel}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <ReportForm
              sites={sites}
              date={date}
              shift={shift}
              reportId={editing.id}
              initial={{
                websiteId: editing.websiteId ?? 0,
                amount: editing.amount,
              }}
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}