"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  localDb,
  addToSyncQueue,
  type LocalExpense,
  type LocalBudget,
  type EntitySyncStatus,
} from "@/lib/offline-db";
import { useSyncContext } from "@/components/sync-provider";

// ============================================
// Types
// ============================================

interface DashboardExpense {
  id: string;
  amount: number;
  category: string;
  date: Date;
  notes: string | null;
  type: "expense" | "income";
  userId?: string;
  createdAt?: Date;
}

interface DashboardData {
  budget: {
    id?: string;
    amount: number;
    month: string;
  } | null;
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  expenses: DashboardExpense[];
  dailySpending: { day: number; amount: number }[];
  daysInMonth: number;
}

// ============================================
// Dashboard Data Hook
// ============================================

export function useDashboardData(month: string) {
  const { isOnline, refreshFromServer } = useSyncContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate month date range
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // Last day of month
  const daysInMonth = endDate.getDate();

  // Live query for expenses in the selected month
  const expenses = useLiveQuery(
    async () => {
      const monthExpenses = await localDb.expenses
        .where("date")
        .between(startDate, new Date(endDate.getTime() + 86400000), true, false)
        .toArray();

      // Filter by month more precisely since IndexedDB date comparison can be tricky
      return monthExpenses.filter((e) => {
        const expenseDate = new Date(e.date);
        return (
          expenseDate.getFullYear() === year &&
          expenseDate.getMonth() === monthNum - 1
        );
      });
    },
    [month],
    [],
  );

  // Live query for budget
  const budget = useLiveQuery(
    async () => {
      // Find budget for this month or most recent before it
      const allBudgets = await localDb.budgets
        .orderBy("month")
        .reverse()
        .toArray();

      // Find exact match or most recent before this month
      const exactMatch = allBudgets.find((b) => b.month === month);
      if (exactMatch) return exactMatch;

      // Find most recent budget before this month
      return allBudgets.find((b) => b.month <= month) || null;
    },
    [month],
    null,
  );

  // Compute derived data
  const data: DashboardData | null =
    expenses !== undefined
      ? (() => {
          const expenseList = expenses.filter((e) => e.type === "expense");
          const incomeList = expenses.filter((e) => e.type === "income");

          const totalSpent = expenseList.reduce((sum, e) => sum + e.amount, 0);
          const totalIncome = incomeList.reduce((sum, e) => sum + e.amount, 0);
          const budgetAmount = budget?.amount ?? 0;
          const remaining = budgetAmount + totalIncome - totalSpent;

          // Calculate daily spending
          const dailySpending: { day: number; amount: number }[] = [];
          for (let day = 1; day <= daysInMonth; day++) {
            const dayExpenses = expenseList.filter((e) => {
              const d = new Date(e.date);
              return d.getDate() === day;
            });
            dailySpending.push({
              day,
              amount: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
            });
          }

          return {
            budget: budget
              ? { id: budget.id, amount: budget.amount, month: budget.month }
              : null,
            totalSpent,
            totalIncome,
            remaining,
            expenses: expenses.map((e) => ({
              ...e,
              date: new Date(e.date),
              createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
            })),
            dailySpending,
            daysInMonth,
          };
        })()
      : null;

  // Initial load and server refresh
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Check if we have local data
        const localCount = await localDb.expenses.count();
        if (localCount === 0 && isOnline) {
          // No local data, fetch from server
          await refreshFromServer();
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load data"));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isOnline, refreshFromServer]);

  return {
    data,
    isLoading: isLoading && !data,
    error,
  };
}

// ============================================
// Transactions Hook
// ============================================

interface TransactionsOptions {
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
  filterType?: "expense" | "income" | "all";
  month?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export function useTransactions(options: TransactionsOptions = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = "date",
    sortOrder = "desc",
    filterType = "all",
    month,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  } = options;

  const transactions = useLiveQuery(
    async () => {
      let query = localDb.expenses.toCollection();

      let results = await query.toArray();

      // Apply filters
      if (filterType !== "all") {
        results = results.filter((e) => e.type === filterType);
      }

      if (month) {
        const [y, m] = month.split("-").map(Number);
        results = results.filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === y && d.getMonth() === m - 1;
        });
      }

      if (startDate) {
        const start = new Date(startDate);
        results = results.filter((e) => new Date(e.date) >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        results = results.filter((e) => new Date(e.date) <= end);
      }

      if (minAmount !== undefined) {
        results = results.filter((e) => e.amount >= minAmount);
      }

      if (maxAmount !== undefined) {
        results = results.filter((e) => e.amount <= maxAmount);
      }

      // Sort
      results.sort((a, b) => {
        if (sortBy === "date") {
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return sortOrder === "desc" ? bDate - aDate : aDate - bDate;
        } else {
          return sortOrder === "desc"
            ? b.amount - a.amount
            : a.amount - b.amount;
        }
      });

      // Paginate
      const start = (page - 1) * limit;
      const paginatedResults = results.slice(start, start + limit);

      return {
        transactions: paginatedResults.map((e) => ({
          ...e,
          date: new Date(e.date),
          createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
        })),
        total: results.length,
        page,
        totalPages: Math.ceil(results.length / limit),
      };
    },
    [
      page,
      limit,
      sortBy,
      sortOrder,
      filterType,
      month,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    ],
    { transactions: [], total: 0, page: 1, totalPages: 0 },
  );

  return {
    data: transactions,
    isLoading: transactions === undefined,
  };
}

// ============================================
// Mutation Hooks
// ============================================

interface ExpenseInput {
  amount: number;
  category: string;
  date: Date;
  notes?: string;
  type?: "expense" | "income";
}

export function useAddExpense() {
  const { isOnline } = useSyncContext();

  const addExpense = useCallback(
    async (data: ExpenseInput, userId: string) => {
      const id = crypto.randomUUID();
      const now = new Date();

      const expense: LocalExpense = {
        id,
        amount: data.amount,
        category: data.category,
        date: data.date,
        notes: data.notes ?? null,
        type: data.type ?? "expense",
        createdAt: now,
        userId,
        syncStatus: isOnline ? "pending" : "pending",
      };

      // Save to local DB
      await localDb.expenses.add(expense);

      // Queue for sync
      await addToSyncQueue({
        operationType: "create",
        entity: "expense",
        entityId: id,
        data: expense,
      });

      return id;
    },
    [isOnline],
  );

  return addExpense;
}

export function useUpdateExpense() {
  const updateExpense = useCallback(async (id: string, data: ExpenseInput) => {
    const existing = await localDb.expenses.get(id);
    if (!existing) throw new Error("Expense not found");

    const updated: LocalExpense = {
      ...existing,
      amount: data.amount,
      category: data.category,
      date: data.date,
      notes: data.notes ?? null,
      type: data.type ?? existing.type,
      syncStatus: "pending",
    };

    // Update local DB
    await localDb.expenses.put(updated);

    // Queue for sync
    await addToSyncQueue({
      operationType: "update",
      entity: "expense",
      entityId: id,
      data: updated,
    });
  }, []);

  return updateExpense;
}

export function useDeleteExpense() {
  const deleteExpense = useCallback(async (id: string) => {
    const existing = await localDb.expenses.get(id);
    if (!existing) return;

    // Delete from local DB
    await localDb.expenses.delete(id);

    // Queue for sync (only if it was previously synced)
    if (existing.syncStatus === "synced") {
      await addToSyncQueue({
        operationType: "delete",
        entity: "expense",
        entityId: id,
        data: { id },
      });
    }
  }, []);

  return deleteExpense;
}

export function useSetBudget() {
  const setBudget = useCallback(async (amount: number, month: string) => {
    // Check if budget exists for this month
    const existing = await localDb.budgets.where("month").equals(month).first();

    const budget: LocalBudget = {
      id: existing?.id ?? crypto.randomUUID(),
      amount,
      month,
      createdAt: existing?.createdAt ?? new Date(),
      syncStatus: "pending",
    };

    // Save to local DB
    await localDb.budgets.put(budget);

    // Queue for sync
    await addToSyncQueue({
      operationType: existing ? "update" : "create",
      entity: "budget",
      entityId: budget.id,
      data: budget,
    });
  }, []);

  return setBudget;
}

// ============================================
// Get User ID from Local DB
// ============================================

export async function getLocalUserId(): Promise<string> {
  const users = await localDb.users.toArray();
  if (users.length > 0) {
    return users[0].id;
  }
  // Fallback to a local-only user ID
  return "local-user";
}
