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
          className="fixed left-1/2 bottom-26 -translate-x-1/2 shadow-xl shadow-primary/30 z-20 gap-2"
          size="lg"
          variant="default"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          <span className="font-bold tracking-tight">Add Transaction</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Add Transaction
          </DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "expense" | "income")}
          className="w-full"
        >
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
