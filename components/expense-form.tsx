"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateUTC, toUTCNoon } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navigation-provider";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  categories,
  categoryIcons,
  incomeCategories,
  incomeCategoryIcons,
  defaultCategoryIcon,
} from "@/lib/constants";
import type { Expense } from "@/lib/types";
import {
  useAddExpense,
  useUpdateExpense,
  getLocalUserId,
} from "@/hooks/use-local-data";
import { useSyncContext } from "@/components/sync-provider";

const formSchema = z.object({
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, "Amount must be greater than 0"),
  ) as z.ZodType<number>,
  category: z.string().min(1, "Category is required"),
  date: z.date(),
  notes: z.string().optional(),
  type: z.enum(["expense", "income"]).optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  onSuccess?: () => void;
  expense?: Expense;
}

export function ExpenseForm({ onSuccess, expense }: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const { triggerRefresh } = useNavigation();
  const addExpenseLocal = useAddExpense();
  const updateExpenseLocal = useUpdateExpense();
  const { syncNow } = useSyncContext();

  // Track transaction type for editing
  const [transactionType, setTransactionType] = useState<"expense" | "income">(
    expense?.type || "expense",
  );

  // Default date to today for new expenses, or the existing date when editing
  const getDefaultDate = () => {
    if (expense?.date) return toUTCNoon(new Date(expense.date));
    return toUTCNoon(new Date()); // Today's date
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema) as Resolver<ExpenseFormValues>,
    defaultValues: {
      date: getDefaultDate(),
      notes: expense?.notes ?? "",
      amount: expense?.amount ?? ("" as unknown as number),
      category: expense?.category ?? "",
      type: expense?.type || "expense",
    },
  });

  // Get current categories based on transaction type
  const currentCategories =
    transactionType === "income" ? incomeCategories : categories;
  const currentCategoryIcons =
    transactionType === "income" ? incomeCategoryIcons : categoryIcons;

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      try {
        if (expense?.id) {
          // Update existing expense
          await updateExpenseLocal(expense.id, {
            ...values,
            type: transactionType,
          });
          toast.success("Transaction updated");
          triggerRefresh();
          syncNow().catch(console.error);
          onSuccess?.();
          return;
        }

        // Add new expense using local-first
        const userId = await getLocalUserId();
        await addExpenseLocal(
          {
            ...values,
            type: transactionType,
          },
          userId,
        );

        toast.success(
          transactionType === "income" ? "Income added" : "Expense added",
        );
        triggerRefresh();
        syncNow().catch(console.error);

        // Reset form
        form.reset({
          date: toUTCNoon(new Date()),
          notes: "",
          amount: "" as unknown as number,
          category: "",
          type: "expense",
        });
        setTransactionType("expense");
        onSuccess?.();
      } catch (error) {
        console.error("Failed to save expense:", error);
        toast.error("Failed to save expense");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <AmountInput
                  step="0.01"
                  placeholder="0.00"
                  autoFocus
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  key={transactionType} // Re-render when type changes
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currentCategories.map((cat) => {
                      const Icon =
                        currentCategoryIcons[cat] || defaultCategoryIcon;
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <Icon
                              className="h-6 w-6 text-primary"
                              strokeWidth={2.5}
                            />
                            <span>{cat}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        size="lg"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          formatDateUTC(field.value)
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon
                          className="ml-auto h-6 w-6 text-primary"
                          strokeWidth={2.5}
                        />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) =>
                        field.onChange(date ? toUTCNoon(date) : undefined)
                      }
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Add details about this transaction"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="w-full flex justify-center pt-3">
          <Button type="submit" className="fn" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}