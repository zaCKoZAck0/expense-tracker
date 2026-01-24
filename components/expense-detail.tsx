"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { categoryIcons, defaultCategoryIcon } from "@/lib/constants";
import { Button } from "./ui/button";
import { useUserSettings } from "@/components/user-settings-provider";
import { useNavigation } from "@/components/navigation-provider";
import { formatCurrency, formatDateUTC } from "@/lib/utils";
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
import { ArrowLeft, Edit, Trash, MoreVertical } from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { toast } from "sonner";
import type { Expense } from "@/lib/types";
import { deleteExpense as deleteExpenseAction } from "@/app/actions";

export default function ExpenseDetail({
  expense,
  onBack,
}: {
  expense: Expense;
  onBack?: () => void;
}) {
  const { currency } = useUserSettings();
  const { triggerRefresh } = useNavigation();
  const Icon = categoryIcons[expense.category] || defaultCategoryIcon;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpenseAction(expense.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete expense");
        return;
      }
      toast.success("Expense deleted");
      router.refresh();
      triggerRefresh();
      onBack?.();
      setDeleteOpen(false);
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
          </div>
        </div>

        {/* Notes below details to support long content */}
        <div className="mt-4">
          <h4 className="text-sm font-medium">Notes</h4>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
            {expense.notes || "No notes"}
          </p>
        </div>
      </div>

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
              This will permanently remove this transaction. This action cannot be undone.
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
