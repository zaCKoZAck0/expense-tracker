"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { getCurrentMonthKey } from "@/lib/utils";
import { setBudget as setBudgetAction } from "@/app/actions";
import { useNavigation } from "@/components/navigation-provider";

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
  const router = useRouter();
  const { triggerRefresh } = useNavigation();

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema) as Resolver<BudgetFormValues>,
    defaultValues: {
      month: defaultMonth || getCurrentMonthKey(),
      amount: defaultAmount || 0,
    },
  });

  function onSubmit(values: BudgetFormValues) {
    startTransition(async () => {
      const result = await setBudgetAction(values.amount, values.month);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save budget");
        return;
      }
      toast.success("Budget saved");
      router.refresh();
      triggerRefresh();
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

        <div className="text-sm text-muted-foreground">
          This budget will apply to the selected month and will be used for
          subsequent months until changed. Previous months are not modified.
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save Budget"}
        </Button>
      </form>
    </Form>
  );
}
