"use client";

import { useState } from "react";
import { BudgetLineChart } from "@/components/analytics/budget-line-chart";
import { ExpensePieChart } from "@/components/analytics/expense-pie-chart";
import { IncomePieChart } from "@/components/analytics/income-pie-chart";
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap";
import { CategoryBudgetChart } from "@/components/analytics/category-budget-chart";
import {
  getExpenseCategoryData,
  getIncomeCategoryData,
} from "@/app/actions/analytics";
import { useCategoryBudgets } from "@/hooks/use-local-data";
import { useNavigation } from "@/components/navigation-provider";

interface AnalyticsClientProps {
  availableMonths: string[];
  initialMonth: string;
  initialPieData: Array<{ category: string; amount: number; fill: string }>;
  initialIncomePieData: Array<{
    category: string;
    amount: number;
    fill: string;
  }>;
  trendData: Array<{
    month: string;
    budget: number;
    spend: number;
    earning: number;
  }>;
  dailyActivityData: Array<{ date: string; count: number }>;
  currency: string;
}

export function AnalyticsClient({
  availableMonths,
  initialMonth,
  initialPieData,
  initialIncomePieData,
  trendData,
  dailyActivityData,
  currency,
}: AnalyticsClientProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [pieData, setPieData] = useState(initialPieData);
  const [selectedIncomeMonth, setSelectedIncomeMonth] =
    useState<string>(initialMonth);
  const [incomePieData, setIncomePieData] = useState(initialIncomePieData);

  // Get selected month from navigation for category budgets
  const { selectedMonth: navMonth } = useNavigation();
  const { data: categoryBudgets } = useCategoryBudgets(navMonth);

  // Transform category budgets for the chart
  const categoryBudgetChartData = categoryBudgets.map((cb) => ({
    category: cb.category,
    budget: cb.amount,
    spent: cb.spent,
    remaining: cb.remaining,
  }));

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    // Fetch category totals for the newly selected month.
    const data = await getExpenseCategoryData(month);
    setPieData(data);
  };

  const handleIncomeMonthChange = async (month: string) => {
    setSelectedIncomeMonth(month);
    // Fetch income category totals for the newly selected month.
    const data = await getIncomeCategoryData(month);
    setIncomePieData(data);
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>
      <div className="grid gap-4 grid-cols-1">
        <div>
          <BudgetLineChart data={trendData} />
        </div>
        {categoryBudgetChartData.length > 0 && (
          <div>
            <CategoryBudgetChart data={categoryBudgetChartData} />
          </div>
        )}
        <div>
          <ExpensePieChart
            data={pieData}
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>
        <div>
          <IncomePieChart
            data={incomePieData}
            availableMonths={availableMonths}
            selectedMonth={selectedIncomeMonth}
            onMonthChange={handleIncomeMonthChange}
          />
        </div>
        <div>
          <ActivityHeatmap data={dailyActivityData} currency={currency} />
        </div>
      </div>
    </div>
  );
}
