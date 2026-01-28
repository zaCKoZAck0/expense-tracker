import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { categoryIcons, defaultCategoryIcon, incomeCategoryIcons } from "@/lib/constants";
import { Button } from "./ui/button";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency, formatDateUTC } from "@/lib/utils";
import { useNavigation } from "@/components/navigation-provider";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

import { ExpenseSplit } from "@/lib/types";

export interface Transaction {
  id: string;
  amount: number;
  date: Date;
  category: string;
  notes: string | null;
  type: "expense" | "income";
  isSplit?: boolean;
  splits?: ExpenseSplit[];
}

interface TransactionListProps {
  transactions: Transaction[];
  limit?: number;
}

export function TransactionList({
  transactions,
  limit = 50,
}: TransactionListProps) {
  const { currency } = useUserSettings();
  const { openExpense } = useNavigation();

  // Default to newest first for dashboard
  const processedTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }, [transactions, limit]);

  // Group by month
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    processedTransactions.forEach((t) => {
      const date = new Date(t.date);
      const key = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(t);
    });
    return groups;
  }, [processedTransactions]);

  // Navigate to full transactions page
  const handleViewAll = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", "transactions");
    window.location.href = url.toString();
  };

  if (transactions.length === 0) {
    return (
      <div className="flex h-50 items-center justify-center p-4">
        <p className="text-muted-foreground">No transactions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex  justify-between items-center gap-4 px-2">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="h-9 ml-auto sm:ml-0"
          >
            View All
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-background">
        <Table>
          <TableBody>
            {Object.entries(groupedTransactions).map(
              ([month, monthTransactions]) => (
                <>
                  <TableRow
                    key={month}
                    className="bg-muted/50 hover:bg-muted/50"
                  >
                    <TableCell
                      colSpan={2}
                      className="py-2 font-medium text-xs text-muted-foreground uppercase tracking-wider"
                    >
                      {month}
                    </TableCell>
                  </TableRow>
                  {monthTransactions.map((transaction) => {
                    const isIncome = transaction.type === "income";
                    const Icon =
                      (isIncome
                        ? incomeCategoryIcons[transaction.category]
                        : categoryIcons[transaction.category]) ||
                      defaultCategoryIcon;

                    // Calculate share
                    let yourShare = null;
                    if (transaction.isSplit && transaction.splits) {
                      const shareSplit = transaction.splits.find(s => s.isYourShare);
                      if (shareSplit) {
                        yourShare = shareSplit.amount;
                      }
                    }

                    return (
                      <TableRow
                        key={transaction.id}
                        onClick={() => openExpense(transaction)}
                        className="cursor-pointer hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full bg-accent transition-colors",
                                isIncome &&
                                  "bg-primary/10",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-5 w-5 text-accent-foreground",
                                  isIncome &&
                                    "text-primary",
                                )}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium leading-none">
                                {transaction.category}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateUTC(transaction.date)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            isIncome
                              ? "text-primary"
                              : "",
                          )}
                        >
                          <div>
                            {isIncome ? "+" : "-"}
                            {formatCurrency(transaction.amount, currency)}
                          </div>
                          {yourShare !== null && (
                            <div className="text-xs text-muted-foreground font-normal mt-0.5">
                              Your share: {formatCurrency(yourShare, currency)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ),
            )}
            {processedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  No transactions found matching current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
