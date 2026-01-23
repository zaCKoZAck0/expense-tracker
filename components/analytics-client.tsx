"use client";

import { useState } from "react";
import { BudgetLineChart } from "@/components/analytics/budget-line-chart";
import { ExpensePieChart } from "@/components/analytics/expense-pie-chart";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { getExpenseCategoryData } from "@/app/actions/analytics";

interface AnalyticsClientProps {
  availableMonths: string[];
  initialMonth: string;
  initialPieData: Array<{ category: string; amount: number; fill: string }>;
  trendData: Array<{ month: string; budget: number; spend: number }>;
  dailyActivityData: Array<{ date: string; count: number }>;
  currency: string;
}

export function AnalyticsClient({
  availableMonths,
  initialMonth,
  initialPieData,
  trendData,
  dailyActivityData,
  currency,
}: AnalyticsClientProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [pieData, setPieData] = useState(initialPieData);

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    // Fetch category totals for the newly selected month.
    const data = await getExpenseCategoryData(month);
    setPieData(data);
  };

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>
      <div className="grid gap-4 grid-cols-1">
        <div>
          <BudgetLineChart data={trendData} />
        </div>
        <div>
          <ExpensePieChart
            data={pieData}
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>
        <div>
          <ActivityHeatmap data={dailyActivityData} currency={currency} />
        </div>
      </div>
    </div>
  );
}
