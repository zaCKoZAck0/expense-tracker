"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { toast } from "sonner";
import { getCurrentMonthKey } from "@/lib/utils";
import { useNavigation } from "@/components/navigation-provider";
import { useSetBudget } from "@/hooks/use-local-data";
import { useSyncContext } from "@/components/sync-provider";

const formSchema = z.object({
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, "Amount must be greater than 0"),
  ) as z.ZodType<number>,
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});

type BudgetFormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
  defaultMonth?: string;
  defaultAmount?: number;
  onSuccess?: () => void;
}

export function BudgetForm({
  defaultMonth,
  defaultAmount,
  onSuccess,
}: BudgetFormProps) {
  const [isPending, startTransition] = useTransition();
  const { triggerRefresh } = useNavigation();
  const setBudgetLocal = useSetBudget();
  const { syncNow } = useSyncContext();

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema) as Resolver<BudgetFormValues>,
    defaultValues: {
      month: defaultMonth || getCurrentMonthKey(),
      amount: defaultAmount || 0,
    },
  });

  function onSubmit(values: BudgetFormValues) {
    startTransition(async () => {
      try {
        // Save to local Dexie DB
        await setBudgetLocal(values.amount, values.month);
        toast.success("Budget saved");
        triggerRefresh();
        // Sync in background
        syncNow().catch(console.error);
        onSuccess?.();
      } catch (error) {
        console.error("Failed to save budget:", error);
        toast.error("Failed to save budget");
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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Month</FormLabel>
              <FormControl>
                <Input type="month" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save Budget"}
        </Button>
      </form>
    </Form>
  );
}
