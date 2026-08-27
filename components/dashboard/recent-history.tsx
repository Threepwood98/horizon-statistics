import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HistoryEntry {
  date: string;
  site: string;
  worker: string;
  startAmount: number;
  endAmount: number;
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
          <TableHead className="text-right">Inicio</TableHead>
          <TableHead className="text-right">Final</TableHead>
          <TableHead className="text-right">Ganancia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, i) => (
          <TableRow key={i}>
            <TableCell className="font-mono text-xs">{entry.date}</TableCell>
            <TableCell>{entry.site}</TableCell>
            <TableCell>{entry.worker}</TableCell>
            <TableCell className="text-right font-mono text-xs">
              ${entry.startAmount.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs">
              ${entry.endAmount.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-xs font-bold text-primary">
              ${(entry.endAmount - entry.startAmount).toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
