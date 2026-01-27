"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, MoreVertical, Pencil } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getCurrentMonthKey, formatCurrency } from "@/lib/utils";
import { categories, categoryIcons } from "@/lib/constants";
import { useNavigation } from "@/components/navigation-provider";
import {
  useSetBudget,
  useCategoryBudgets,
  useSetCategoryBudget,
  useDeleteCategoryBudget,
  getLocalUserId,
} from "@/hooks/use-local-data";
import { useSyncContext } from "@/components/sync-provider";
import { useUserSettings } from "@/components/user-settings-provider";

const formSchema = z.object({
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Amount cannot be negative"),
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
  const { includeEarningInBudget, setIncludeEarningInBudget } =
    useUserSettings();

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

  const currentMonth = form.watch("month");

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
                <AmountInput step="0.01" placeholder="0.00" {...field} />
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

        <div className="flex items-center justify-between gap-2 py-2">
          <Label
            htmlFor="include-earning-budget"
            className="text-sm cursor-pointer"
          >
            Include earning in budget
          </Label>
          <Switch
            id="include-earning-budget"
            checked={includeEarningInBudget}
            onCheckedChange={setIncludeEarningInBudget}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save Budget"}
        </Button>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="category-budgets" className="border-none">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              Category Budgets
            </AccordionTrigger>
            <AccordionContent>
              <CategoryBudgetsSection month={currentMonth} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>
    </Form>
  );
}

// Category Budgets Section Component
function CategoryBudgetsSection({ month }: { month: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const { data: categoryBudgets } = useCategoryBudgets(month);
  const setCategoryBudget = useSetCategoryBudget();
  const deleteCategoryBudget = useDeleteCategoryBudget();
  const { syncNow } = useSyncContext();
  const { triggerRefresh } = useNavigation();
  const { currency } = useUserSettings();

  const usedCategories = categoryBudgets.map((cb) => cb.category);
  const availableCategories = categories.filter(
    (cat) => !usedCategories.includes(cat),
  );

  const handleAddBudget = () => {
    const amount = parseFloat(newAmount);
    if (!newCategory || !amount || amount <= 0) return;

    startTransition(async () => {
      try {
        const userId = await getLocalUserId();
        await setCategoryBudget(newCategory, amount, month, userId);
        toast.success(`Budget set for ${newCategory}`);
        setNewCategory("");
        setNewAmount("");
        setIsAdding(false);
        triggerRefresh();
        syncNow().catch(console.error);
      } catch (error) {
        console.error("Failed to add category budget:", error);
        toast.error("Failed to add category budget");
      }
    });
  };

  const handleEditBudget = (cb: {
    id: string;
    category: string;
    amount: number;
  }) => {
    setEditingId(cb.id);
    setNewCategory(cb.category);
    setNewAmount(cb.amount.toString());
  };

  const handleUpdateBudget = () => {
    const amount = parseFloat(newAmount);
    if (!newCategory || !amount || amount <= 0) return;

    startTransition(async () => {
      try {
        const userId = await getLocalUserId();
        await setCategoryBudget(newCategory, amount, month, userId);
        toast.success(`Budget updated for ${newCategory}`);
        setEditingId(null);
        setNewCategory("");
        setNewAmount("");
        triggerRefresh();
        syncNow().catch(console.error);
      } catch (error) {
        console.error("Failed to update category budget:", error);
        toast.error("Failed to update category budget");
      }
    });
  };

  const handleDeleteBudget = (id: string, category: string) => {
    startTransition(async () => {
      try {
        await deleteCategoryBudget(id);
        toast.success(`Budget removed for ${category}`);
        triggerRefresh();
        syncNow().catch(console.error);
      } catch (error) {
        console.error("Failed to delete category budget:", error);
        toast.error("Failed to delete category budget");
      }
    });
  };

  return (
    <div className="space-y-3 pt-2">
      {categoryBudgets.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No category limits set
        </p>
      ) : (
        categoryBudgets.map((cb) => {
          const Icon = categoryIcons[cb.category];
          const progressValue = Math.min(100, Math.max(0, cb.percentage));
          const isEditing = editingId === cb.id;

          if (isEditing) {
            return (
              <div key={cb.id} className="space-y-2 py-2 border-y">
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2 w-42 px-3 h-9 border rounded-md bg-muted/50">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm truncate">{cb.category}</span>
                  </div>
                  <AmountInput
                    className="text-2xl"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="Amount"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={handleUpdateBudget}
                    disabled={
                      isPending || !newAmount || parseFloat(newAmount) <= 0
                    }
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setNewCategory("");
                      setNewAmount("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={cb.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">{cb.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${cb.isOverBudget ? "text-destructive" : ""}`}
                  >
                    {formatCurrency(cb.spent, currency)} /{" "}
                    {formatCurrency(cb.amount, currency)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={isPending}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditBudget(cb)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteBudget(cb.id, cb.category)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Progress
                className={`h-1.5 ${cb.isOverBudget ? "bg-destructive/20" : ""}`}
                indicatorClassName={
                  cb.isOverBudget ? "bg-destructive" : undefined
                }
                value={progressValue}
              />
            </div>
          );
        })
      )}

      {isAdding ? (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex gap-2 items-center">
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="min-w-56 h-fit">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => {
                  const Icon = categoryIcons[category];
                  return (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        {category}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <AmountInput
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0.0"
              className="h-13"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleAddBudget}
              disabled={
                isPending ||
                !newCategory ||
                !newAmount ||
                parseFloat(newAmount) <= 0
              }
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewCategory("");
                setNewAmount("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        availableCategories.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Category Limit
          </Button>
        )
      )}
    </div>
  );
}
