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
  amount: number;
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
  const totalAmount = reports.reduce((s, r) => s + r.amount, 0);

  const TitleIcon = accepted ? CheckCircle2Icon : ClockIcon;
  const title = accepted ? "Parte aceptado" : "Parte enviado";

  const content = (
    <>
      {showHeader && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <p>
            Fecha: <span className="font-medium">{formatFullDate(date)}</span>
          </p>
          {teamName && (
            <p>
              Equipo: <span className="font-medium">{teamName}</span>
            </p>
          )}
          {workerName && (
            <p>
              Trabajador: <span className="font-medium">{workerName}</span>
            </p>
          )}
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {accepted
            ? "Todavía no hay partes aceptados para este día."
            : "Todavía no enviaste el parte de este día."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Sitio</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.site}>
                <TableCell className="font-medium">{r.site}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatMoney(r.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-semibold w-full text-right">
                Total:
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatMoney(totalAmount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
