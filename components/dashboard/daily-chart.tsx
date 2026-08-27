"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface DailyChartProps {
  data: { day: string; total: number }[];
}

const chartConfig = {
  total: {
    label: "Ganancia",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DailyChart({ data }: DailyChartProps) {
  const max = Math.max(...data.map((d) => d.total));

  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <LineChart data={data} margin={{ right: 8, top: 8 }}>
        <CartesianGrid />
        <XAxis
          dataKey="day"
          interval={Math.floor(data.length / 6)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          // tick={{ fontSize: 10 }}
        />
        <YAxis
          domain={[0, max]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          // tick={{ fontSize: 10 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
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
  );
}
