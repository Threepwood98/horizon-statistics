import { CheckCircle2Icon, ClockIcon } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SentReportRow {
  site: string;
  start: number;
  end: number;
}

interface SentReportsProps {
  reports: SentReportRow[];
  workerName?: string;
  teamName?: string;
  date: string;
  accepted?: boolean;
  showHeader?: boolean;
}

function formatFullDate(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function SentReports({
  reports,
  workerName,
  teamName,
  date,
  accepted = false,
  showHeader = true,
}: SentReportsProps) {
  const totalStart = reports.reduce((s, r) => s + r.start, 0);
  const totalEnd = reports.reduce((s, r) => s + r.end, 0);
  const totalGain = totalEnd - totalStart;

  const TitleIcon = accepted ? CheckCircle2Icon : ClockIcon;
  const title = accepted ? "Parte aceptado" : "Parte enviado";

  const content = (
    <>
      {showHeader && workerName && teamName && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <p>
            Fecha: <span className="font-medium">{formatFullDate(date)}</span>
          </p>
          <p>
            Equipo: <span className="font-medium">{teamName}</span>
          </p>
          <p>
            Trabajador: <span className="font-medium">{workerName}</span>
          </p>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {accepted
            ? "Todavía no hay partes aceptados para este día."
            : "Todavía no enviaste el parte de este día."}
        </p>
      ) : (
        <>
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
              {reports.map((r) => (
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
          <p className="text-sm">
            Ganancia total del día:{" "}
            <span className="font-bold">{formatMoney(totalGain)}</span>
          </p>
        </>
      )}
    </>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className={`flex items-center gap-2 text-base ${
            accepted ? "" : "text-muted-foreground"
          }`}
        >
          <TitleIcon />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{content}</CardContent>
    </Card>
  );
}
