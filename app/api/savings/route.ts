import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { COLOR_OPTIONS } from "@/components/savings/types";

async function getOrCreateUserId() {
  const session = await auth();
  if (!session?.user?.email) return null;

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

  return user.id;
}

export async function GET() {
  const userId = await getOrCreateUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buckets = await db.savingsBucket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      entries: {
        orderBy: { date: "desc" },
      },
    },
  });

  return NextResponse.json({ buckets });
}

export async function POST(req: Request) {
  const userId = await getOrCreateUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = typeof body?.color === "string" ? body.color : "";
  const goalAmount =
    body?.goalAmount !== undefined ? Number(body.goalAmount) : undefined;
  const interestYearlyPercent =
    body?.interestYearlyPercent !== undefined
      ? Number(body.interestYearlyPercent)
      : undefined;

  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const allowedColors = new Set(COLOR_OPTIONS.map((c) => c.id));
  if (!allowedColors.has(color))
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });

  try {
    const bucket = await db.savingsBucket.create({
      data: {
        name,
        color,
        goalAmount: goalAmount ?? undefined,
        interestYearlyPercent: interestYearlyPercent ?? undefined,
        userId,
      },
      include: { entries: { orderBy: { date: "desc" } } },
    });

    return NextResponse.json({ bucket });
  } catch (err) {
    console.error("Failed to create savings bucket", err);
    return NextResponse.json(
      { error: "Failed to create bucket" },
      { status: 500 },
    );
  }
}
