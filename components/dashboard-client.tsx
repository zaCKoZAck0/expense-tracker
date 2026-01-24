"use client";
import { useMemo } from "react";
import { BudgetSummary } from "@/components/budget-summary";
import { TransactionList } from "@/components/expense-list";
import { AddExpenseButton } from "@/components/add-expense-button";
import { useNavigation } from "@/components/navigation-provider";
import ExpenseDetail from "@/components/expense-detail";
import { useDashboardData } from "@/hooks/use-local-data";

type DashboardExpense = {
  id: string;
  amount: number;
  category: string;
  date: Date;
  notes: string | null;
  type: "expense" | "income";
  userId?: string;
  createdAt?: Date;
};

export function DashboardClient() {
  const { selectedExpense, closeExpense, selectedMonth, refreshKey } =
    useNavigation();

  // Use local-first data hook
  const { data, isLoading } = useDashboardData(selectedMonth);

  const expenses = useMemo<DashboardExpense[]>(() => {
    if (!data?.expenses) return [];
    return data.expenses;
  }, [data]);

  const budget = data?.budget ?? null;
  const totalSpent = data?.totalSpent ?? 0;
  const totalIncome = data?.totalIncome ?? 0;

  // Effective budget is the set budget amount + any income
  const budgetAmount = (data?.budget?.amount ?? 0) + totalIncome;

  const spentPercentage =
    budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  if (isLoading) {
    return (
      <main className="space-y-6 pb-24">
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      </main>
    );
  }

  return (
    <main className="space-y-6 pb-24">
      <div className="grid grid-cols-1 gap-4">
        <BudgetSummary
          remaining={data?.remaining ?? 0}
          budgetAmount={budgetAmount}
          spentPercentage={spentPercentage}
          dailySpending={data?.dailySpending ?? []}
          daysInMonth={data?.daysInMonth ?? 30}
        />
      </div>

      <div className="space-y-4">
        {selectedExpense ? (
          <ExpenseDetail expense={selectedExpense} onBack={closeExpense} />
        ) : (
          <TransactionList transactions={expenses} />
        )}
      </div>
      <AddExpenseButton />
    </main>
  );
}

