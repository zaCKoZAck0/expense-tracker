"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { unstable_cache } from "next/cache";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
} from "date-fns";

const getAnalyticsTag = (userId: string) => `analytics-${userId}`;

const monthsCacheByUser = new Map<string, ReturnType<typeof unstable_cache>>();
const categoryCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();
const incomeCategoryCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();
const trendCacheByUser = new Map<string, ReturnType<typeof unstable_cache>>();
const activityCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();
const currencyCacheByUser = new Map<
  string,
  ReturnType<typeof unstable_cache>
>();

async function getOrCreateUserId() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { success: false, error: "Unauthorized" } as const;
  }

  const name = session?.user?.name ?? undefined;
  const image = session?.user?.image ?? undefined;

  const user = await db.user.upsert({
    where: { email },
    update: {
      name,
      image,
    },
    create: {
      email,
      name,
      image,
    },
    select: { id: true },
  });

  return { success: true, data: user.id } as const;
}

const getMonthsCache = (userId: string) => {
  const cached = monthsCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async () => {
      const earliestExpense = await db.expense.findFirst({
        orderBy: { date: "asc" },
        select: { date: true },
        where: { userId },
      });

      if (!earliestExpense) {
        return [format(new Date(), "yyyy-MM")];
      }

      const start = startOfMonth(earliestExpense.date);
      const end = startOfMonth(new Date());

      const months: string[] = [];
      let current = start;

      // Iterate month-by-month; cheap due to single user range.
      while (current <= end) {
        months.push(format(current, "yyyy-MM"));
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }

      return months.reverse();
    },
    ["analytics-available-months", userId],
    { tags: [getAnalyticsTag(userId)], revalidate: 900 },
  );

  monthsCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getCategoryCache = (userId: string) => {
  const cached = categoryCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async (monthStr: string) => {
      const date = new Date(`${monthStr}-01`);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      // Only include expenses
      const expenses = await db.expense.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lte: end,
          },
          type: "expense",
        },
        include: {
          splits: {
            where: { isYourShare: true },
            select: { amount: true },
          },
        },
      });

      const categoryTotals = new Map<string, number>();

      for (const expense of expenses) {
        let amount = expense.amount;
        if (expense.isSplit && expense.splits.length > 0) {
          amount = expense.splits[0].amount;
        }

        categoryTotals.set(
          expense.category,
          (categoryTotals.get(expense.category) || 0) + amount,
        );
      }

      const categoryColors: Record<string, string> = {
        Food: "#ef4444",
        Transport: "#f97316",
        Utilities: "#eab308",
        Entertainment: "#84cc16",
        Health: "#10b981",
        Shopping: "#3b82f6",
        Others: "#a855f7",
      };

      const defaultColors = [
        "#14b8a6",
        "#06b6d4",
        "#6366f1",
        "#d946ef",
        "#f43f5e",
      ];

      return Array.from(categoryTotals.entries()).map(
        ([category, amount], index) => ({
          category,
          amount,
          fill:
            categoryColors[category] ||
            defaultColors[index % defaultColors.length],
        }),
      );
    },
    ["analytics-category-data", userId],
    { tags: [getAnalyticsTag(userId)], revalidate: 900 },
  );

  categoryCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getIncomeCategoryCache = (userId: string) => {
  const cached = incomeCategoryCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async (monthStr: string) => {
      const date = new Date(`${monthStr}-01`);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      // Only include income entries
      const incomeEntries = await db.expense.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lte: end,
          },
          type: "income",
        },
        include: {
          splits: {
            where: { isYourShare: true },
            select: { amount: true },
          },
        },
      });

      const categoryTotals = new Map<string, number>();

      for (const entry of incomeEntries) {
        let amount = entry.amount;
        // Logic for income splits if applicable
        if (entry.isSplit && entry.splits.length > 0) {
          amount = entry.splits[0].amount;
        }

        categoryTotals.set(
          entry.category,
          (categoryTotals.get(entry.category) || 0) + amount,
        );
      }

      // Income category colors
      const categoryColors: Record<string, string> = {
        Salary: "#10b981",
        Freelance: "#3b82f6",
        Investments: "#8b5cf6",
        Gifts: "#ec4899",
        Refunds: "#14b8a6",
        Other: "#6366f1",
      };

      const defaultColors = [
        "#22c55e",
        "#0ea5e9",
        "#a855f7",
        "#f43f5e",
        "#eab308",
      ];

      return Array.from(categoryTotals.entries()).map(
        ([category, amount], index) => ({
          category,
          amount,
          fill:
            categoryColors[category] ||
            defaultColors[index % defaultColors.length],
        }),
      );
    },
    ["analytics-income-category-data", userId],
    { tags: [getAnalyticsTag(userId)], revalidate: 900 },
  );

  incomeCategoryCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getTrendCache = (userId: string) => {
  const cached = trendCacheByUser.get(userId);
  if (cached) return cached;

  // Include current month key in cache key so it rolls when time moves forward.
  const currentMonthKey = format(new Date(), "yyyy-MM");

  const cacheFn = unstable_cache(
    async () => {
      const today = new Date();
      const months: Array<{
        date: Date;
        label: string;
        key: string;
        monthYear: string;
      }> = [];

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(today, i);
        months.push({
          date: d,
          label: format(d, "MMMM"),
          key: format(d, "yyyy-MM"),
          monthYear: format(d, "MMMM yyyy"),
        });
      }

      const data = await Promise.all(
        months.map(async (monthMeta) => {
          const start = startOfMonth(monthMeta.date);
          const end = endOfMonth(monthMeta.date);

          // Get only expenses (not income)
          const expenses = await db.expense.findMany({
            where: {
              userId,
              date: {
                gte: start,
                lte: end,
              },
              type: "expense",
            },
            include: {
              splits: {
                where: { isYourShare: true },
                select: { amount: true },
              },
            },
          });

          // Get only income (earnings)
          const incomeEntries = await db.expense.findMany({
            where: {
              userId,
              date: {
                gte: start,
                lte: end,
              },
              type: "income",
            },
            include: {
              splits: {
                where: { isYourShare: true },
                select: { amount: true },
              },
            },
          });

          let expenseSum = 0;
          for (const expense of expenses) {
            let amount = expense.amount;
            if (expense.isSplit && expense.splits.length > 0) {
              amount = expense.splits[0].amount;
            }
            expenseSum += amount;
          }

          let incomeSum = 0;
          for (const entry of incomeEntries) {
            let amount = entry.amount;
            if (entry.isSplit && entry.splits.length > 0) {
              amount = entry.splits[0].amount;
            }
            incomeSum += amount;
          }

          const monthKey = format(monthMeta.date, "yyyy-MM");

          let budget = await db.budget.findUnique({
            where: { month: monthKey },
          });
          if (!budget) {
            budget = await db.budget.findFirst({
              where: { month: { lte: monthKey } },
              orderBy: { month: "desc" },
            });
          }

          return {
            month: monthMeta.label,
            budget: budget?.amount || 0,
            spend: expenseSum,
            earning: incomeSum,
          };
        }),
      );

      return data;
    },
    ["analytics-budget-trend", userId, currentMonthKey],
    { tags: [getAnalyticsTag(userId)], revalidate: 1800 },
  );

  trendCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getActivityCache = (userId: string) => {
  const cached = activityCacheByUser.get(userId);
  if (cached) return cached;

  const today = startOfDay(new Date());
  const startWindow = subMonths(today, 9);
  const startKey = format(startWindow, "yyyy-MM");

  const cacheFn = unstable_cache(
    async () => {
      // Fetch all entries (both expense and income)
      const entries = await db.expense.findMany({
        where: {
          userId,
          date: {
            gte: startWindow,
            lte: today,
          },
        },
        select: {
          amount: true,
          date: true,
          type: true,
          isSplit: true,
          splits: {
            where: { isYourShare: true },
            select: { amount: true },
          },
        },
      });

      const dailyMap = new Map<
        string,
        { expense: number; earning: number; transactions: number }
      >();

      for (const entry of entries) {
        let amount = entry.amount;
        if (entry.isSplit && entry.splits.length > 0) {
          amount = entry.splits[0].amount;
        }

        const dayKey = format(entry.date, "yyyy-MM-dd");
        const prev = dailyMap.get(dayKey) ?? {
          expense: 0,
          earning: 0,
          transactions: 0,
        };
        prev.transactions += 1;
        if (entry.type === "income") {
          prev.earning += amount;
        } else {
          prev.expense += amount;
        }
        dailyMap.set(dayKey, prev);
      }

      return Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        count: data.expense + data.earning, // Total activity for heatmap color
        expense: data.expense,
        earning: data.earning,
        transactions: data.transactions,
      }));
    },
    ["analytics-daily-activity", userId, startKey],
    { tags: [getAnalyticsTag(userId)], revalidate: 1800 },
  );

  activityCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

const getCurrencyCache = (userId: string) => {
  const cached = currencyCacheByUser.get(userId);
  if (cached) return cached;

  const cacheFn = unstable_cache(
    async () => {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      });
      return user?.currency ?? "USD";
    },
    ["analytics-user-currency", userId],
    { tags: [getAnalyticsTag(userId)], revalidate: 3600 },
  );

  currencyCacheByUser.set(userId, cacheFn);
  return cacheFn;
};

export async function getAvailableMonths() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as string[];
  }

  const months = await getMonthsCache(userRes.data)();
  return months; // Newest first
}

export async function getExpenseCategoryData(monthStr: string) {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ category: string; amount: number; fill: string }>;
  }

  const data = await getCategoryCache(userRes.data)(monthStr);
  return data;
}

export async function getIncomeCategoryData(monthStr: string) {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ category: string; amount: number; fill: string }>;
  }

  const data = await getIncomeCategoryCache(userRes.data)(monthStr);
  return data;
}

export async function getBudgetTrendData() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ month: string; budget: number; spend: number }>;
  }

  const data = await getTrendCache(userRes.data)();
  return data;
}

export async function getDailyActivityData() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ date: string; count: number }>;
  }

  const data = await getActivityCache(userRes.data)();
  return data;
}

export async function getUserCurrency() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return "USD";
  }

  return getCurrencyCache(userRes.data)();
}
