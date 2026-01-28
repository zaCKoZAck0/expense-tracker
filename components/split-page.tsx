"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowUpRight } from "lucide-react";
import { getSplitSummary, getExpenseWithSplits } from "@/app/actions";
import { ContactBalanceList } from "@/components/splits/contact-balance-list";
import { SplitActivityList } from "@/components/splits/split-activity-list";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expense-form";
import { SplitExpenseDialog } from "@/components/splits";
import type { Expense, Contact, ExpenseSplit } from "@/lib/types";

// Define the shape of data returned by getSplitSummary
interface SplitSummaryData {
  totalOwed: number;
  totalOwedToYou: number;
  contacts: { contact: Contact; balance: number; openSplits: (ExpenseSplit & { expense: Expense })[] }[];
  recentActivity: (ExpenseSplit & { expense: Expense; contact: Contact | null })[];
}

import { useNavigation } from "@/components/navigation-provider";
import ExpenseDetail from "@/components/expense-detail";

export default function SplitPage() {
  const { currency } = useUserSettings();
  const { selectedExpense, closeExpense } = useNavigation();
  const [data, setData] = useState<SplitSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [expenseToSplit, setExpenseToSplit] = useState<Expense | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getSplitSummary();
      if (result.success && result.data) {
        // Need to cast the result to match our local types as they might differ slightly from Prisma
        setData(result.data as unknown as SplitSummaryData);
      }
    } catch (error) {
      console.error("Failed to load split summary:", error);
      toast.error("Failed to load split summary");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSplitSuccess = () => {
    loadData();
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 pb-24 pt-6 animate-pulse px-1">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="h-10 w-10 bg-muted rounded-full"></div>
        </div>
        <div className="grid gap-4">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (selectedExpense) {
    return <ExpenseDetail expense={selectedExpense} onBack={closeExpense} />;
  }

  return (
    <div className="space-y-6 pb-24 pt-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold tracking-tight">Split</h1>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Total Owed to You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(data?.totalOwedToYou || 0, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {data?.contacts.filter(c => c.balance > 0).length || 0} people
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold px-1">Balances</h2>
        <ContactBalanceList
          contacts={data?.contacts || []}
          currency={currency}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold px-1">Recent Activity</h2>
        <SplitActivityList
          activities={data?.recentActivity || []}
          currency={currency}
        />
      </div>

      {/* Split Expense Dialog */}
      {expenseToSplit && (
        <SplitExpenseDialog
          expense={expenseToSplit}
          open={showSplitDialog}
          onOpenChange={setShowSplitDialog}
          onSuccess={handleSplitSuccess}
        />
      )}
    </div>
  );
}
