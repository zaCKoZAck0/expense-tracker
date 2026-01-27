"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { categoryIcons, defaultCategoryIcon } from "@/lib/constants";

interface CategoryBudgetChartProps {
  data: {
    category: string;
    budget: number;
    spent: number;
    remaining: number;
  }[];
}

const chartConfig = {
  spent: {
    label: "Spent",
    color: "var(--chart-1)",
  },
  remaining: {
    label: "Remaining",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

// Custom tick component to render category icons
function CustomXAxisTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const Icon = categoryIcons[payload.value] || defaultCategoryIcon;
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-10} y={0} width={20} height={20}>
        <div className="flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </foreignObject>
    </g>
  );
}

export function CategoryBudgetChart({ data }: CategoryBudgetChartProps) {
  // Transform data for stacked bar chart - only show positive remaining
  const chartData = useMemo(() => {
    return data.map((item) => ({
      category: item.category,
      spent: item.spent,
      remaining: Math.max(0, item.remaining),
    }));
  }, [data]);

  const totalBudget = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.budget, 0);
  }, [data]);

  const totalSpent = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.spent, 0);
  }, [data]);

  const overallPercentage = totalBudget > 0 
    ? ((totalSpent / totalBudget) * 100).toFixed(1) 
    : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Budget Usage</CardTitle>
        <CardDescription>Spent vs remaining budget per category</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto max-w-[400px]">
          <BarChart accessibilityLayer data={chartData} barSize={40}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={CustomXAxisTick}
            />
            <ChartTooltip 
              content={<ChartTooltipContent labelKey="category" />}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.category;
                }
                return "";
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="spent"
              stackId="a"
              fill="var(--color-spent)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="remaining"
              stackId="a"
              fill="var(--color-remaining)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          {overallPercentage}% of category budgets used this month
        </div>
      </CardFooter>
    </Card>
  );
}
