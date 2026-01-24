"use client";

import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis, ReferenceLine } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SavingsBucket } from "./types";

interface BalanceChartProps {
  bucket: SavingsBucket;
  formatMoney: (value: number) => string;
}

const chartConfig = {
  balance: {
    label: "Balance",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function BalanceChart({ bucket, formatMoney }: BalanceChartProps) {
  const { chartData, gradientOffset, hasNegative } = useMemo(() => {
    if (!bucket.entries || bucket.entries.length === 0) {
      return { chartData: [], gradientOffset: 1, hasNegative: false };
    }

    // Sort entries by date
    const sortedEntries = [...bucket.entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Build cumulative balance data
    let runningBalance = 0;
    const data = sortedEntries.map((entry) => {
      if (entry.entryType === "deposit") {
        runningBalance += entry.amount;
      } else if (entry.entryType === "withdrawal") {
        runningBalance -= entry.amount;
      }

      return {
        date: new Date(entry.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        balance: runningBalance,
      };
    });

    // Calculate gradient offset for positive/negative coloring
    const balances = data.map((d) => d.balance);
    const dataMax = Math.max(...balances);
    const dataMin = Math.min(...balances);

    let offset = 1;
    const hasNeg = dataMin < 0;

    if (dataMax <= 0) {
      // All negative
      offset = 0;
    } else if (dataMin >= 0) {
      // All positive
      offset = 1;
    } else {
      // Mix of positive and negative
      offset = dataMax / (dataMax - dataMin);
    }

    return { chartData: data, gradientOffset: offset, hasNegative: hasNeg };
  }, [bucket.entries]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No entries yet
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {/* Gradient for fill - transitions from primary (positive) to destructive (negative) */}
          <linearGradient id="balanceFillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
            <stop offset={`${gradientOffset * 100}%`} stopColor="var(--primary)" stopOpacity={0.1} />
            <stop offset={`${gradientOffset * 100}%`} stopColor="var(--destructive)" stopOpacity={0.1} />
            <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.4} />
          </linearGradient>
          {/* Gradient for stroke */}
          <linearGradient id="balanceStrokeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset={`${gradientOffset * 100}%`} stopColor="var(--primary)" />
            <stop offset={`${gradientOffset * 100}%`} stopColor="var(--destructive)" />
            <stop offset="100%" stopColor="var(--destructive)" />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <YAxis
          tickFormatter={(value) => formatMoney(value)}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={12}
          width={80}
        />
        {/* Zero reference line when there are negative values */}
        {hasNegative && (
          <ReferenceLine
            y={0}
            stroke="var(--border)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatMoney(value as number)}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="url(#balanceStrokeGradient)"
          strokeWidth={2}
          fill="url(#balanceFillGradient)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
