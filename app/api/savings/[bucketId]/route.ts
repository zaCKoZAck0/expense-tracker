import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { COLOR_OPTIONS } from "@/components/savings/types";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });
  return user?.id ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bucketId?: string }> },
) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const segments = new URL(req.url ?? "").pathname.split("/").filter(Boolean);
  const bucketId = resolvedParams?.bucketId ?? segments.at(-1);
  if (!bucketId)
    return NextResponse.json(
      { error: "Bucket id is required" },
      { status: 400 },
    );

  const bucket = await db.savingsBucket.findUnique({ where: { id: bucketId } });
  if (!bucket || bucket.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : bucket.name;
  const color = typeof body?.color === "string" ? body.color : bucket.color;
  const goalAmount =
    body?.goalAmount !== undefined
      ? Number(body.goalAmount)
      : bucket.goalAmount;
  const interestYearlyPercent =
    body?.interestYearlyPercent !== undefined
      ? Number(body.interestYearlyPercent)
      : bucket.interestYearlyPercent;

  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const allowedColors = new Set(COLOR_OPTIONS.map((c) => c.id));
  if (!allowedColors.has(color))
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });

  const updated = await db.savingsBucket.update({
    where: { id: bucket.id },
    data: {
      name,
      color,
      goalAmount: goalAmount ?? undefined,
      interestYearlyPercent: interestYearlyPercent ?? undefined,
    },
    include: { entries: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json({ bucket: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ bucketId?: string }> },
) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const segments = new URL(req.url ?? "").pathname.split("/").filter(Boolean);
  const bucketId = resolvedParams?.bucketId ?? segments.at(-1);
  if (!bucketId)
    return NextResponse.json(
      { error: "Bucket id is required" },
      { status: 400 },
    );

  const bucket = await db.savingsBucket.findUnique({ where: { id: bucketId } });
  if (!bucket || bucket.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.savingsBucket.delete({ where: { id: bucketId } });

  return NextResponse.json({ success: true, bucketId });
}
