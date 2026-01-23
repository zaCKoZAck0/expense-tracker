"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseForm } from "@/components/expense-form";
import { IncomeForm } from "@/components/income-form";

export function AddExpenseButton() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed left-1/2 bottom-26 -translate-x-1/2 shadow-lg z-20"
          size="lg"
          variant="default"
        >
          <Plus className="h-8 w-8" strokeWidth={4} />
          <span className="font-semibold">Add Transaction</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "expense" | "income")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="mt-4">
            <ExpenseForm onSuccess={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            <IncomeForm onSuccess={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
