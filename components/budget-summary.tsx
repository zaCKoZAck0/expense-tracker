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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {isOverBudget ? "Over budget" : "Left to spend"}
              </CardTitle>
              <WalletIcon className="h-4 w-4" />
            </CardHeader>
            <CardContent className="space-y-2">
              {isOverBudget ? (
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">
                    Over by {formatCurrency(overBudgetAmount, currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Monthly budget: {formatCurrency(budgetAmount, currency)}
                  </p>
                </div>
              ) : (
                <p>
                  <span className="font-bold">
                    {formatCurrency(safeRemaining, currency)}
                  </span>{" "}
                  out of {formatCurrency(budgetAmount, currency)}
                </p>
              )}
              <Progress
                className={`h-4 ${isOverBudget ? "bg-destructive/20" : ""}`}
                indicatorClassName={isOverBudget ? "bg-destructive" : undefined}
                value={progressValue}
              />
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Daily spending
                </p>
                <DailySpendingChart
                  data={dailySpending}
                  daysInMonth={daysInMonth}
                />
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
