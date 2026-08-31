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
  start: number;
  end: number;
}

interface DraftListProps {
  drafts: DraftRow[];
  date: string;
}

export function DraftList({ drafts, date }: DraftListProps) {
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

  const totalStart = drafts.reduce((s, d) => s + d.start, 0);
  const totalEnd = drafts.reduce((s, d) => s + d.end, 0);
  const totalGain = totalEnd - totalStart;

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          No hay borradores para este día.
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
            <TableHead>Sitio</TableHead>
            <TableHead className="text-right">Inicio</TableHead>
            <TableHead className="text-right">Final</TableHead>
            <TableHead className="text-right">Ganancia</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.site}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(d.start)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(d.end)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatMoney(d.end - d.start)}
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
          ))}
          <TableRow>
            <TableCell className="font-medium">Total</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(totalStart)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(totalEnd)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {formatMoney(totalGain)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        onClick={send}
        disabled={busy || isPending || drafts.length === 0}
        className="w-full sm:w-fit self-end"
      >
        <SendIcon />
        {isPending ? "Enviando…" : "Enviar parte completo"}
      </Button>
    </div>
  );
}