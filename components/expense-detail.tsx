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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Edit, Trash } from "lucide-react";
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
      {/* Back button above details */}
      <div className="mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
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

      <div className="flex items-center gap-4 justify-end">
        <div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Edit className="h-5 w-5" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
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
        </div>

        <div>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="lg">
                <Trash className="h-5 w-5" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Expense</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to delete this expense?</p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
