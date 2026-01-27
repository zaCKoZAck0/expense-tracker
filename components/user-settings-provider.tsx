"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

type UserSettings = {
  currency: string;
  setCurrency: (currency: string) => Promise<boolean>;
  includeEarningInBudget: boolean;
  setIncludeEarningInBudget: (value: boolean) => void;
  loading: boolean;
};

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

const UserSettingsContext = createContext<UserSettings | null>(null);

export function UserSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<string>("USD");
  const [includeEarningInBudget, setIncludeEarningInBudgetState] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached =
      typeof window !== "undefined"
        ? window.localStorage.getItem("user_currency")
        : null;
    if (cached) setCurrencyState(cached);

    // Load includeEarningInBudget from localStorage
    const earningInBudgetCached =
      typeof window !== "undefined"
        ? window.localStorage.getItem("include_earning_in_budget")
        : null;
    if (earningInBudgetCached !== null) {
      setIncludeEarningInBudgetState(earningInBudgetCached === "true");
    }

    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/user");
        const data = await res.json();
        if (!mounted) return;
        if (data?.user?.currency) {
          setCurrencyState(data.user.currency);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("user_currency", data.user.currency);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user settings", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function setCurrency(newCurrency: string) {
    const currencyCode = newCurrency?.toUpperCase?.();
    if (!SUPPORTED_CURRENCIES.includes(currencyCode)) {
      toast.error("Unsupported currency");
      return false;
    }

    setCurrencyState(currencyCode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("user_currency", currencyCode);
    }

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: currencyCode }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success("Currency updated");
        return true;
      }
      toast.error(json?.error || "Failed to update currency");
      return false;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update currency");
      return false;
    }
  }

  function setIncludeEarningInBudget(value: boolean) {
    setIncludeEarningInBudgetState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("include_earning_in_budget", String(value));
    }
  }

  return (
    <UserSettingsContext.Provider value={{ currency, setCurrency, includeEarningInBudget, setIncludeEarningInBudget, loading }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx)
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
