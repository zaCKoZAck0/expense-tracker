"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateUTC } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  categories,
  categoryIcons,
  defaultCategoryIcon,
} from "@/lib/constants";
import type { Expense } from "@/lib/types";
import {
  addExpense as addExpenseAction,
  updateExpense as updateExpenseAction,
} from "@/app/actions";

const formSchema = z.object({
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, "Amount must be greater than 0"),
  ) as z.ZodType<number>,
  category: z.enum(categories),
  date: z.date(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  onSuccess?: () => void;
  expense?: Expense;
}

export function ExpenseForm({ onSuccess, expense }: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { selectedMonth } = useNavigation();

  // Default date to selected month (first day) for new expenses
  const getDefaultDate = () => {
    if (expense?.date) return new Date(expense.date);
    const [year, month] = selectedMonth.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, 1);
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema) as Resolver<ExpenseFormValues>,
    defaultValues: {
      date: getDefaultDate(),
      notes: expense?.notes ?? "",
      amount: expense?.amount ?? 0,
      category: expense?.category as ExpenseFormValues["category"] | undefined,
    },
  });

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      if (expense?.id) {
        const result = await updateExpenseAction(expense.id, values);
        if (!result.success) {
          toast.error(result.error ?? "Failed to update expense");
          return;
        }
        toast.success("Expense updated successfully");
        router.refresh();
        onSuccess?.();
        return;
      }

      const result = await addExpenseAction(values);
      if (!result.success) {
        toast.error(result.error ?? "Failed to add expense");
        return;
      }
      toast.success("Expense added successfully");
      router.refresh();
      const [year, month] = selectedMonth.split("-");
      form.reset({
        date: new Date(parseInt(year), parseInt(month) - 1, 1),
        notes: "",
        amount: 0,
        category: undefined,
      });
      onSuccess?.();
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
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
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
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => {
                      const Icon = categoryIcons[cat] || defaultCategoryIcon;
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
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
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
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
                <Textarea
                  placeholder="Add details about this expense"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full fn" disabled={isPending}>
          {isPending ? "Adding..." : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
}
