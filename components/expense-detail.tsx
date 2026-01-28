"use client";

import React, { useState, useTransition } from "react";
import {
  categoryIcons,
  incomeCategoryIcons,
  defaultCategoryIcon,
} from "@/lib/constants";
import { Button } from "./ui/button";
import { useUserSettings } from "@/components/user-settings-provider";
import { useNavigation } from "@/components/navigation-provider";
import { formatCurrency, formatDateUTC, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash,
  MoreVertical,
  Users,
  Check,
} from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { SplitExpenseDialog } from "@/components/splits";
import { toast } from "sonner";
import type { Expense } from "@/lib/types";
import { useDeleteExpense } from "@/hooks/use-local-data";
import { useSyncContext } from "@/components/sync-provider";
import { getExpenseWithSplits, markSplitAsPaid } from "@/app/actions";

export default function ExpenseDetail({
  expense,
  onBack,
}: {
  expense: Expense;
  onBack?: () => void;
}) {
  const { currency } = useUserSettings();
  const { triggerRefresh } = useNavigation();
  const deleteExpenseLocal = useDeleteExpense();
  const { syncNow } = useSyncContext();
  const isIncome = expense.type === "income";
  const Icon = isIncome
    ? incomeCategoryIcons[expense.category] || defaultCategoryIcon
    : categoryIcons[expense.category] || defaultCategoryIcon;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Local state for expense with splits (refreshed when dialog closes)
  const [expenseWithSplits, setExpenseWithSplits] = useState<Expense>(expense);

  // Load expense with splits data
  const loadSplits = React.useCallback(async () => {
    if (!expense.isSplit) return;
    try {
      const result = await getExpenseWithSplits(expense.id);
      if (result.success && result.data) {
        setExpenseWithSplits(result.data as Expense);
      }
    } catch (error) {
      console.error("Failed to load splits:", error);
    }
  }, [expense.id, expense.isSplit]);

  // Load splits on mount if expense is split
  React.useEffect(() => {
    if (expense.isSplit) {
      loadSplits();
    }
  }, [expense.isSplit, loadSplits]);

  // Handle split dialog success
  const handleSplitSuccess = () => {
    loadSplits();
    triggerRefresh();
  };

  // Get avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get consistent avatar color
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  // Handle marking a split as paid
  const handleMarkPaid = async (splitId: string) => {
    try {
      const result = await markSplitAsPaid(splitId);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success("Marked as paid");
      loadSplits();
      triggerRefresh();
    } catch (error) {
      console.error("Failed to mark as paid:", error);
      toast.error("Failed to mark as paid");
    }
  };

  async function handleDelete() {
    startTransition(async () => {
      try {
        // Delete from local Dexie DB
        await deleteExpenseLocal(expense.id);
        toast.success("Transaction deleted");
        triggerRefresh();
        // Sync in background
        syncNow().catch(console.error);
        onBack?.();
        setDeleteOpen(false);
      } catch (error) {
        console.error("Failed to delete expense:", error);
        toast.error("Failed to delete transaction");
      }
    });
  }

  return (
    <>
      {/* Header with back button and three-dot menu */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 border rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Icon className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{expense.category}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDateUTC(expense.date)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">
              {formatCurrency(expense.amount, currency)}
            </p>
            {expenseWithSplits.isSplit && expenseWithSplits.splits && (
              <Badge variant="secondary" className="mt-1">
                <Users className="h-3 w-3 mr-1" />
                Split
              </Badge>
            )}
          </div>
        </div>

        {/* Notes below details to support long content */}
        <div className="mt-4">
          <h4 className="text-sm font-medium">Notes</h4>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
            {expense.notes || "No notes"}
          </p>
        </div>

        {/* Split Details Section */}
        {expenseWithSplits.isSplit &&
          expenseWithSplits.splits &&
          expenseWithSplits.splits.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Split Details</h4>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSplitOpen(true)}
                >
                  <Edit />
                </Button>
              </div>
              <div className="space-y-2">
                {expenseWithSplits.splits.map((split) => (
                  <div
                    key={split.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border",
                      split.isPaid ? "bg-muted/30" : "bg-muted/50",
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={cn(
                          "text-white text-xs",
                          split.isYourShare
                            ? "bg-primary"
                            : getAvatarColor(split.contact?.name || "Unknown"),
                        )}
                      >
                        {split.isYourShare ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          getInitials(split.contact?.name || "?")
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium text-sm truncate",
                          split.isPaid &&
                            !split.isYourShare &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {split.isYourShare
                          ? "You"
                          : split.contact?.name || "Unknown"}
                      </p>
                      {split.percentage && (
                        <p className="text-xs text-muted-foreground">
                          {split.percentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p
                        className={cn(
                          "font-medium text-xl tabular-nums",
                          split.isPaid &&
                            !split.isYourShare &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {formatCurrency(split.amount, currency)}
                      </p>
                      {!split.isYourShare &&
                        (split.isPaid ? (
                          <Badge variant="outline" className="text-xs mt-1">
                            <Check className="h-3 w-3 mr-1 stroke-3" />
                            Paid
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkPaid(split.id)}
                          >
                            Mark paid
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Split Expense Button (only for expenses, not income) */}
        {!isIncome && !expenseWithSplits.isSplit && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <Button variant="outline" onClick={() => setSplitOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Split this expense
            </Button>
          </div>
        )}
      </div>

      {/* Split Expense Dialog */}
      <SplitExpenseDialog
        expense={expenseWithSplits}
        open={splitOpen}
        onOpenChange={setSplitOpen}
        onSuccess={handleSplitSuccess}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={expense}
            onSuccess={() => {
              setEditOpen(false);
              onBack?.();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this transaction. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
