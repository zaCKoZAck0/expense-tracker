import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });
  return user?.id ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: { bucketId?: string } },
) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = new URL(req.url ?? "").pathname.split("/").filter(Boolean);
  const bucketId = params?.bucketId ?? segments.at(-2);
  if (!bucketId)
    return NextResponse.json(
      { error: "Bucket id is required" },
      { status: 400 },
    );

  const bucket = await db.savingsBucket.findUnique({ where: { id: bucketId } });
  if (!bucket || bucket.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow overdraft: we do not block withdrawals that exceed current balance.
  // We compute the projected balance purely for response context.
  const existingEntries = await db.savingsEntry.findMany({
    where: { bucketId },
    select: { amount: true, entryType: true },
  });
  const currentBalance = existingEntries.reduce((total, entry) => {
    return entry.entryType === "withdrawal"
      ? total - entry.amount
      : total + entry.amount;
  }, 0);

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount ?? 0);
  const dateStr = typeof body?.date === "string" ? body.date : null;
  const entryType = body?.type === "withdrawal" ? "withdrawal" : "deposit";
  const notes =
    typeof body?.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : undefined;

  if (!amount || amount <= 0)
    return NextResponse.json(
      { error: "Amount must be positive" },
      { status: 400 },
    );
  if (!dateStr)
    return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const projectedBalance =
    entryType === "withdrawal"
      ? currentBalance - amount
      : currentBalance + amount;
  const isOverdraft = entryType === "withdrawal" && projectedBalance < 0;

  const entry = await db.savingsEntry.create({
    data: {
      amount,
      date: new Date(dateStr),
      entryType,
      notes,
      bucketId: bucket.id,
      userId,
    },
  });

  const updatedBucket = await db.savingsBucket.findUnique({
    where: { id: bucket.id },
    include: { entries: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json({
    bucket: updatedBucket,
    entry,
    overdraft: isOverdraft,
  });
}
