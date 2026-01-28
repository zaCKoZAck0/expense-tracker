"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const description = "A multiple line chart";

interface BudgetLineChartProps {
  data: {
    month: string;
    budget: number;
    spend: number;
    earning: number;
  }[];
}

export function BudgetLineChart({ data }: BudgetLineChartProps) {
  const [includeEarningInBudget, setIncludeEarningInBudget] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("includeEarningInBudget");
    if (stored !== null) {
      setIncludeEarningInBudget(stored === "true");
    }
  }, []);

  const handleIncludeEarningChange = (checked: boolean) => {
    setIncludeEarningInBudget(checked);
    localStorage.setItem("includeEarningInBudget", String(checked));
  };

  // Transform data based on toggle state
  const chartData = useMemo(() => {
    if (includeEarningInBudget) {
      // Combine earning with budget
      return data.map((item) => ({
        ...item,
        budget: item.budget + item.earning,
      }));
    }
    return data;
  }, [data, includeEarningInBudget]);

  // Dynamic chart config based on toggle
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      budget: {
        label: includeEarningInBudget ? "Budget + Earning" : "Budget",
        color: "var(--secondary)",
      },
      spend: {
        label: "Spend",
        color: "var(--primary)",
      },
    };

    if (!includeEarningInBudget) {
      config.earning = {
        label: "Earning",
        color: "var(--chart-3)",
      };
    }

    return config;
  }, [includeEarningInBudget]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Budget vs Spend</CardTitle>
        <CardDescription>Last 6 months comparison</CardDescription>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Switch
            id="include-earning"
            checked={includeEarningInBudget}
            onCheckedChange={handleIncludeEarningChange}
          />
          <Label
            htmlFor="include-earning"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Include earning in budget
          </Label>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full max-h-87.5"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
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
            {!includeEarningInBudget && (
              <Line
                dataKey="earning"
                type="monotone"
                stroke="var(--color-earning)"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
