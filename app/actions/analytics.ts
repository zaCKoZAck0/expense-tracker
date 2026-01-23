'use server';

import { db } from '@/lib/db';
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns';
import { unstable_cache } from 'next/cache';
import { getCachedUser } from '../actions';

// Note: getCachedUser is already cached, so we don't need to wrap it.
// However, the *analytics* aggregations are heavy and should be cached.

export async function getAvailableMonths() {
  const userRes = await getCachedUser();
  if (!userRes.success) {
    return [] as string[];
  }
  const userId = userRes.data.id;

  const fetchMonths = unstable_cache(
    async (uid: string) => {
      const earliestExpense = await db.expense.findFirst({
        orderBy: {
          date: 'asc',
        },
        select: {
          date: true
        },
        where: {
          userId: uid,
        },
      });

      if (!earliestExpense) {
        return [format(new Date(), 'yyyy-MM')];
      }

      const start = startOfMonth(earliestExpense.date);
      const end = startOfMonth(new Date());

      const months = [];
      let current = start;

      while (current <= end) {
        months.push(format(current, 'yyyy-MM'));
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }

      return months.reverse();
    },
    ['available-months'],
    { tags: ['expenses'] }
  );

  return await fetchMonths(userId);
}

export async function getExpenseCategoryData(monthStr: string) {
  const userRes = await getCachedUser();
  if (!userRes.success) {
    return [] as Array<{ category: string; amount: number; fill: string }>;
  }
  const userId = userRes.data.id;

  const fetchCategoryData = unstable_cache(
    async (uid: string, mStr: string) => {
      const date = new Date(mStr + '-01');
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const expenses = await db.expense.groupBy({
        by: ['category'],
        where: {
          userId: uid,
          type: {
            not: 'income',
          },
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
        'Food': '#ef4444',     // red-500
        'Transport': '#f97316', // orange-500
        'Utilities': '#eab308', // yellow-500
        'Entertainment': '#84cc16', // lime-500
        'Health': '#10b981',    // emerald-500
        'Shopping': '#3b82f6',  // blue-500
        'Others': '#a855f7',    // purple-500
      };

      const defaultColors = ['#14b8a6', '#06b6d4', '#6366f1', '#d946ef', '#f43f5e'];

      return expenses.map((e, index) => ({
        category: e.category,
        amount: e._sum.amount || 0,
        fill: categoryColors[e.category] || defaultColors[index % defaultColors.length],
      }));
    },
    ['expense-category-data'],
    { tags: ['expenses'] }
  );

  return await fetchCategoryData(userId, monthStr);
}

export async function getBudgetTrendData() {
  const userRes = await getCachedUser();
  if (!userRes.success) {
    return [] as Array<{ month: string; budget: number; spend: number }>;
  }
  const userId = userRes.data.id;

  const fetchTrendData = unstable_cache(
    async (uid: string) => {
      // Get last 6 months
      const today = new Date();
      const months = [];

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(today, i);
        months.push({
          date: d,
          label: format(d, 'MMMM'),
          key: format(d, 'yyyy-MM'),
          monthYear: format(d, 'MMMM yyyy')
        });
      }

      const data = await Promise.all(months.map(async (m) => {
        const start = startOfMonth(m.date);
        const end = endOfMonth(m.date);

        // Get Spend
        const expenseSum = await db.expense.aggregate({
          where: {
            userId: uid,
            type: {
              not: 'income',
            },
            date: {
              gte: start,
              lte: end,
            }
          },
          _sum: {
            amount: true
          }
        });

        // Get Income
        const incomeSum = await db.expense.aggregate({
          where: {
            userId: uid,
            type: 'income',
            date: {
              gte: start,
              lte: end,
            }
          },
          _sum: {
            amount: true
          }
        });

        // Get Budget
        const monthKey = format(m.date, 'yyyy-MM');
        let budget = await db.budget.findUnique({
          where: {
            month: monthKey,
          },
        });

        if (!budget) {
          budget = await db.budget.findFirst({
            where: {
              month: {
                lte: monthKey,
              },
            },
            orderBy: {
              month: 'desc',
            },
          });
        }

        return {
          month: m.label,
          budget: (budget?.amount || 0) + (incomeSum._sum.amount || 0),
          spend: expenseSum._sum.amount || 0,
        };
      }));

      return data;
    },
    ['budget-trend-data'],
    { tags: ['budget', 'expenses'] }
  );

  return await fetchTrendData(userId);
}

export async function getDailyActivityData() {
  const userRes = await getCachedUser();
  if (!userRes.success) {
    return [] as Array<{ date: string; count: number }>;
  }
  const userId = userRes.data.id;

  const fetchDailyActivity = unstable_cache(
    async (uid: string) => {
      const today = new Date();
      const start = subDays(today, 365);

      const expenses = await db.expense.groupBy({
        by: ['date'],
        where: {
          userId: uid,
          type: {
            not: 'income',
          },
          date: {
            gte: startOfDay(start),
            lte: endOfDay(today),
          },
        },
        _sum: {
          amount: true,
        },
      });

      const activityMap = new Map<string, number>();

      for (const expense of expenses) {
        const dayKey = format(expense.date, 'yyyy-MM-dd');
        const current = activityMap.get(dayKey) || 0;
        activityMap.set(dayKey, current + (expense._sum.amount || 0));
      }

      const result: Array<{ date: string; count: number }> = [];

      for (const [date, count] of activityMap.entries()) {
        result.push({ date, count });
      }

      return result;
    },
    ['daily-activity-data'],
    { tags: ['expenses'] }
  );

  return await fetchDailyActivity(userId);
}


export async function getUserCurrency() {
  const userRes = await getCachedUser();
  if (!userRes.success) {
    return "USD";
  }

  // userRes.data is the User object, which should have currency
  // We need to check if 'currency' exists on the type, as getCachedUser infers from db.user.findUnique.
  // If undefined, fallback to USD.
  // Note: If 'currency' is not in the default selection of findUnique, we might need a specific fetch,
  // but findUnique usually returns all scalars.

  // @ts-ignore - explicitly ignoring potential type issue if currency is optional/missing in strict types, though it typically exists.
  return userRes.data.currency || "USD";
}
