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

      const expenses = await db.expense.groupBy({
        by: ["category"],
        where: {
          userId,
          date: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          amount: true,
        },
      });

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

      return expenses.map((entry, index) => ({
        category: entry.category,
        amount: entry._sum.amount || 0,
        fill:
          categoryColors[entry.category] ||
          defaultColors[index % defaultColors.length],
      }));
    },
    ["analytics-category-data", userId],
    { tags: [getAnalyticsTag(userId)], revalidate: 900 },
  );

  categoryCacheByUser.set(userId, cacheFn);
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

          const expenseSum = await db.expense.aggregate({
            where: {
              userId,
              date: {
                gte: start,
                lte: end,
              },
            },
            _sum: { amount: true },
          });

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
            spend: expenseSum._sum.amount || 0,
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
      const entries = await db.expense.findMany({
        where: {
          userId,
          type: "expense",
          date: {
            gte: startWindow,
            lte: today,
          },
        },
        select: { amount: true, date: true },
      });

      const dailyMap = new Map<string, number>();

      for (const entry of entries) {
        const dayKey = format(entry.date, "yyyy-MM-dd");
        const prev = dailyMap.get(dayKey) ?? 0;
        dailyMap.set(dayKey, prev + entry.amount);
      }

      return Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        count,
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
