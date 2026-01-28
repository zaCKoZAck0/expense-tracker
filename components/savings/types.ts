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

export type ColorOption = {
  id: string;
  label: string;
  swatchLight: string;
  swatchDark: string;
};

export const STORAGE_KEY = "savings_buckets_v1";

export const COLOR_OPTIONS: ColorOption[] = [
  {
    id: "peach",
    label: "Peach",
    swatchLight: "var(--chart-3)",
    swatchDark: "var(--chart-3)",
  },
  { id: "mint", label: "Mint", swatchLight: "var(--chart-5)", swatchDark: "var(--chart-5)" },
  { id: "sky", label: "Sky", swatchLight: "var(--chart-4)", swatchDark: "var(--chart-4)" },
  {
    id: "lavender",
    label: "Lavender",
    swatchLight: "var(--chart-1)",
    swatchDark: "var(--chart-1)",
  },
  { id: "gold", label: "Gold", swatchLight: "var(--chart-2)", swatchDark: "var(--chart-2)" },
  { id: "rose", label: "Rose", swatchLight: "var(--destructive)", swatchDark: "var(--destructive)" },
  { id: "sage", label: "Sage", swatchLight: "var(--secondary)", swatchDark: "var(--secondary)" },
  {
    id: "denim",
    label: "Denim",
    swatchLight: "var(--primary)",
    swatchDark: "var(--primary)",
  },
  {
    id: "coral",
    label: "Coral",
    swatchLight: "var(--chart-3)",
    swatchDark: "var(--chart-3)",
  },
  { id: "plum", label: "Plum", swatchLight: "var(--muted-foreground)", swatchDark: "var(--muted-foreground)" },
];

export function getBucketSwatch(
  colorId: string,
  theme: "light" | "dark" | undefined,
): string {
  const option = COLOR_OPTIONS.find((c) => c.id === colorId);
  if (!option) return "var(--muted)";
  // Theme vars handle light/dark automatically, so we can return the same var
  return option.swatchLight;
}

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
