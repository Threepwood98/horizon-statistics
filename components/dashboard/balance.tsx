import { WalletIcon } from "lucide-react";

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
import { cn } from "@/lib/utils";

interface BalanceRow {
  site: string;
  historic: number;
  live: number;
}

interface BalanceProps {
  balances: BalanceRow[];
  teamName: string;
  className?: string;
}

export function Balance({ balances, teamName, className }: BalanceProps) {
  const totalHistoric = balances.reduce((s, a) => s + a.historic, 0);
  const totalLive = balances.reduce((s, a) => s + a.live, 0);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <WalletIcon />
          Balances de {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay balances registrados para este equipo.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sitio</TableHead>
                <TableHead className="text-right">Saldo (aprobado)</TableHead>
                <TableHead className="text-right">En vivo hoy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((a) => (
                <TableRow key={a.site}>
                  <TableCell className="font-medium">{a.site}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(a.historic)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {Math.abs(a.live - a.historic) < 0.000001
                      ? formatMoney(a.live)
                      : formatMoney(a.live)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(totalHistoric)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatMoney(totalLive)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
