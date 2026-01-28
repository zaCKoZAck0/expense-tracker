"use server";

import { db } from "@/lib/db";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { auth } from "@/auth";
import type { Prisma } from "@/prisma/generated/client";

// Cache Keys Generation Helpers
const getBudgetTag = (userId: string) => `budget-${userId}`;
const getExpensesTag = (userId: string) => `expenses-${userId}`;
const getUserTag = (email: string) => `user-${email}`;
const getDashboardTag = (userId: string) => `dashboard-${userId}`;
const getAnalyticsTag = (userId: string) => `analytics-${userId}`;

type TransactionsOptions = {
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
};

type NormalizedTransactionsOptions = {
  page: number;
  limit: number;
  sortBy: "date" | "amount";
  sortOrder: "asc" | "desc";
  filterType: "expense" | "income" | "all";
  month?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
};

const budgetCacheByUser = new Map<string, ReturnType<typeof unstable_cache>>();
const expensesRangeCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();
const transactionsCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();
const dashboardCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();

const normalizeTransactionsOptions = (
  options: TransactionsOptions,
): NormalizedTransactionsOptions => ({
  page: options.page ?? 1,
  limit: options.limit ?? 50,
  sortBy: options.sortBy ?? "date",
  sortOrder: options.sortOrder ?? "desc",
  filterType: options.filterType ?? "all",
  month: options.month,
  startDate: options.startDate,
  endDate: options.endDate,
  minAmount: options.minAmount,
  maxAmount: options.maxAmount,
});

const toEndOfDay = (value: Date) => {
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getMonthDateRange = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const startDate = new Date(year, monthIndex - 1, 1);
  const endDate = toEndOfDay(new Date(year, monthIndex, 0));
  return { startDate, endDate };
};

const buildTransactionWhereClause = (
  userId: string,
  options: NormalizedTransactionsOptions,
): Prisma.ExpenseWhereInput => {
  const where: Prisma.ExpenseWhereInput = { userId };

  if (options.filterType !== "all") {
    where.type = options.filterType;
  }

  if (options.month && !options.startDate && !options.endDate) {
    const { startDate, endDate } = getMonthDateRange(options.month);
    where.date = { gte: startDate, lte: endDate };
  }

  if (options.startDate || options.endDate) {
    const startDate = options.startDate
      ? new Date(options.startDate)
      : undefined;
    const endDate = options.endDate
      ? toEndOfDay(new Date(options.endDate))
      : undefined;
    where.date = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  if (options.minAmount !== undefined || options.maxAmount !== undefined) {
    where.amount = {
      ...(options.minAmount !== undefined ? { gte: options.minAmount } : {}),
      ...(options.maxAmount !== undefined ? { lte: options.maxAmount } : {}),
    };
  }

  return where;
};

const shouldCacheTransactions = (options: NormalizedTransactionsOptions) => {
  const hasAdHocFilters =
    options.filterType !== "all" ||
    options.startDate !== undefined ||
    options.endDate !== undefined ||
    options.minAmount !== undefined ||
    options.maxAmount !== undefined;

  // Cache only the common unfiltered dashboard views and first few pages.
  return !hasAdHocFilters && options.page <= 5;
};

const getBudgetCache = (userId: string) => {
  const cached = budgetCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async (month: string) => {
      return db.budget.findUnique({ where: { month } });
    },
    ["budget-data", userId],
    { tags: [getBudgetTag(userId)], revalidate: 3600 },
  );

  budgetCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getExpensesRangeCache = (userId: string) => {
  const cached = expensesRangeCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async (startIso: string, endIso: string) => {
      const startDate = new Date(startIso);
      const endDate = new Date(endIso);

      return db.expense.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "desc" },
      });
    },
    ["expenses-range", userId],
    { tags: [getExpensesTag(userId)], revalidate: 300 },
  );

  expensesRangeCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getTransactionsCache = (userId: string) => {
  const cached = transactionsCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async (optionsKey: string) => {
      const normalized = JSON.parse(
        optionsKey,
      ) as NormalizedTransactionsOptions;
      const where = buildTransactionWhereClause(userId, normalized);
      const orderBy = { [normalized.sortBy]: normalized.sortOrder } as const;
      const skip = (normalized.page - 1) * normalized.limit;

      const [transactions, totalCount] = await db.$transaction([
        db.expense.findMany({
          where,
          orderBy,
          skip,
          take: normalized.limit,
        }),
        db.expense.count({ where }),
      ]);

      return { transactions, totalCount };
    },
    ["transactions-list", userId],
    { tags: [getExpensesTag(userId)], revalidate: 180 },
  );

  transactionsCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getDashboardCache = (userId: string) => {
  const cached = dashboardCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async (month: string) => {
      const { startDate, endDate } = getMonthDateRange(month);

      const budgetPromise = db.budget.findUnique({ where: { month } });

      const latestEntriesPromise = db.expense.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "desc" },
        take: 50,
      });

      const statsEntriesPromise = db.expense.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
        select: {
          amount: true,
          date: true,
          type: true,
        },
      });

      const budget = await budgetPromise;
      const latestEntries = await latestEntriesPromise;
      const statsEntries = await statsEntriesPromise;

      const expenseEntries = statsEntries.filter(
        (entry) => entry.type !== "income",
      );
      const incomeEntries = statsEntries.filter(
        (entry) => entry.type === "income",
      );

      const totalSpent = expenseEntries.reduce(
        (acc, curr) => acc + curr.amount,
        0,
      );
      const totalIncome = incomeEntries.reduce(
        (acc, curr) => acc + curr.amount,
        0,
      );

      const dailySpendingMap = new Map<number, number>();
      for (const expense of expenseEntries) {
        const day = new Date(expense.date).getUTCDate();
        dailySpendingMap.set(
          day,
          (dailySpendingMap.get(day) || 0) + expense.amount,
        );
      }

      const dailySpending = Array.from(dailySpendingMap.entries()).map(
        ([day, amount]) => ({ day, amount }),
      );

      return {
        budget,
        expenses: latestEntries,
        totalSpent,
        totalIncome,
        remaining: (budget?.amount || 0) - totalSpent + totalIncome,
        dailySpending,
        daysInMonth: endDate.getDate(),
      };
    },
    ["dashboard-data", userId],
    {
      tags: [
        getDashboardTag(userId),
        getExpensesTag(userId),
        getBudgetTag(userId),
      ],
    },
  );

  dashboardCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

// Cached User Fetcher (Read-Only)
export const getCachedUser = async () => {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized" } as const;
  }

  const email = session.user.email;

  const fetchUser = unstable_cache(
    async (email: string) => {
      // Just find, don't upsert.
      return await db.user.findUnique({
        where: { email },
      });
    },
    ["get-cached-user"],
    {
      tags: [getUserTag(email)],
      revalidate: 3600, // Hard revalidate every hour just in case
    },
  );

  const user = await fetchUser(email);

  if (!user) {
    // Fallback to getOrCreate if not found (first time user or cache miss issue)
    // But for pure read operations, if user doesn't exist, they probably haven't done anything yet.
    // We'll call getOrCreateUser to ensure they are set up.
    return await getOrCreateUser();
  }

  return { success: true, data: user } as const;
};

export async function getOrCreateUser() {
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

  // Revalidate user cache
  revalidateTag(getUserTag(session.user.email), {});

  return { success: true, data: user } as const;
}

export async function setBudget(amount: number, month: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success)
      return { success: false, error: userRes.error } as const;

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
    revalidateTag(getBudgetTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});

    return { success: true, data: budget } as const;
  } catch (error) {
    console.error("Failed to set budget:", error);
    return { success: false, error: "Failed to set budget" } as const;
  }
}

export async function getBudget(month: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const budget = await getBudgetCache(userRes.data.id)(month);
    return { success: true, data: budget } as const;
  } catch (error) {
    console.error("Failed to get budget:", error);
    return { success: false, error: "Failed to get budget" } as const;
  }
}

export async function getExpenses(month: string) {
  const { startDate, endDate } = getMonthDateRange(month);

  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const expenses = await getExpensesRangeCache(userRes.data.id)(
      startDate.toISOString(),
      endDate.toISOString(),
    );
    return { success: true, data: expenses } as const;
  } catch (error) {
    console.error("Failed to get expenses:", error);
    return { success: false, error: "Failed to get expenses" } as const;
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
    const userRes = await getCachedUser();
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
    revalidateTag(getExpensesTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});
    revalidateTag(getAnalyticsTag(userRes.data.id), {});

    return { success: true, data: expense } as const;
  } catch (error) {
    console.error("Failed to add expense:", error);
    return { success: false, error: "Failed to add expense" } as const;
  }
}

export async function updateExpense(id: string, data: ExpenseInput) {
  try {
    const userRes = await getCachedUser();
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
    revalidateTag(getExpensesTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});
    revalidateTag(getAnalyticsTag(userRes.data.id), {});
    return { success: true, data: updated } as const;
  } catch (error) {
    console.error("Failed to update expense:", error);
    return { success: false, error: "Failed to update expense" } as const;
  }
}

export async function deleteExpense(id: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Not found or unauthorized" } as const;
    }

    await db.expense.delete({ where: { id } });
    revalidatePath("/");
    revalidateTag(getExpensesTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});
    revalidateTag(getAnalyticsTag(userRes.data.id), {});
    return { success: true } as const;
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false, error: "Failed to delete expense" } as const;
  }
}

export async function getTransactions(options: TransactionsOptions) {
  const normalized = normalizeTransactionsOptions(options);

  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const where = buildTransactionWhereClause(userRes.data.id, normalized);
    const orderBy = { [normalized.sortBy]: normalized.sortOrder } as const;
    const skip = (normalized.page - 1) * normalized.limit;

    const fetchDirect = async () => {
      const [transactions, totalCount] = await db.$transaction([
        db.expense.findMany({
          where,
          orderBy,
          skip,
          take: normalized.limit,
        }),
        db.expense.count({ where }),
      ]);

      return { transactions, totalCount };
    };

    const cacheKey = JSON.stringify(normalized);
    const { transactions, totalCount } = shouldCacheTransactions(normalized)
      ? await getTransactionsCache(userRes.data.id)(cacheKey)
      : await fetchDirect();

    return {
      success: true,
      data: {
        transactions,
        totalCount,
        totalPages: Math.ceil(totalCount / normalized.limit),
        currentPage: normalized.page,
      },
    } as const;
  } catch (error) {
    console.error("Failed to get transactions:", error);
    return { success: false, error: "Failed to get transactions" } as const;
  }
}

export async function getDashboardData(month: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success)
      return { success: false, error: userRes.error } as const;

    const data = await getDashboardCache(userRes.data.id)(month);
    return { success: true, data } as const;
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { success: false, error: "Failed to fetch dashboard data" } as const;
  }
}

// ============================================
// Category Budget Actions
// ============================================

const getCategoryBudgetTag = (userId: string) => `category-budgets-${userId}`;

export async function getCategoryBudgets(month: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const categoryBudgets = await db.categoryBudget.findMany({
      where: {
        userId: userRes.data.id,
        month,
      },
      orderBy: { category: "asc" },
    });

    return { success: true, data: categoryBudgets } as const;
  } catch (error) {
    console.error("Failed to get category budgets:", error);
    return { success: false, error: "Failed to get category budgets" } as const;
  }
}

export interface CategoryBudgetInput {
  category: string;
  amount: number;
  month: string;
}

export async function setCategoryBudget(data: CategoryBudgetInput) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const categoryBudget = await db.categoryBudget.upsert({
      where: {
        userId_category_month: {
          userId: userRes.data.id,
          category: data.category,
          month: data.month,
        },
      },
      update: {
        amount: data.amount,
      },
      create: {
        category: data.category,
        amount: data.amount,
        month: data.month,
        userId: userRes.data.id,
      },
    });

    revalidatePath("/");
    revalidateTag(getCategoryBudgetTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});

    return { success: true, data: categoryBudget } as const;
  } catch (error) {
    console.error("Failed to set category budget:", error);
    return { success: false, error: "Failed to set category budget" } as const;
  }
}

export async function deleteCategoryBudget(id: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const existing = await db.categoryBudget.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Not found or unauthorized" } as const;
    }

    await db.categoryBudget.delete({ where: { id } });

    revalidatePath("/");
    revalidateTag(getCategoryBudgetTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});

    return { success: true } as const;
  } catch (error) {
    console.error("Failed to delete category budget:", error);
    return {
      success: false,
      error: "Failed to delete category budget",
    } as const;
  }
}

// =============================================================================
// CONTACTS & SPLITS - Server Actions
// =============================================================================

import type {
  Contact,
  SplitInput,
  ContactInput,
  Expense,
  ExpenseSplit,
} from "@/lib/types";

const getContactsTag = (userId: string) => `contacts-${userId}`;

/**
 * Get all contacts for the current user
 */
export async function getContacts(): Promise<
  { success: true; data: Contact[] } | { success: false; error: string }
> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const contacts = await db.contact.findMany({
      where: { userId: userRes.data.id },
      orderBy: { name: "asc" },
    });

    return { success: true, data: contacts };
  } catch (error) {
    console.error("Failed to get contacts:", error);
    return { success: false, error: "Failed to get contacts" };
  }
}

/**
 * Add a new contact
 */
export async function addContact(
  data: ContactInput,
): Promise<
  { success: true; data: Contact } | { success: false; error: string }
> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const contact = await db.contact.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        userId: userRes.data.id,
      },
    });

    revalidateTag(getContactsTag(userRes.data.id), {});
    return { success: true, data: contact };
  } catch (error) {
    console.error("Failed to add contact:", error);
    return { success: false, error: "Failed to add contact" };
  }
}

/**
 * Update an existing contact
 */
export async function updateContact(
  id: string,
  data: Partial<ContactInput>,
): Promise<
  { success: true; data: Contact } | { success: false; error: string }
> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const existing = await db.contact.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Contact not found" };
    }

    const contact = await db.contact.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    });

    revalidateTag(getContactsTag(userRes.data.id), {});
    return { success: true, data: contact };
  } catch (error) {
    console.error("Failed to update contact:", error);
    return { success: false, error: "Failed to update contact" };
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const existing = await db.contact.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Contact not found" };
    }

    await db.contact.delete({ where: { id } });

    revalidateTag(getContactsTag(userRes.data.id), {});
    return { success: true };
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return { success: false, error: "Failed to delete contact" };
  }
}

/**
 * Get an expense with its splits
 */
export async function getExpenseWithSplits(
  expenseId: string,
): Promise<
  | { success: true; data: Expense & { splits: ExpenseSplit[] } }
  | { success: false; error: string }
> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        splits: {
          include: { contact: true },
        },
      },
    });

    if (!expense || expense.userId !== userRes.data.id) {
      return { success: false, error: "Expense not found" };
    }

    return {
      success: true,
      data: expense as Expense & { splits: ExpenseSplit[] },
    };
  } catch (error) {
    console.error("Failed to get expense with splits:", error);
    return { success: false, error: "Failed to get expense with splits" };
  }
}

type ExpenseWithSplitsInput = ExpenseInput & {
  isSplit?: boolean;
  splits?: SplitInput[];
};

/**
 * Update an expense with splits
 */
export async function updateExpenseWithSplits(
  id: string,
  data: ExpenseWithSplitsInput,
): Promise<
  { success: true; data: Expense } | { success: false; error: string }
> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing || existing.userId !== userRes.data.id) {
      return { success: false, error: "Expense not found" };
    }

    // Update expense and replace splits in a transaction
    const result = await db.$transaction(async (tx) => {
      // Delete existing splits
      await tx.expenseSplit.deleteMany({ where: { expenseId: id } });

      // Update expense
      const expense = await tx.expense.update({
        where: { id },
        data: {
          amount: data.amount,
          category: data.category,
          date: data.date,
          notes: data.notes,
          type: data.type ?? "expense",
          isSplit: data.isSplit ?? false,
        },
      });

      // Create new splits if provided
      if (data.splits && data.splits.length > 0) {
        await tx.expenseSplit.createMany({
          data: data.splits.map((split) => ({
            expenseId: id,
            contactId: split.contactId,
            amount: split.amount,
            percentage: split.percentage,
            isYourShare: split.isYourShare,
            isPaid: split.isYourShare, // Your share is always "paid"
            paidByYou: true, // You paid for this expense
          })),
        });
      }

      return expense;
    });

    revalidatePath("/");
    revalidateTag(getExpensesTag(userRes.data.id), {});
    revalidateTag(getDashboardTag(userRes.data.id), {});

    return { success: true, data: result as Expense };
  } catch (error) {
    console.error("Failed to update expense with splits:", error);
    return { success: false, error: "Failed to update expense with splits" };
  }
}

/**
 * Mark a split as paid (when someone pays you back)
 */
export async function markSplitAsPaid(
  splitId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error };
    }

    const split = await db.expenseSplit.findUnique({
      where: { id: splitId },
      include: { expense: true },
    });

    if (!split || split.expense.userId !== userRes.data.id) {
      return { success: false, error: "Split not found" };
    }

    await db.expenseSplit.update({
      where: { id: splitId },
      data: { isPaid: true },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark split as paid:", error);
    return { success: false, error: "Failed to mark split as paid" };
  }
}
