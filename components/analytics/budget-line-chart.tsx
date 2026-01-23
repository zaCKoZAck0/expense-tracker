"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A multiple line chart";

interface BudgetLineChartProps {
  data: {
    month: string;
    budget: number;
    spend: number;
  }[];
}

const chartConfig = {
  budget: {
    label: "Budget",
    // Use secondary color for budget line
    color: "var(--foreground)",
  },
  spend: {
    label: "Spend",
    // Use primary color for expenses line
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function BudgetLineChart({ data }: BudgetLineChartProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Budget vs Spend</CardTitle>
        <CardDescription>Last 6 months comparison</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full max-h-[350px]"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="budget"
              type="monotone"
              stroke="var(--color-budget)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="spend"
              type="monotone"
              stroke="var(--color-spend)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
