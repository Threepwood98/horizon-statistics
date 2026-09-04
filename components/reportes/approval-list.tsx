"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";

import { acceptReport, rejectReport } from "@/lib/actions/reportes";
import { formatLongDate, formatMoney } from "@/lib/format";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  originalSite: string | null;
  amount: number;
  originalAmount: number | null;
  rectified: boolean;
}

interface ApprovalGroup {
  id: number;
  reportIds: number[];
  userName: string;
  dateKey: string;
  rectified: boolean;
  rows: ApprovalRow[];
}

interface TeamGroup {
  id: string;
  teamName: string;
  subtotal: number;
  groups: ApprovalGroup[];
}

interface ApprovalListProps {
  teams: TeamGroup[];
  canManage: boolean;
}

export function ApprovalList({ teams, canManage }: ApprovalListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<number | null>(null);
  const [note, setNote] = React.useState("");
  const [checkedReportIds, setCheckedReportIds] = React.useState<number[]>([]);

  const rejectingGroup =
    teams.flatMap((t) => t.groups).find((g) => g.id === rejecting) ?? null;

  const close = () => {
    setRejecting(null);
    setNote("");
    setCheckedReportIds([]);
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
      const firstId = group.reportIds[0];
      const result = await rejectReport(
        firstId,
        note,
        checkedReportIds,
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  };

  const toggleChecked = (reportId: number) => {
    setCheckedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId],
    );
  };

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay partes pendientes de aprobación.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Accordion>
        {teams.map((team) => (
          <AccordionItem key={team.id} value={team.id}>
            <AccordionHeader>
              <AccordionTrigger className="flex flex-wrap gap-x-2 text-sm">
                <span className="font-semibold">{team.teamName}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  Total {formatMoney(team.subtotal)}
                </span>
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              <Accordion>
                {team.groups.map((group) => {
                  const totalAmount = group.rows.reduce((s, r) => s + r.amount, 0);

                  return (
                    <AccordionItem key={group.id} value={String(group.id)}>
                      <AccordionHeader>
                        <AccordionTrigger className="flex flex-wrap gap-x-2 text-sm">
                          <span className="font-semibold">{group.userName}</span>
                          {group.rectified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                              <RotateCcwIcon className="size-3" />
                              Rectificado
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {formatLongDate(group.dateKey)}
                          </span>
                          <span className="ml-auto font-semibold tabular-nums">
                            Total {formatMoney(totalAmount)}
                          </span>
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sitio</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((r) => {
                        const siteChanged =
                          r.originalSite != null && r.originalSite !== r.site;
                        const amountChanged =
                          r.originalAmount != null && r.originalAmount !== r.amount;
                        return (
                          <TableRow key={r.site + r.originalSite}>
                            <TableCell
                              className={`font-medium ${
                                siteChanged ? "text-amber-600" : ""
                              }`}
                            >
                              {siteChanged
                                ? `${r.originalSite} → ${r.site}`
                                : r.site}
                            </TableCell>
                            <TableCell
                              className={`text-right tabular-nums font-medium ${
                                amountChanged ? "text-amber-600" : ""
                              }`}
                            >
                              {amountChanged
                                ? `${formatMoney(r.originalAmount!)} → ${formatMoney(
                                    r.amount,
                                  )}`
                                : formatMoney(r.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatMoney(totalAmount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {canManage && (
                  <div className="mt-3 flex items-center gap-2">
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

                <Dialog
                  open={rejectingGroup?.id === group.id}
                  onOpenChange={(open) =>
                    open ? setRejecting(group.id) : close()
                  }
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Rechazar parte</DialogTitle>
                      <DialogDescription>
                        <p>
                          Indicá el motivo y marcá las filas que tienen el error.
                          El reporte volverá al trabajador para que lo corrija.
                        </p>
                      </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead className="w-full">Sitio</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.rows.map((r, idx) => {
                            const reportId = group.reportIds[idx];
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Checkbox
                                    checked={checkedReportIds.includes(reportId)}
                                    onCheckedChange={() =>
                                      toggleChecked(reportId)
                                    }
                                    aria-label={`Marcar ${r.site}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {r.site}
                                </TableCell>
                                <TableCell className="text-right tabular-nums font-medium">
                                  {formatMoney(r.amount)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

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
                        disabled={isPending || note.trim() === "" || checkedReportIds.length === 0}
                        onClick={() => reject(group)}
                      >
                        {isPending ? <Spinner /> : <XIcon />}
                        Rechazar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </AccordionContent>
            </AccordionItem>
          );
        })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
