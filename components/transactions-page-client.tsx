"use client";

import { useCallback, useMemo, useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { categoryIcons, incomeCategoryIcons, defaultCategoryIcon } from "@/lib/constants";
import { formatCurrency, formatDateUTC } from "@/lib/utils";
import { useUserSettings } from "@/components/user-settings-provider";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/components/navigation-provider";
import { Transaction } from "@/components/expense-list";
import ExpenseDetail from "@/components/expense-detail";
import { useTransactions } from "@/hooks/use-local-data";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

// Component now uses Dexie data directly - no props needed
export function TransactionsPageClient() {
  const { currency } = useUserSettings();
  const { openExpense, selectedExpense, closeExpense } = useNavigation();

  // Local state for filters and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<"expense" | "income" | "all">("all");
  const [isGrouped, setIsGrouped] = useState(true);
  const [localStartDate, setLocalStartDate] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");
  const [localMinAmount, setLocalMinAmount] = useState("");
  const [localMaxAmount, setLocalMaxAmount] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }>({});

  const limit = 20;

  // Use Dexie-backed hook for transactions
  const { data, isLoading } = useTransactions({
    page: currentPage,
    limit,
    sortBy,
    sortOrder,
    filterType,
    startDate: appliedFilters.startDate,
    endDate: appliedFilters.endDate,
    minAmount: appliedFilters.minAmount,
    maxAmount: appliedFilters.maxAmount,
  });

  const transactions = data?.transactions ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Helper to update filters
  const applyFilters = useCallback(() => {
    setAppliedFilters({
      startDate: localStartDate || undefined,
      endDate: localEndDate || undefined,
      minAmount: localMinAmount ? parseFloat(localMinAmount) : undefined,
      maxAmount: localMaxAmount ? parseFloat(localMaxAmount) : undefined,
    });
    setCurrentPage(1);
  }, [localStartDate, localEndDate, localMinAmount, localMaxAmount]);

  const resetFilters = useCallback(() => {
    setFilterType("all");
    setLocalStartDate("");
    setLocalEndDate("");
    setLocalMinAmount("");
    setLocalMaxAmount("");
    setAppliedFilters({});
    setCurrentPage(1);
  }, []);

  // Group by month
  const groupedTransactions = useMemo(() => {
    if (!isGrouped) return {}; // Return empty if not grouped

    const groups: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
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
  }, [transactions, isGrouped]);

  // Check for active filters indicator
  const hasActiveFilters = filterType !== "all" || 
    appliedFilters.startDate || 
    appliedFilters.endDate || 
    appliedFilters.minAmount !== undefined || 
    appliedFilters.maxAmount !== undefined;

  // If an expense is selected, show the detail view
  if (selectedExpense) {
    return (
      <div className="space-y-6 pb-24 pt-6">
        <ExpenseDetail expense={selectedExpense} onBack={closeExpense} />
      </div>
    );
  }

  // Loading state
  if (isLoading && transactions.length === 0) {
    return (
      <div className="space-y-6 pb-24 pt-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">All Transactions</h2>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Filter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filters
                </span>
                {hasActiveFilters && (
                  <span className="ml-1 flex h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-100 p-4" align="end">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs leading-none text-muted-foreground">
                    View Options
                  </h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grouping-toggle" className="text-sm">
                      Group by Month
                    </Label>
                    <Switch
                      id="grouping-toggle"
                      checked={isGrouped}
                      onCheckedChange={setIsGrouped}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs leading-none text-muted-foreground">
                    Type
                  </h4>
                  <Tabs
                    value={filterType}
                    onValueChange={(v) => {
                      setFilterType(v as "expense" | "income" | "all");
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 h-8">
                      <TabsTrigger value="all" className="text-xs">
                        All
                      </TabsTrigger>
                      <TabsTrigger value="expense" className="text-xs">
                        Expenses
                      </TabsTrigger>
                      <TabsTrigger value="income" className="text-xs">
                        Income
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs leading-none text-muted-foreground">
                    Date Range
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="date-start" className="text-xs">
                        Start
                      </Label>
                      <Input
                        id="date-start"
                        type="date"
                        className="h-8 text-xs"
                        value={localStartDate}
                        onChange={(e) => setLocalStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="date-end" className="text-xs">
                        End
                      </Label>
                      <Input
                        id="date-end"
                        type="date"
                        className="h-8 text-xs"
                        value={localEndDate}
                        onChange={(e) => setLocalEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs leading-none text-muted-foreground">
                    Amount Range
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="amount-min" className="text-xs">
                        Min
                      </Label>
                      <Input
                        id="amount-min"
                        type="number"
                        placeholder="0"
                        className="h-8 text-xs"
                        value={localMinAmount}
                        onChange={(e) => setLocalMinAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="amount-max" className="text-xs">
                        Max
                      </Label>
                      <Input
                        id="amount-max"
                        type="number"
                        placeholder="Max"
                        className="h-8 text-xs"
                        value={localMaxAmount}
                        onChange={(e) => setLocalMaxAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyFilters}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Sort
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortBy === "date" && sortOrder === "desc"}
                onCheckedChange={() => {
                  setSortBy("date");
                  setSortOrder("desc");
                }}
              >
                Newest Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "date" && sortOrder === "asc"}
                onCheckedChange={() => {
                  setSortBy("date");
                  setSortOrder("asc");
                }}
              >
                Oldest Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortBy === "amount" && sortOrder === "desc"}
                onCheckedChange={() => {
                  setSortBy("amount");
                  setSortOrder("desc");
                }}
              >
                Highest Amount
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "amount" && sortOrder === "asc"}
                onCheckedChange={() => {
                  setSortBy("amount");
                  setSortOrder("asc");
                }}
              >
                Lowest Amount
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-background">
        <Table>
          <TableBody>
            {isGrouped ? (
              Object.keys(groupedTransactions).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedTransactions).map(
                  ([groupMonth, monthTransactions]) => (
                    <Fragment key={groupMonth}>
                      <TableRow
                        key={groupMonth}
                        className="bg-muted/50 hover:bg-muted/50"
                      >
                        <TableCell
                          colSpan={2}
                          className="py-2 font-medium text-xs text-muted-foreground uppercase tracking-wider"
                        >
                          {groupMonth}
                        </TableCell>
                      </TableRow>
                      {monthTransactions.map((transaction) => {
                        const isIncome = transaction.type === "income";
                        const Icon = isIncome 
                          ? (incomeCategoryIcons[transaction.category] || defaultCategoryIcon)
                          : (categoryIcons[transaction.category] || defaultCategoryIcon);

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
                                      "bg-green-100 dark:bg-green-900/40",
                                  )}
                                >
                                  <Icon
                                    className={cn(
                                      "h-5 w-5 text-accent-foreground",
                                      isIncome &&
                                        "text-green-700 dark:text-green-300",
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
                                  ? "text-green-600 dark:text-green-400"
                                  : "",
                              )}
                            >
                              {isIncome ? "+" : "-"}
                              {formatCurrency(transaction.amount, currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  ),
                )
              )
            ) : // Flat List Rendering
            transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => {
                const isIncome = transaction.type === "income";
                const Icon = isIncome 
                  ? (incomeCategoryIcons[transaction.category] || defaultCategoryIcon)
                  : (categoryIcons[transaction.category] || defaultCategoryIcon);

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
                            isIncome && "bg-green-100 dark:bg-green-900/40",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 text-accent-foreground",
                              isIncome &&
                                "text-green-700 dark:text-green-300",
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
                          ? "text-green-600 dark:text-green-400"
                          : "",
                      )}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(transaction.amount, currency)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages} ({totalCount} items)
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
