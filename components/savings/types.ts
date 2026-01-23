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
    swatchLight: "#ea8a68",
    swatchDark: "#f7c6b5",
  },
  { id: "mint", label: "Mint", swatchLight: "#3ba475", swatchDark: "#b5e3c6" },
  { id: "sky", label: "Sky", swatchLight: "#3b82f6", swatchDark: "#cde8ff" },
  {
    id: "lavender",
    label: "Lavender",
    swatchLight: "#7c69ef",
    swatchDark: "#e1d7ff",
  },
  { id: "gold", label: "Gold", swatchLight: "#d18b16", swatchDark: "#f4d36a" },
  { id: "rose", label: "Rose", swatchLight: "#e05a87", swatchDark: "#ffd1dc" },
  { id: "sage", label: "Sage", swatchLight: "#6d8c6c", swatchDark: "#d8e7d4" },
  {
    id: "denim",
    label: "Denim",
    swatchLight: "#3f69c6",
    swatchDark: "#d2dcff",
  },
  {
    id: "coral",
    label: "Coral",
    swatchLight: "#e4644f",
    swatchDark: "#ffd3c7",
  },
  { id: "plum", label: "Plum", swatchLight: "#8e5dbd", swatchDark: "#ead9ff" },
];

export function getBucketSwatch(
  colorId: string,
  theme: "light" | "dark" | undefined,
): string {
  const option = COLOR_OPTIONS.find((c) => c.id === colorId);
  if (!option) return "#6b7280";
  if (theme === "dark") return option.swatchDark;
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
