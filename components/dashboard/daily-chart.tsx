"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatMoney } from "@/lib/format";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface DailyChartProps {
  data: { day: string; total: number }[];
  rangeLabel: string;
}

const chartConfig = {
  total: {
    label: "Ganancia",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DailyChart({ data, rangeLabel }: DailyChartProps) {
  const max = Math.max(...data.map((d) => d.total));
  const bestDay =
    data.length > 0
      ? data.reduce((best, d) => (d.total > best.total ? d : best))
      : { day: "-", total: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ganancia general</CardTitle>
        <CardDescription className="capitalize">{rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <LineChart data={data} margin={{ right: 8, top: 8 }}>
            <CartesianGrid />
            <XAxis
              dataKey="day"
              interval={Math.floor(data.length / 6)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, max]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatMoney(Number(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-total)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-end gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Mejor día: {bestDay.day}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Ganancia: {formatMoney(bestDay.total)} · {rangeLabel}
        </div>
      </CardFooter>
    </Card>
  );
}
