'use server';

import { db } from '@/lib/db';
import { auth } from '@/auth';
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns';

async function getOrCreateUserId() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { success: false, error: 'Unauthorized' } as const;
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

export async function getAvailableMonths() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as string[];
  }

  // Get all unique months from expenses
  // We can group by month-year
  // Since prisma doesn't support complex date grouping easily in `groupBy` for all DBs without raw query,
  // we might fetch min/max date or just distinct dates if dataset is small.
  // For scalability, let's use a raw query or just fetch all dates (lean) and process in JS if not too large.
  // Or better, let's just find the earliest expense and generate months from there.

  const earliestExpense = await db.expense.findFirst({
    orderBy: {
      date: 'asc',
    },
    select: {
      date: true
    },
    where: {
      userId: userRes.data,
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

  return months.reverse(); // Newest first
}

export async function getExpenseCategoryData(monthStr: string) {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ category: string; amount: number; fill: string }>;
  }

  // monthStr is 'yyyy-MM'
  const date = new Date(monthStr + '-01');
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  const expenses = await db.expense.groupBy({
    by: ['category'],
    where: {
      userId: userRes.data,
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

  // Default color if not in map
  const defaultColors = ['#14b8a6', '#06b6d4', '#6366f1', '#d946ef', '#f43f5e'];

  return expenses.map((e, index) => ({
    category: e.category,
    amount: e._sum.amount || 0,
    fill: categoryColors[e.category] || defaultColors[index % defaultColors.length],
  }));
}

export async function getBudgetTrendData() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ month: string; budget: number; spend: number }>;
  }

  // Get last 6 months
  const today = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = subMonths(today, i);
    months.push({
      date: d,
      label: format(d, 'MMMM'),
      key: format(d, 'yyyy-MM'), // to match budget month string format if needed
      monthYear: format(d, 'MMMM yyyy')
    });
  }

  const data = await Promise.all(months.map(async (m) => {
    const start = startOfMonth(m.date);
    const end = endOfMonth(m.date);

    // Get Spend
    const expenseSum = await db.expense.aggregate({
      where: {
        userId: userRes.data,
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
        userId: userRes.data,
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
    // Assuming budget is stored with month string like 'January 2024' or '2024-01'?
    // Let's check schema/existing code.
    // Schema says: `month String @unique`.
    // We should double check what format is stored.
    // Typically it might be "January 2025" based on typical dashboard apps, or ISO.
    // I'll assume "MMMM yyyy" for now based on standard user behavior or "yyyy-MM".
    // I will try both or check the DB if I can.
    // Let's try to find a budget to verify format.

    // Get Budget for the month key
    const monthKey = format(m.date, 'yyyy-MM');

    // Try exact match first
    let budget = await db.budget.findUnique({
      where: {
        month: monthKey,
      },
    });

    // If no exact budget exists for this month, fall back to the most recent prior budget.
    // This applies the last set budget to subsequent months until changed without modifying past months.
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
}

export async function getDailyActivityData() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return [] as Array<{ date: string; count: number }>;
  }

  // Get last 365 days
  const today = new Date();
  const start = subDays(today, 365);

  const expenses = await db.expense.groupBy({
    by: ['date'],
    where: {
      userId: userRes.data,
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

  // Transform to { date: 'YYYY-MM-DD', count: amount }
  // Note: Prisma groupBy on date might return full ISO timestamps.
  // We need to aggregate by day in JS if the DB stores full timestamps.
  // Assuming SQLite/Postgres date-time storage, distinct timestamps means we definitely need to aggregate.

  const activityMap = new Map<string, number>();

  for (const expense of expenses) {
    const dayKey = format(expense.date, 'yyyy-MM-dd');
    const current = activityMap.get(dayKey) || 0;
    activityMap.set(dayKey, current + (expense._sum.amount || 0));
  }

  const result: Array<{ date: string; count: number }> = [];

  // Fill in relevant data points (we don't strictly need to fill zeroes here,
  // the frontend component can handle missing dates or we pass sparse data).
  // Let's pass sparse data to accept existing dates.
  for (const [date, count] of activityMap.entries()) {
    result.push({ date, count });
  }

  return result;
}


export async function getUserCurrency() {
  const userRes = await getOrCreateUserId();
  if (!userRes.success) {
    return "USD";
  }

  const user = await db.user.findUnique({
    where: { id: userRes.data },
    select: { currency: true },
  });

  return user?.currency || "USD";
}
