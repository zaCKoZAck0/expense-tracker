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

export async function PATCH(
  req: Request,
  { params }: { params: { entryId: string } },
) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await db.savingsEntry.findUnique({
    where: { id: params.entryId },
    select: {
      id: true,
      bucketId: true,
      userId: true,
      amount: true,
      date: true,
      notes: true,
    },
  });
  if (!entry || entry.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const amount =
    body?.amount !== undefined ? Number(body.amount) : entry.amount;
  const dateStr =
    typeof body?.date === "string" ? body.date : entry.date.toISOString();
  const notes =
    typeof body?.notes === "string" ? body.notes : (entry.notes ?? undefined);

  if (!amount || amount <= 0)
    return NextResponse.json(
      { error: "Amount must be positive" },
      { status: 400 },
    );

  await db.savingsEntry.update({
    where: { id: entry.id },
    data: {
      amount,
      date: new Date(dateStr),
      notes: notes?.trim() || undefined,
    },
  });

  const updatedBucket = await db.savingsBucket.findUnique({
    where: { id: entry.bucketId },
    include: { entries: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json({ bucket: updatedBucket });
}

export async function DELETE(
  req: Request,
  { params }: { params: { entryId?: string } },
) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entryId =
    params?.entryId ??
    new URL(req.url ?? "").pathname.split("/").filter(Boolean).pop();
  if (!entryId)
    return NextResponse.json(
      { error: "Entry id is required" },
      { status: 400 },
    );

  const entry = await db.savingsEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.savingsEntry.delete({ where: { id: entryId } });

  const updatedBucket = await db.savingsBucket.findUnique({
    where: { id: entry.bucketId },
    include: { entries: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json({ bucket: updatedBucket, entryId });
}
