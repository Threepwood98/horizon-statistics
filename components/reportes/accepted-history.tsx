import { CalendarDaysIcon } from "lucide-react";

import { formatLongDate, formatMoney } from "@/lib/format";
import {
  RangeSelector,
  type RangeKey,
} from "@/components/dashboard/range-selector";
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

export interface AcceptedGroup {
  id: string;
  userName: string;
  teamName: string;
  dateKey: string;
  totalAmount: number;
  sites: { site: string; amount: number }[];
}

interface AcceptedHistoryProps {
  groups: AcceptedGroup[];
  showName: boolean;
  range: RangeKey;
  from?: string;
  to?: string;
}

export function AcceptedHistory({
  groups,
  showName,
  range,
  from,
  to,
}: AcceptedHistoryProps) {
  return (
    <div className="space-y-3">
      <RangeSelector range={range} from={from} to={to} />

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay reportes aceptados en el rango seleccionado.
        </p>
      ) : (
        <Accordion>
          {groups.map((group) => (
            <AccordionItem key={group.id} value={group.id}>
              <AccordionHeader>
                <AccordionTrigger className="flex flex-wrap gap-x-2 text-sm">
                  {showName && (
                    <span className="font-semibold">{group.userName}</span>
                  )}
                  <span>{group.teamName}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    {formatLongDate(group.dateKey)}
                  </span>
                  <span className="ml-auto font-semibold tabular-nums">
                    Total {formatMoney(group.totalAmount)}
                  </span>
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-full">Sitio</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sites.map((s) => (
                      <TableRow key={s.site}>
                        <TableCell className="font-medium">{s.site}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatMoney(s.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
