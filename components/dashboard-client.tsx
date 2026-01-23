"use client";
import { useMemo, useEffect, useState } from "react";
import { BudgetSummary } from "@/components/budget-summary";
import { TransactionList } from "@/components/transaction-list";
import { AddExpenseButton } from "@/components/add-expense-button";
import { useNavigation } from "@/components/navigation-provider";
import ExpenseDetail from "@/components/expense-detail";
import { getDashboardData } from "@/app/actions";

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

type DashboardData = {
  budget: {
    id?: string;
    amount: number;
    month: string;
  } | null;
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  expenses: {
    id: string;
    amount: number;
    category: string;
    date: string;
    notes: string | null;
    type: "expense" | "income";
    userId?: string;
    createdAt?: string;
  }[];
  dailySpending: {
    day: number;
    amount: number;
  }[];
  daysInMonth: number;
};

export function DashboardClient() {
  const { selectedExpense, closeExpense, selectedMonth, refreshKey } = useNavigation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const result = await getDashboardData(selectedMonth);

      if (result.success) {
        // Normalize server data to the client shape by serializing Date fields
        const normalizedData = {
          budget: result.data.budget
            ? {
                id: result.data.budget.id,
                amount: result.data.budget.amount,
                month: result.data.budget.month,
              }
            : null,
          totalSpent: result.data.totalSpent,
          totalIncome: result.data.totalIncome,
          remaining: result.data.remaining,
          expenses: result.data.expenses.map((expense) => ({
            id: expense.id,
            amount: expense.amount,
            category: expense.category,
            date: new Date(expense.date).toISOString(),
            notes: expense.notes,
            type: expense.type as "expense" | "income",
            userId: expense.userId,
            createdAt: expense.createdAt ? new Date(expense.createdAt).toISOString() : undefined,
          })),
          dailySpending: result.data.dailySpending,
          daysInMonth: result.data.daysInMonth,
        };
        setData(normalizedData);
      } else {
        setData(null);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [selectedMonth, refreshKey]);

  const expenses = useMemo<DashboardExpense[]>(() => {
    if (!data?.expenses) return [];
    // Normalize server-provided dates into `Date` instances for UI formatting.
    return data.expenses.map((expense) => ({
      ...expense,
      notes: expense.notes ?? null,
      date: new Date(expense.date),
      createdAt: expense.createdAt ? new Date(expense.createdAt) : undefined,
    }));
  }, [data]);

  const budget = data?.budget ?? null;
  const totalSpent = data?.totalSpent ?? 0;
  const totalIncome = data?.totalIncome ?? 0;
  const remaining = data?.remaining ?? 0;

  // Effective budget is the set budget amount + any income
  const budgetAmount = (data?.budget?.amount ?? 0) + totalIncome;

  const spentPercentage =
    budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  if (isLoading) {
    return (
      <main className="space-y-6 pb-24">
        <div className="text-center text-muted-foreground py-8">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 pb-24">
      <div className="grid grid-cols-1 gap-4">
        <BudgetSummary
          remaining={remaining}
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
