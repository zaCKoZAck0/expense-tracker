"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

import { Expense } from "@/lib/types";
import { getCurrentMonthKey } from "@/lib/utils";

export type Page =
  | "dashboard"
  | "analytics"
  | "savings"
  | "profile"
  | "transactions";

type NavigationContextType = {
  page: Page;
  selectedExpense: Expense | null;
  openExpense: (expense: Expense) => void;
  closeExpense: () => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const pageParam = searchParams.get("page");
  const page = useMemo<Page>(() => {
    // Normalize query params to supported pages to avoid invalid state.
    if (
      pageParam === "analytics" ||
      pageParam === "profile" ||
      pageParam === "savings" ||
      pageParam === "transactions"
    ) {
      return pageParam;
    }
    return "dashboard";
  }, [pageParam]);

  const currentMonth = getCurrentMonthKey();
  const monthParam = searchParams.get("month");

  // Validate month param: must be past or current, not future
  const validatedMonth = useMemo(() => {
    if (!monthParam) return currentMonth;

    // Check if month is valid format YYYY-MM
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(monthParam)) return currentMonth;

    // Ensure month is not in the future
    if (monthParam > currentMonth) return currentMonth;

    return monthParam;
  }, [monthParam, currentMonth]);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  // Show expense detail on dashboard and transactions pages
  const visibleExpense =
    page === "dashboard" || page === "transactions" ? selectedExpense : null;

  // Refresh key to trigger data refetch in child components
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const openExpense = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  const closeExpense = () => {
    setSelectedExpense(null);
  };

  const setSelectedMonth = useCallback(
    (month: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  return (
    <NavigationContext.Provider
      value={{
        page,
        selectedExpense: visibleExpense,
        openExpense,
        closeExpense,
        selectedMonth: validatedMonth,
        setSelectedMonth,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx)
    throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
