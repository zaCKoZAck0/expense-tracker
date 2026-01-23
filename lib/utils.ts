import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function getCurrentMonthKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatDateUTC(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options,
  }).format(date);
}

/**
 * Converts a local date to UTC noon to avoid timezone boundary issues.
 * When a user selects "Jan 20" in their local timezone, we want to store
 * it as Jan 20 12:00 UTC, not Jan 19 18:30 UTC (which happens when local
 * midnight is converted to UTC for timezones ahead of UTC).
 */
export function toUTCNoon(localDate: Date): Date {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  // Create a new date at noon UTC for the given year/month/day
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
}

export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
) {
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  if (absDiff < 60 * 1000) {
    return "just now";
  }

  const units: Array<{
    limit: number;
    divisor: number;
    unit: Intl.RelativeTimeFormatUnit;
  }> = [
      { limit: 60 * 60 * 1000, divisor: 60 * 1000, unit: "minute" },
      { limit: 24 * 60 * 60 * 1000, divisor: 60 * 60 * 1000, unit: "hour" },
      {
        limit: Number.POSITIVE_INFINITY,
        divisor: 24 * 60 * 60 * 1000,
        unit: "day",
      },
    ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const bucket = units.find((item) => absDiff < item.limit) ?? units[0];
  const value = Math.round(diff / bucket.divisor);
  return formatter.format(value, bucket.unit);
}
