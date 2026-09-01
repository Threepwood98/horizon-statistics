"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckIcon, XIcon } from "lucide-react";

import { acceptReport, rejectReport } from "@/lib/actions/reportes";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApprovalRow {
  site: string;
  start: number;
  end: number;
}

interface ApprovalGroup {
  id: number;
  reportIds: number[];
  userName: string;
  dateLabel: string;
  rows: ApprovalRow[];
}

interface ApprovalListProps {
  groups: ApprovalGroup[];
  canManage: boolean;
}

export function ApprovalList({ groups, canManage }: ApprovalListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<number | null>(null);
  const [note, setNote] = React.useState("");

  const close = () => {
    setRejecting(null);
    setNote("");
    setError(null);
  };

  const accept = (group: ApprovalGroup) => {
    setError(null);
    startTransition(async () => {
      for (const id of group.reportIds) {
        const result = await acceptReport(id);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }
      router.refresh();
    });
  };

  const reject = (group: ApprovalGroup) => {
    setError(null);
    startTransition(async () => {
      for (const id of group.reportIds) {
        const result = await rejectReport(id, note);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }
      close();
      router.refresh();
    });
  };

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay partes pendientes de aprobación.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {groups.map((group) => {
        const totalStart = group.rows.reduce((s, r) => s + r.start, 0);
        const totalEnd = group.rows.reduce((s, r) => s + r.end, 0);
        const totalGain = totalEnd - totalStart;

        return (
          <div
            key={group.id}
            className="rounded-lg border p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{group.userName}</p>
                <p className="text-sm text-muted-foreground">{group.dateLabel}</p>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => accept(group)}
                  >
                    {isPending ? <Spinner /> : <CheckIcon />}
                    Aceptar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setRejecting(group.id)}
                  >
                    <XIcon />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sitio</TableHead>
                    <TableHead className="text-right">Inicio</TableHead>
                    <TableHead className="text-right">Final</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((r) => (
                    <TableRow key={r.site}>
                      <TableCell className="font-medium">{r.site}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(r.start)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(r.end)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatMoney(r.end - r.start)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(totalStart)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(totalEnd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatMoney(totalGain)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Dialog
              open={rejecting === group.id}
              onOpenChange={(open) => (open ? setRejecting(group.id) : close())}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rechazar parte</DialogTitle>
                  <DialogDescription>
                    Indicá el motivo. El reporte volverá al trabajador para que
                    lo corrija.
                  </DialogDescription>
                </DialogHeader>
                <Field>
                  <FieldLabel htmlFor="reject-note">Motivo</FieldLabel>
                  <Textarea
                    id="reject-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Describí qué está mal..."
                    rows={3}
                  />
                </Field>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={close}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending || note.trim() === ""}
                    onClick={() => reject(group)}
                  >
                    {isPending ? <Spinner /> : <XIcon />}
                    Rechazar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      })}
    </div>
  );
}
