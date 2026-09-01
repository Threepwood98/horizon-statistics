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
  balance: number;
}

interface BalanceProps {
  accounts: BalanceRow[];
  teamName: string;
  className?: string;
}

export function Balance({ accounts, teamName, className }: BalanceProps) {
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <WalletIcon />
          Saldos de {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay saldos registrados para este equipo.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sitio</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.site}>
                  <TableCell className="font-medium">{a.site}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(a.balance)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatMoney(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
