import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      image: user.image,
      currency: user.currency,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const currency =
    typeof body.currency === "string" ? body.currency.toUpperCase() : undefined;

  if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      { error: "Invalid or unsupported currency" },
      { status: 400 },
    );
  }

  try {
    const user = await db.user.update({
      where: { email: session.user.email },
      data: { currency },
    });

    return NextResponse.json({ success: true, currency: user.currency });
  } catch (err) {
    console.error("Failed to update currency", err);
    return NextResponse.json(
      { error: "Failed to update currency" },
      { status: 500 },
    );
  }
}
