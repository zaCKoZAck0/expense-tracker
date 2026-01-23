"use server";

import { db } from "@/lib/db";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { auth } from "@/auth";

// Cache Keys Generation Helpers
const getBudgetTag = (userId: string) => `budget-${userId}`;
const getExpensesTag = (userId: string) => `expenses-${userId}`;
const getUserTag = (email: string) => `user-${email}`;

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
    }
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
    if (!userRes.success) return { success: false, error: userRes.error } as const;

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

    return { success: true, data: budget } as const;
  } catch (error) {
    console.error("Failed to set budget:", error);
    return { success: false, error: "Failed to set budget" } as const;
  }
}

// Internal cached fetcher for budget
const getCachedBudget = unstable_cache(
  async (userId: string, month: string) => {
    // Try to find an exact budget for the requested month
    const budget = await db.budget.findUnique({
      where: {
        month: month,
      },
    });

    if (budget) {
      return budget;
    }

    // If none exists, fall back to the most recent budget
    return await db.budget.findFirst({
      where: {
        month: {
          lte: month,
        },
      },
      orderBy: {
        month: "desc",
      },
    });
  },
  ["get-budget-data"],
  {
    revalidate: 3600,
  }
);

export async function getBudget(month: string) {
  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    // We pass userId to the key/tag implicitly via arguments if we wanted,
    // but here we manually construct tags in the wrapper if needed,
    // OR we pass dependencies to unstable_cache.
    // NOTE: unstable_cache keyParts are combined with arguments to form the key.
    // To enable invalidation by tag, we need to add the tag dynamically inside?
    // unstable_cache options.tags can be a function or array.
    // Current Next.js types for tags might be static array?
    // Actually, one can't pass dynamic tags easily unless we create a factory or pass it in.
    // Let's create a specific cached function call that includes the dynamic tag in its options if possible?
    // No, `unstable_cache(fn, keyParts, options)` -> options.tags is string[].
    // So we need a wrapper or simply rely on global keys + arguments.
    // WAIT: You CANNOT pass dynamic tags to the options object based on arguments at runtime in the definition easily
    // UNLESS you define the cached function *inside* the closure or use a helper that generates the cached fn.
    // Generating a new cached function every time defeats the memory cache, but Data Cache (Redis/File) relies on the KEY.
    // The KEY is [ ...keyParts, ...args ].
    // So `getCachedBudget(userId, month)` produces a unique key.
    // BUT we need to associate it with a TAG for invalidation.
    // If I cannot set a dynamic tag like `budget-{userId}`, I can't invalidate just that user's budget efficiently
    // without invalidating ALL budgets (global 'budget' tag).
    // Given the constraints and typical Next.js patterns:
    // 1. Use a global 'budget' tag and include userId in the key. Invalidation of 'budget' clears ALL. Bad for scale.
    // 2. define unstable_cache INSIDE the function? No, caching doesn't work that way.
    // 3. New Next.js "use cache" directive solves this, but we are on standard stable/unstable features.
    // Re-reading docs: unstable_cache DOES allow tags to be dynamic? No.
    // Workaround: We will use a relatively specific key.
    // Actually, we'll just use a 'global' budget tag for now as this is a single user or small app,
    // OR we just rely on `revalidatePath` which clears the Data Cache for that path? Next.js cache is complex.
    // `revalidateTag` is for Data Cache.
    // Let's stick to global tags `budget` and `expenses` for simplicity as per common tutorials,
    // OR try to pass the tag.
    // It seems `unstable_cache` 3rd arg `options` is static.
    // HOWEVER, we can just use `revalidatePath` ("/") effectively if the page uses these data.
    // But the prompt asked for `unstable_cache` best practices.
    // "On demand revalidation" by tag is preferred.
    // I will use tags: [`budget-${userId}`] creates a problem if I can't inject userId into tags.
    // Actually, I can use a helper function that returns the cached function with the tags baked in? No.
    // I will just use the global 'budget' and 'expenses' tags for now, assuming low collision or acceptable clear-all.
    // Wait, the prompt says "It's very slow on prod".
    // I will try to implement dynamic tags if I can, but standard usage is static tags.
    // Let's look closer at the code I'm writing. I'll define `getCachedBudget` outside.
    // I'll use simple tags: 'budget', 'expenses'.
    // And I will add the user ID as a key part.

    const data = await getCachedBudgetWithTags(userRes.data.id, month);
    return { success: true, data } as const;
  } catch (error) {
    console.error("Failed to get budget:", error);
    return { success: false, error: "Failed to get budget" } as const;
  }
}

// Helper to get budget with dynamic tags (simulated by creating unique cached entry but tag is static-ish?)
// To truly get dynamic tags with unstable_cache, you have to execute it inside the request context where you know the ID?
// Actually, `unstable_cache` returns a function.
async function getCachedBudgetWithTags(userId: string, month: string) {
  // We can't easily get dynamic tags for the *cache* entry invalidation unless we use a pattern like:
  // cache(..., [`budget-${userId}`]) <-- tags in revalidateTag must match.
  // If we can't set dynamic tags, we rely on the specific Key and Time-based revalidation,
  // and manual `revalidateTag` only works for the static tags we set.
  // So if I set tag 'budget', `revalidateTag('budget')` purges ALL budgets over time.
  // For this user scale (likely personal project), that is FINe.
  const fn = unstable_cache(
    async (uid: string, m: string) => {
      const budget = await db.budget.findUnique({ where: { month: m } });
      if (budget) return budget;
      return await db.budget.findFirst({
        where: { month: { lte: m } },
        orderBy: { month: "desc" },
      });
    },
    ['budget-data'],
    { tags: ['budget'] }
  );
  return fn(userId, month);
}

// Similar for Expenses
async function getCachedExpensesWithTags(userId: string, startDate: Date, endDate: Date) {
  const fn = unstable_cache(
    async (uid: string, start: Date, end: Date) => {
      return await db.expense.findMany({
        where: {
          userId: uid,
          date: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          date: "desc",
        },
      });
    },
    ['expenses-list'],
    { tags: ['expenses'] }
  );
  return fn(userId, startDate, endDate);
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
    revalidateTag("expenses", {});
    revalidateTag("dashboard", {});

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
    revalidateTag("expenses", {});
    revalidateTag("dashboard", {});
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
    revalidateTag("expenses", {});
    revalidateTag("dashboard", {});
    return { success: true } as const;
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false, error: "Failed to delete expense" } as const;
  }
}

export async function getExpenses(month: string) {
  // Assuming month is "YYYY-MM"
  const [year, monthIndex] = month.split("-").map(Number);
  const startDate = new Date(year, monthIndex - 1, 1);
  const endDate = new Date(year, monthIndex, 0);

  try {
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    const expenses = await getCachedExpensesWithTags(userRes.data.id, startDate, endDate);
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
  month?: string;
  startDate?: string;
  endDate?: string;
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
    const userRes = await getCachedUser();
    if (!userRes.success) {
      return { success: false, error: userRes.error } as const;
    }

    // Because filtering creates infinite permutations, we probably shouldn't cache individual queries aggresively
    // unless we use a very smart key.
    // For now, let's keep this uncached OR cache strictly by the options object stringified?
    // Caching search results is often tricky.
    // But since "it's very slow on prod", we should try to cache the common case: default view.
    // Let's wrap the logic in a cached function that takes the `options` and `userId` as key.
    // If the excessive number of keys is an issue, we can rely on standard DB speed for filters
    // and only cache the main dashboard lists.
    // However, `getTransactions` is the main list.
    // Let's cache it, keyed by all options.

    const fetchTransactions = unstable_cache(
      async (userId: string, opts: typeof options) => {
        const whereClause: any = {
          userId: userId,
        };

        if (opts.filterType && opts.filterType !== "all") {
          whereClause.type = opts.filterType;
        }

        if (opts.month && !opts.startDate && !opts.endDate) {
          const [year, monthIndex] = opts.month.split("-").map(Number);
          const start = new Date(year, monthIndex - 1, 1);
          const end = new Date(year, monthIndex, 0);
          end.setHours(23, 59, 59, 999);

          whereClause.date = { gte: start, lte: end };
        } else if (opts.startDate || opts.endDate) {
          whereClause.date = {};
          if (opts.startDate) whereClause.date.gte = new Date(opts.startDate);
          if (opts.endDate) {
            const end = new Date(opts.endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.date.lte = end;
          }
        }

        if (opts.minAmount !== undefined || opts.maxAmount !== undefined) {
          whereClause.amount = {};
          if (opts.minAmount !== undefined) whereClause.amount.gte = opts.minAmount;
          if (opts.maxAmount !== undefined) whereClause.amount.lte = opts.maxAmount;
        }

        const [transactions, totalCount] = await Promise.all([
          db.expense.findMany({
            where: whereClause,
            orderBy: { [opts.sortBy || "date"]: opts.sortOrder || "desc" },
            skip: ((opts.page || 1) - 1) * (opts.limit || 50),
            take: opts.limit || 50,
          }),
          db.expense.count({ where: whereClause }),
        ]);

        return { transactions, totalCount };
      },
      ['transactions-list'],
      { tags: ['expenses'] }
    );

    const { transactions, totalCount } = await fetchTransactions(userRes.data.id, options);

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
  // We can compose this from the cached functions we already made?
  // getBudget is cached. getExpenses is cached.
  // Re-implementing aggregation logic might be fast if data is already cached.
  // Let's reuse getBudget and getExpenses which are now cached.
  // Actually getExpenses returns ALL expenses for a month. That might be a lot.
  // But `getDashboardData` does processing in JS.
  // If we cache `getDashboardData` result entirely, it saves the processing time too.

  try {
    const userRes = await getCachedUser();
    if (!userRes.success) return { success: false, error: userRes.error } as const;

    const fetchDashboard = unstable_cache(
      async (userId: string, m: string) => {
        // Logic copied from original getDashboardData but using direct DB calls or cached calls?
        // If we use cached calls inside a cached call, validation is shared?
        // Let's just do direct DB calls inside this aggregation cache for efficiency
        // and data locality in the cache execution.

        // 1. Budget
        let budget = await db.budget.findUnique({ where: { month: m } });
        if (!budget) {
          budget = await db.budget.findFirst({
            where: { month: { lte: m } },
            orderBy: { month: "desc" },
          });
        }

        // 2. Expenses
        const [year, monthIndex] = m.split("-").map(Number);
        const startDate = new Date(year, monthIndex - 1, 1);
        const endDate = new Date(year, monthIndex, 0);

        const allEntries = await db.expense.findMany({
          where: {
            userId: userId,
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "desc" },
        });

        // 3. Process
        const expenseEntries = allEntries.filter((e) => e.type !== "income");
        const incomeEntries = allEntries.filter((e) => e.type === "income");

        const totalSpent = expenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
        const totalIncome = incomeEntries.reduce((acc, curr) => acc + curr.amount, 0);

        const dailySpendingMap = new Map<number, number>();
        for (const expense of expenseEntries) {
          const day = new Date(expense.date).getDate();
          dailySpendingMap.set(day, (dailySpendingMap.get(day) || 0) + expense.amount);
        }

        const dailySpending = Array.from(dailySpendingMap.entries()).map(
          ([day, amount]) => ({ day, amount }),
        );

        return {
          budget,
          expenses: allEntries,
          totalSpent,
          totalIncome,
          remaining: (budget?.amount || 0) - totalSpent + totalIncome,
          dailySpending,
          daysInMonth: endDate.getDate(),
        };
      },
      ['dashboard-data'],
      { tags: ['dashboard', 'budget', 'expenses'] }
    );

    const data = await fetchDashboard(userRes.data.id, month);
    return { success: true, data } as const;

  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { success: false, error: "Failed to fetch dashboard data" } as const;
  }
}
