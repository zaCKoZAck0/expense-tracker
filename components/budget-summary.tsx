"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WalletIcon, ChevronDown } from "lucide-react";
import { DailySpendingChart } from "@/components/daily-spending-chart";
import { useNavigation } from "@/components/navigation-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BudgetForm } from "@/components/budget-form";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency } from "@/lib/utils";
import { categoryIcons } from "@/lib/constants";
import type { CategoryBudgetWithSpent } from "@/hooks/use-local-data";

interface BudgetSummaryProps {
  remaining: number;
  budgetAmount: number;
  baseBudgetAmount: number;
  totalIncome: number;
  spentPercentage: number;
  dailySpending: {
    day: number;
    amount: number;
  }[];
  daysInMonth: number;
  categoryBudgets: CategoryBudgetWithSpent[];
}

export function BudgetSummary({
  remaining,
  budgetAmount,
  baseBudgetAmount,
  totalIncome,
  spentPercentage,
  dailySpending,
  daysInMonth,
  categoryBudgets,
}: BudgetSummaryProps) {
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { currency, includeEarningInBudget } = useUserSettings();
  const { selectedMonth } = useNavigation();
  const isOverBudget = remaining < 0;
  const safeRemaining = Math.max(remaining, 0);
  const overBudgetAmount = Math.abs(Math.min(remaining, 0));
  const progressValue =
    budgetAmount > 0 ? Math.min(100, Math.max(0, spentPercentage)) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className={`${isOverBudget ? "border-destructive/50" : ""}`}>
        <DialogTrigger asChild>
          <button className="w-full text-left cursor-pointer rounded-t-xl transition-colors">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {isOverBudget ? "Over budget" : "Left to spend"}
              </CardTitle>
              <WalletIcon className="h-4 w-4" />
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              {isOverBudget ? (
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">
                    Over by {formatCurrency(overBudgetAmount, currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Monthly budget: {formatCurrency(budgetAmount, currency)}
                  </p>
                  {!includeEarningInBudget && totalIncome > 0 && (
                    <p className="text-sm text-primary">
                      Earning: {formatCurrency(totalIncome, currency)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <p>
                    <span className="font-bold">
                      {formatCurrency(safeRemaining, currency)}
                    </span>{" "}
                    out of {formatCurrency(budgetAmount, currency)}
                  </p>
                  {!includeEarningInBudget && totalIncome > 0 && (
                    <p className="text-sm text-primary">
                      Earning: {formatCurrency(totalIncome, currency)}
                    </p>
                  )}
                </div>
              )}
              <Progress
                className={`h-4 ${isOverBudget ? "bg-destructive/20" : ""}`}
                indicatorClassName={isOverBudget ? "bg-destructive" : undefined}
                value={progressValue}
              />
            </CardContent>
          </button>
        </DialogTrigger>
        <CardContent className="space-y-2 pt-0">
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-1">Daily spending</p>
            <DailySpendingChart
              data={dailySpending}
              daysInMonth={daysInMonth}
            />
          </div>
          {categoryBudgets.length > 0 && (
            <Collapsible open={categoryOpen} onOpenChange={setCategoryOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full pt-2 text-xs text-muted-foreground transition-colors">
                <span>Category limits</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${categoryOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {categoryBudgets.map((cb) => {
                  const Icon = categoryIcons[cb.category];
                  const progressValue = Math.min(
                    100,
                    Math.max(0, cb.percentage),
                  );
                  return (
                    <div key={cb.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {Icon && (
                            <Icon className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span>{cb.category}</span>
                        </div>
                        <span
                          className={cb.isOverBudget ? "text-destructive" : ""}
                        >
                          {formatCurrency(cb.remaining, currency)} left
                        </span>
                      </div>
                      <Progress
                        className={`h-1 ${cb.isOverBudget ? "bg-destructive/20" : ""}`}
                        indicatorClassName={
                          cb.isOverBudget ? "bg-destructive" : undefined
                        }
                        value={progressValue}
                      />
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Monthly Budget</DialogTitle>
        </DialogHeader>
        <BudgetForm
          defaultMonth={selectedMonth}
          defaultAmount={baseBudgetAmount}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
