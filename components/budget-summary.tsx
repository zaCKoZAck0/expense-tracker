"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WalletIcon } from "lucide-react";
import { DailySpendingChart } from "@/components/daily-spending-chart";
import { useNavigation } from "@/components/navigation-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BudgetForm } from "@/components/budget-form";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency } from "@/lib/utils";

interface BudgetSummaryProps {
  remaining: number;
  budgetAmount: number;
  spentPercentage: number;
  dailySpending: {
    day: number;
    amount: number;
  }[];
  daysInMonth: number;
}

export function BudgetSummary({
  remaining,
  budgetAmount,
  spentPercentage,
  dailySpending,
  daysInMonth,
}: BudgetSummaryProps) {
  const [open, setOpen] = useState(false);
  const { currency } = useUserSettings();
  const { selectedMonth } = useNavigation();
  const isOverBudget = remaining < 0;
  const safeRemaining = Math.max(remaining, 0);
  const overBudgetAmount = Math.abs(Math.min(remaining, 0));
  const progressValue =
    budgetAmount > 0 ? Math.min(100, Math.max(0, spentPercentage)) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full text-left">
          <Card
            className={`cursor-pointer ${
              isOverBudget ? "border-destructive/50" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium tracking-tight text-muted-foreground">
                {isOverBudget ? "Over budget" : "Left to spend"}
              </CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <WalletIcon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {isOverBudget ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold tracking-tight text-destructive">
                    Over by {formatCurrency(overBudgetAmount, currency)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Monthly budget: {formatCurrency(budgetAmount, currency)}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(safeRemaining, currency)}
                    <span className="text-base font-medium text-muted-foreground ml-2">
                      out of {formatCurrency(budgetAmount, currency)}
                    </span>
                  </p>
                </div>
              )}
              <Progress
                className={`h-3 ${isOverBudget ? "bg-destructive/20" : ""}`}
                indicatorClassName={isOverBudget ? "bg-destructive" : undefined}
                value={progressValue}
              />
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Daily spending</p>
                <DailySpendingChart data={dailySpending} daysInMonth={daysInMonth} />
              </div>
            </CardContent>
          </Card>
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Monthly Budget</DialogTitle>
        </DialogHeader>
        <BudgetForm
          defaultMonth={selectedMonth}
          defaultAmount={budgetAmount}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
