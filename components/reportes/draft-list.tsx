"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SendIcon, TrashIcon } from "lucide-react";

import { deleteDraft, sendPart } from "@/lib/actions/reportes";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DraftRow {
  id: number;
  site: string;
  amount: number;
  rejectionNote?: string | null;
}

interface DraftListProps {
  drafts: DraftRow[];
  date: string;
  showRejection?: boolean;
  hideSend?: boolean;
}

export function DraftList({
  drafts,
  date,
  showRejection,
  hideSend,
}: DraftListProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [isPending, startTransition] = useTransition();

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
      const result = await sendPart(date);
      setBusy(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const totalAmount = drafts.reduce((s, d) => s + d.amount, 0);

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          No hay reportes para este día.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar borrador de ${d.site}`}
                    disabled={busy}
                    onClick={() => remove(d.id)}
                  >
                    <TrashIcon />
                  </Button>
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

      {!hideSend && (
        <Button
          type="button"
          onClick={send}
          disabled={busy || isPending || drafts.length === 0}
          className="w-full sm:w-fit self-end"
        >
          <SendIcon />
          {isPending ? "Enviando…" : "Enviar"}
        </Button>
      )}
    </div>
  );
}
