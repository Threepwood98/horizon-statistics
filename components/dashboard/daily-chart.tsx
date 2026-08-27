"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, ReferenceLine } from "recharts";

interface DailyChartProps {
  data: { day: string; total: number }[];
  average: number;
}

const chartConfig = {
  total: {
    label: "Ganancia",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DailyChart({ data, average }: DailyChartProps) {
  return (
    <div className="w-full">
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ReferenceLine
            y={average}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
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
      <p className="mt-2 text-right text-xs text-muted-foreground">
        Línea punteada = promedio (${average.toFixed(2)})
      </p>
    </div>
  );
}
