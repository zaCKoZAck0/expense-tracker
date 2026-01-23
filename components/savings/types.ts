import { format } from "date-fns";

export interface SavingsEntry {
  id: string;
  amount: number;
  date: string; // ISO string
  entryType: "deposit" | "withdrawal";
  notes?: string;
  createdAt?: string;
  bucketId?: string;
  userId?: string;
}

export interface SavingsBucket {
  id: string;
  name: string;
  color: string;
  goalAmount?: number;
  interestYearlyPercent?: number;
  entries: SavingsEntry[];
  createdAt: string;
  userId?: string;
}

export const STORAGE_KEY = "savings_buckets_v1";

export const COLOR_OPTIONS: { id: string; label: string; swatch: string }[] = [
  { id: "peach", label: "Peach", swatch: "#fcd5ce" },
  { id: "mint", label: "Mint", swatch: "#d8f3dc" },
  { id: "sky", label: "Sky", swatch: "#e0f2fe" },
  { id: "lavender", label: "Lavender", swatch: "#ede9fe" },
  { id: "gold", label: "Gold", swatch: "#fef3c7" },
  { id: "rose", label: "Rose", swatch: "#ffe4e6" },
  { id: "sage", label: "Sage", swatch: "#e4f1e1" },
  { id: "denim", label: "Denim", swatch: "#e3e8ff" },
  { id: "coral", label: "Coral", swatch: "#ffe5d9" },
  { id: "plum", label: "Plum", swatch: "#f3e8ff" },
];

export function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export function daysBetween(startISO: string, end: Date) {
  const start = new Date(startISO);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function computeBucketStats(bucket: SavingsBucket) {
  const today = new Date();
  const rate = bucket.interestYearlyPercent ?? 0;

  let deposits = 0;
  let withdrawals = 0;
  let totalBalance = 0;

  for (const entry of bucket.entries) {
    if (entry.entryType === "withdrawal") {
      withdrawals += entry.amount;
      totalBalance -= entry.amount;
      continue;
    }
    const days = daysBetween(entry.date, today);
    const growth =
      rate > 0
        ? entry.amount * Math.pow(1 + rate / 100, days / 365)
        : entry.amount;
    deposits += entry.amount;
    totalBalance += growth;
  }

  const totalContributed = deposits - withdrawals;
  const interestEarned = totalBalance - totalContributed;
  return {
    totalContributed,
    totalBalance,
    interestEarned,
    deposits,
    withdrawals,
  };
}

export function bucketProgress(bucket: SavingsBucket) {
  if (!bucket.goalAmount || bucket.goalAmount <= 0) return 0;
  const { totalBalance } = computeBucketStats(bucket);
  return Math.min(100, Math.round((totalBalance / bucket.goalAmount) * 100));
}

export function formatBucketDate(dateISO: string) {
  return format(new Date(dateISO), "MMM d, yyyy");
}
