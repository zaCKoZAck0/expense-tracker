"use client";

import { TransactionsPageClient } from "@/components/transactions-page-client";

// This is now a client component that uses Dexie for data
export default function TransactionsPage() {
  return <TransactionsPageClient />;
}
