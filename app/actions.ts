"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

async function getOrCreateUser() {
  const session = await auth();

  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" } as const;
  }

  // Diagnostic: ensure the Prisma client has the `user` delegate
  if (!("user" in db)) {
    console.error(
      "Prisma client missing `user` delegate. Available delegates:",
      Object.keys(db as Record<string, unknown>),
    );
    return {
      success: false,
      error: "Database misconfigured: missing user delegate",
    } as const;
  }

  const user = await db.user.upsert({
    where: { email: session.user.email },
    update: {
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    },
    create: {
      email: session.user.email,
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    },
  });

  return { success: true, data: user } as const;
}

export async function setBudget(amount: number, month: string) {
  try {
    const budget = await db.budget.upsert({
      where: {
        month: month,
      },
      update: {
        amount: amount,
      },
      create: {
        amount: amount,
        month: month,
      },
    });
    revalidatePath("/");
    return { success: true, data: budget } as const;
  } catch (error) {
    console.error("Failed to set budget:", error);
    return { success: false, error: "Failed to set budget" } as const;
  }
}

export async function getBudget(month: string) {
  try {
    // Try to find an exact budget for the requested month
    const budget = await db.budget.findUnique({
      where: {
        month: month,
      },
    });

    if (budget) {
      return { success: true, data: budget } as const;
    }

    // If none exists, fall back to the most recent budget on or before the requested month.
    // This implements the behavior: "apply the last set budget to subsequent months until changed" without modifying past months.
    const fallback = await db.budget.findFirst({
      where: {
        month: {
          lte: month,
        },
      },
      orderBy: {
        month: "desc",
      },
    });

    return { success: true, data: fallback } as const;
  } catch (error) {
    console.error("Failed to get budget:", error);
    return { success: false, error: "Failed to get budget" } as const;
  }
}

export interface ExpenseInput {
  amount: number;
  category: string;
  date: Date;
  notes?: string;
  type?: "expense" | "income";
}

export async function addExpense(data: ExpenseInput) {
  try {
    const userRes = await getOrCreateUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const expense = await db.expense.create({
      data: {
        amount: data.amount,
        category: data.category,
        date: data.date,
        notes: data.notes,
        type: data.type || "expense",
        userId: userRes.data.id,
      },
    });
    revalidatePath("/");
    return { success: true, data: expense } as const;
  } catch (error) {
    console.error("Failed to add expense:", error);
    return { success: false, error: "Failed to add expense" } as const;
  }
}

export async function updateExpense(id: string, data: ExpenseInput) {
  try {
    const userRes = await getOrCreateUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Not found or unauthorized" } as const;
    }

    const updated = await db.expense.update({
      where: { id },
      data: {
        amount: data.amount,
        category: data.category,
        date: data.date,
        notes: data.notes,
        type: data.type || existing.type,
      },
    });

    revalidatePath("/");
    return { success: true, data: updated } as const;
  } catch (error) {
    console.error("Failed to update expense:", error);
    return { success: false, error: "Failed to update expense" } as const;
  }
}

export async function deleteExpense(id: string) {
  try {
    const userRes = await getOrCreateUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Not found or unauthorized" } as const;
    }

    await db.expense.delete({ where: { id } });
    revalidatePath("/");
    return { success: true } as const;
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false, error: "Failed to delete expense" } as const;
  }
}

export async function getExpenses(month: string) {
  // Assuming month is "YYYY-MM"
  // Calculate start and end date for the month
  const [year, monthIndex] = month.split("-").map(Number);
  const startDate = new Date(year, monthIndex - 1, 1);
  const endDate = new Date(year, monthIndex, 0); // Last day of the month

  try {
    const userRes = await getOrCreateUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const expenses = await db.expense.findMany({
      where: {
        userId: userRes.data.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    return { success: true, data: expenses } as const;
  } catch (error) {
    console.error("Failed to get expenses:", error);
    return { success: false, error: "Failed to get expenses" } as const;
  }
}


export async function getTransactions(options: {
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
  filterType?: "expense" | "income" | "all";
  month?: string; // Optional: filter by month (YYYY-MM)
  startDate?: string; // Optional: ISO date string
  endDate?: string;   // Optional: ISO date string
  minAmount?: number;
  maxAmount?: number;
}) {
  const {
    page = 1,
    limit = 50,
    sortBy = "date",
    sortOrder = "desc",
    filterType = "all",
    month,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  } = options;

  try {
    const userRes = await getOrCreateUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const whereClause: any = {
      userId: userRes.data.id,
    };

    if (filterType !== "all") {
      whereClause.type = filterType;
    }

    if (month && !startDate && !endDate) {
      // Only use month if explicit dates are not provided, or combine them?
      // Usually explicit date range overrides month picker, or month picker is just a shortcut.
      // Let's assume startDate/endDate take precedence if present.
      const [year, monthIndex] = month.split("-").map(Number);
      const start = new Date(year, monthIndex - 1, 1);
      const end = new Date(year, monthIndex, 0); // Last day of month
      // Set end of day for the end date to include all transactions on that day
      end.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: start,
        lte: end,
      };
    } else if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.date.lte = end;
      }
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      whereClause.amount = {};
      if (minAmount !== undefined) whereClause.amount.gte = minAmount;
      if (maxAmount !== undefined) whereClause.amount.lte = maxAmount;
    }

    const [transactions, totalCount] = await Promise.all([
      db.expense.findMany({
        where: whereClause,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expense.count({ where: whereClause }),
    ]);

    return {
      success: true,
      data: {
        transactions,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      },
    } as const;
  } catch (error) {
    console.error("Failed to get transactions:", error);
    return { success: false, error: "Failed to get transactions" } as const;
  }
}

export async function getDashboardData(month: string) {
  const budgetReq = getBudget(month);
  const expensesReq = getExpenses(month);

  const [budgetRes, expensesRes] = await Promise.all([budgetReq, expensesReq]);

  if (!budgetRes.success || !expensesRes.success) {
    return { success: false, error: "Failed to fetch dashboard data" } as const;
  }

  const budget = budgetRes.data;
  const allEntries = expensesRes.data || [];

  // Separate expenses and income
  const expenseEntries = allEntries.filter((e) => e.type !== "income");
  const incomeEntries = allEntries.filter((e) => e.type === "income");

  const totalSpent = expenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncome = incomeEntries.reduce((acc, curr) => acc + curr.amount, 0);

  // Calculate daily spending aggregation (only for actual expenses)
  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();

  const dailySpendingMap = new Map<number, number>();
  for (const expense of expenseEntries) {
    const day = new Date(expense.date).getDate();
    dailySpendingMap.set(day, (dailySpendingMap.get(day) || 0) + expense.amount);
  }

  const dailySpending = Array.from(dailySpendingMap.entries()).map(
    ([day, amount]) => ({
      day,
      amount,
    }),
  );

  return {
    success: true,
    data: {
      budget,
      expenses: allEntries, // Includes both expenses and income
      totalSpent,
      totalIncome,
      remaining: (budget?.amount || 0) - totalSpent + totalIncome,
      dailySpending,
      daysInMonth,
    },
  } as const;
}
