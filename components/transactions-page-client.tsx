"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { categoryIcons, defaultCategoryIcon } from "@/lib/constants";
import { formatCurrency, formatDateUTC } from "@/lib/utils";
import { useUserSettings } from "@/components/user-settings-provider";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/components/navigation-provider";
import { Transaction } from "@/components/transaction-list";
import { ChevronLeft, ChevronRight, ArrowUpDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { size } from "zod";

interface TransactionsPageClientProps {
  initialTransactions: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  sortBy: "date" | "amount";
  sortOrder: "asc" | "desc";
  filterType: "expense" | "income" | "all";
  month?: string;
}

export function TransactionsPageClient({
  initialTransactions,
  totalCount,
  totalPages,
  currentPage,
  sortBy,
  sortOrder,
  filterType,
  month,
}: TransactionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency } = useUserSettings();
  const { openExpense } = useNavigation();

  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Normalizing data (dates come as strings from server component -> client boundary if not careful,
  // but here we get them from server action which might return Date objects if directly called,
  // BUT effectively Next.js serializes arguments.
  // Actually, wait, properties passed from Server to Client component must be serializable.
  // Date objects are NOT serializable directly in props usually, they get converted to string or need to be toJSON.
  // Let's assume initialTransactions needs date parsing.
  const transactions: Transaction[] = useMemo(() => {
    return initialTransactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      type: t.type as "expense" | "income",
    }));
  }, [initialTransactions]);

  // Local state for filters
  const [isGrouped, setIsGrouped] = useState(true); // Default to grouped
  const [localFilterType, setLocalFilterType] = useState(filterType);
  const [localStartDate, setLocalStartDate] = useState(searchParams.get("startDate") || "");
  const [localEndDate, setLocalEndDate] = useState(searchParams.get("endDate") || "");
  const [localMinAmount, setLocalMinAmount] = useState(searchParams.get("minAmount") || "");
  const [localMaxAmount, setLocalMaxAmount] = useState(searchParams.get("maxAmount") || "");

  // Update local state when params change
  useEffect(() => {
     setLocalFilterType(filterType);
     setLocalStartDate(searchParams.get("startDate") || "");
     setLocalEndDate(searchParams.get("endDate") || "");
     setLocalMinAmount(searchParams.get("minAmount") || "");
     setLocalMaxAmount(searchParams.get("maxAmount") || "");
  }, [searchParams, filterType]);

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
                {(filterType !== 'all' || searchParams.get('startDate') || searchParams.get('minAmount')) && (
                   <span className="ml-1 flex h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-100 p-4" align="end">
              <div className="space-y-6">
                <div className="space-y-2">
                   <h4 className="text-xs leading-none text-muted-foreground">View Options</h4>
                   <div className="flex items-center justify-between">
                      <Label htmlFor="grouping-toggle" className="text-sm">Group by Month</Label>
                      <Switch
                         id="grouping-toggle"
                         checked={isGrouped}
                         onCheckedChange={setIsGrouped}
                      />
                   </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs leading-none text-muted-foreground">Type</h4>
                   <Tabs defaultValue={localFilterType} onValueChange={(v: any) => setLocalFilterType(v)} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 h-8">
                         <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                         <TabsTrigger value="expense" className="text-xs">Expenses</TabsTrigger>
                         <TabsTrigger value="income" className="text-xs">Income</TabsTrigger>
                      </TabsList>
                   </Tabs>
                </div>
                <div className="space-y-2">
                   <h4 className="text-xs leading-none text-muted-foreground">Date Range</h4>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                         <Label htmlFor="date-start" className="text-xs">Start</Label>
                         <Input
                            id="date-start"
                            type="date"
                            className="h-8 text-xs"
                            value={localStartDate}
                            onChange={(e) => setLocalStartDate(e.target.value)}
                         />
                      </div>
                      <div className="space-y-1">
                         <Label htmlFor="date-end" className="text-xs">End</Label>
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
                   <h4 className="text-xs leading-none text-muted-foreground">Amount Range</h4>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                         <Label htmlFor="amount-min" className="text-xs">Min</Label>
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
                         <Label htmlFor="amount-max" className="text-xs">Max</Label>
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
                   <Button variant="outline" size="sm" onClick={() => {
                      setLocalFilterType("all");
                      setLocalStartDate("");
                      setLocalEndDate("");
                      setLocalMinAmount("");
                      setLocalMaxAmount("");
                      updateParams({
                         filterType: "all",
                         startDate: null,
                         endDate: null,
                         minAmount: null,
                         maxAmount: null,
                         pageNumber: 1
                      });
                   }}>
                      Reset
                   </Button>
                   <Button size="sm" onClick={() => {
                      updateParams({
                         filterType: localFilterType,
                         startDate: localStartDate || null,
                         endDate: localEndDate || null,
                         minAmount: localMinAmount || null,
                         maxAmount: localMaxAmount || null,
                         pageNumber: 1
                      });
                   }}>
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
                onCheckedChange={() =>
                  updateParams({ sortBy: "date", sortOrder: "desc" })
                }
              >
                Newest Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "date" && sortOrder === "asc"}
                onCheckedChange={() =>
                  updateParams({ sortBy: "date", sortOrder: "asc" })
                }
              >
                Oldest Date
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortBy === "amount" && sortOrder === "desc"}
                onCheckedChange={() =>
                  updateParams({ sortBy: "amount", sortOrder: "desc" })
                }
              >
                Highest Amount
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sortBy === "amount" && sortOrder === "asc"}
                onCheckedChange={() =>
                  updateParams({ sortBy: "amount", sortOrder: "asc" })
                }
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
                       <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          No transactions found.
                       </TableCell>
                    </TableRow>
                 ) : (
                     Object.entries(groupedTransactions).map(
                       ([groupMonth, monthTransactions]) => (
                         <>
                           <TableRow key={groupMonth} className="bg-muted/50 hover:bg-muted/50">
                             <TableCell colSpan={2} className="py-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                               {groupMonth}
                             </TableCell>
                           </TableRow>
                           {monthTransactions.map((transaction) => {
                             const Icon =
                               categoryIcons[transaction.category] ||
                               defaultCategoryIcon;
                             const isIncome = transaction.type === "income";

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
                                           "bg-emerald-100 dark:bg-emerald-900/30",
                                       )}
                                     >
                                       <Icon
                                         className={cn(
                                           "h-5 w-5 text-accent-foreground",
                                           isIncome &&
                                             "text-emerald-600 dark:text-emerald-400",
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
                                       ? "text-emerald-600 dark:text-emerald-400"
                                       : "",
                                   )}
                                 >
                                   {isIncome ? "+" : "-"}
                                   {formatCurrency(transaction.amount, currency)}
                                 </TableCell>
                               </TableRow>
                             );
                           })}
                         </>
                       ),
                     )
                 )
            ) : (
               // Flat List Rendering
               transactions.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                        No transactions found.
                     </TableCell>
                  </TableRow>
               ) : (
                  transactions.map((transaction) => {
                    const Icon =
                      categoryIcons[transaction.category] ||
                      defaultCategoryIcon;
                    const isIncome = transaction.type === "income";

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
                                  "bg-emerald-100 dark:bg-emerald-900/30",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-5 w-5 text-accent-foreground",
                                  isIncome &&
                                    "text-emerald-600 dark:text-emerald-400",
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
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "",
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(transaction.amount, currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })
               )
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
               onClick={() => updateParams({ pageNumber: currentPage - 1 })}
               disabled={currentPage <= 1}
            >
               <ChevronLeft className="h-4 w-4" />
               Previous
            </Button>
            <Button
               variant="outline"
               size="sm"
               onClick={() => updateParams({ pageNumber: currentPage + 1 })}
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
