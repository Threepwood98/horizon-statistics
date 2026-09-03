import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";

interface HistoryEntry {
  date: string;
  site: string;
  worker: string;
  amount: number;
}

interface RecentHistoryProps {
  data: HistoryEntry[];
}

export function RecentHistory({ data }: RecentHistoryProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Sitio</TableHead>
          <TableHead>Trabajador</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, i) => (
          <TableRow key={i}>
            <TableCell className="font-mono text-xs">{entry.date}</TableCell>
            <TableCell>{entry.site}</TableCell>
            <TableCell>{entry.worker}</TableCell>
            <TableCell className="text-right font-mono text-xs font-bold text-primary">
              {formatMoney(entry.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
