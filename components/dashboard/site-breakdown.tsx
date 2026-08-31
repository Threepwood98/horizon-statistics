"use client";

import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

interface SiteData {
  name: string;
  total: number;
}

interface SiteBreakdownProps {
  data: SiteData[];
  rangeLabel: string;
  className?: string;
}

const chartConfig = {
  total: {
    label: "Ganancia",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function SiteBreakdown({
  data,
  rangeLabel,
  className,
}: SiteBreakdownProps) {
  const total = data.reduce((acc, site) => acc + site.total, 0);
  const bestSite = data.reduce<SiteData | null>(
    (best, site) => (best === null || site.total > best.total ? site : best),
    null,
  );

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">Ganancia por sitio</CardTitle>
        <CardDescription className="capitalize">{rangeLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="total" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  hideLabel
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4}>
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                className="fill-(--color-label)"
                fontSize={12}
              />
              <LabelList
                dataKey="total"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value) => formatMoney(Number(value))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-end gap-2 text-sm">
        {bestSite && (
          <div className="flex gap-2 leading-none font-medium">
            Mejor sitio: {bestSite.name}
            <TrendingUp className="size-4" />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
