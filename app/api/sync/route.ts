import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get URL params for filtering
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const fullSync = url.searchParams.get("full") === "true";

    // Calculate date filter if month is provided and not a full sync
    let dateFilter = {};
    if (month && !fullSync) {
      const [year, monthNum] = month.split("-").map(Number);
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
      const nextYear = monthNum === 12 ? year + 1 : year;
      dateFilter = {
        date: {
          gte: new Date(`${year}-${String(monthNum).padStart(2, "0")}-01`),
          lt: new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`),
        },
      };
    }

    // Parallel fetch all data
    const [expenses, budgets, savingsBuckets, savingsEntries] =
      await Promise.all([
        // Fetch expenses (optionally filtered by month, or all for full sync)
        db.expense.findMany({
          where: {
            userId: user.id,
            ...dateFilter,
          },
          include: {
            splits: true,
          },
          orderBy: { date: "desc" },
        }),

        // Fetch all budgets
        db.budget.findMany({
          orderBy: { month: "desc" },
        }),

        // Fetch savings buckets
        db.savingsBucket.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        }),

        // Fetch savings entries
        db.savingsEntry.findMany({
          where: { userId: user.id },
          orderBy: { date: "desc" },
        }),
      ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        currency: user.currency,
        createdAt: user.createdAt,
      },
      expenses,
      budgets,
      savingsBuckets,
      savingsEntries,
    });
  } catch (error) {
    console.error("Sync API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync data" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Use GET for sync data fetch" },
    { status: 405 },
  );
}
