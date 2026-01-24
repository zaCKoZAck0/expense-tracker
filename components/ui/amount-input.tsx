"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/components/user-settings-provider";

/**
 * Get the currency symbol for a given currency code
 */
function getCurrencySymbol(currencyCode: string): string {
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    }).format(0);
    // Extract just the symbol from the formatted string
    return formatted.replace(/[\d.,\s]/g, "").trim();
  } catch {
    return "$";
  }
}

interface AmountInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  currencyOverride?: string;
}

function AmountInput({
  className,
  currencyOverride,
  ...props
}: AmountInputProps) {
  const { currency: userCurrency } = useUserSettings();
  const currency = currencyOverride ?? userCurrency;
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-10",
          "text-3xl font-semibold text-primary",
          "select-none"
        )}
        aria-hidden="true"
      >
        {symbol}
      </span>
      <input
        type="number"
        inputMode="decimal"
        data-slot="amount-input"
        className={cn(
          // Base styles - larger than regular input
          "file:text-foreground placeholder:text-muted-foreground/50 selection:bg-primary selection:text-primary-foreground",
          "dark:bg-input/30 border-2 border-primary/20 w-full min-w-0 rounded-2xl bg-background/80 backdrop-blur-sm",
          // Bigger size with currency prefix padding
          "h-16 pl-12 pr-5 py-4 text-3xl font-semibold tracking-tight",
          // Shadow and transition
          "shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 ease-out outline-none",
          // Disabled state
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          // Focus state
          "focus-visible:border-primary/50 focus-visible:ring-primary/20 focus-visible:ring-4 focus-visible:shadow-md focus-visible:shadow-primary/10",
          // Invalid state
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          // Hide number input spinners
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        {...props}
      />
    </div>
  );
}

export { AmountInput, getCurrencySymbol };
