"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserSettings } from "@/components/user-settings-provider";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getBudgetTrendData } from "@/app/actions/analytics";
import { BucketForm } from "@/components/savings/bucket-form";
import { BucketDetail } from "@/components/savings/bucket-detail";
import {
  SavingsBucket,
  computeBucketStats,
  bucketProgress,
  getBucketSwatch,
} from "@/components/savings/types";
import {
  useSavingsData,
  useAddBucket,
  useUpdateBucket,
  useDeleteBucket,
  useAddEntry,
  useUpdateEntry,
  useDeleteEntry,
  getLocalUserId,
} from "@/hooks/use-savings-data";
import { useSyncContext } from "@/components/sync-provider";

type BudgetSavingsStats = {
  totalSavings: number;
  previousSavings: number;
};

type BudgetTrendPoint = {
  month: string;
  budget: number;
  spend: number;
};

interface BudgetSavingsCardProps {
  formatMoney: (value: number) => string;
  totalAmount: number;
  previousAmount: number;
  isLoading: boolean;
}

function BudgetSavingsCard({
  formatMoney,
  totalAmount,
  previousAmount,
  isLoading,
}: BudgetSavingsCardProps) {
  const previousDisplay =
    previousAmount >= 0
      ? `+${formatMoney(previousAmount)}`
      : formatMoney(previousAmount);

  return (
    <Card className="bg-muted/40">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Budget savings</CardTitle>
        <PiggyBank className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="flex items-baseline gap-3">
        <p className="text-3xl font-semibold">
          {isLoading ? "Calculating..." : formatMoney(totalAmount)}
        </p>
        {!isLoading ? (
          <span className="text-sm font-semibold text-emerald-600">
            {previousDisplay}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SavingsPage() {
  const { resolvedTheme } = useTheme();
  const { isOnline } = useSyncContext();
  const { buckets, isLoading: loading } = useSavingsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { currency } = useUserSettings();
  const [budgetSavings, setBudgetSavings] = useState<BudgetSavingsStats>({
    totalSavings: 0,
    previousSavings: 0,
  });
  const [budgetSavingsLoading, setBudgetSavingsLoading] = useState(true);

  // Hooks for offline-first mutations
  const addBucketMutation = useAddBucket();
  const updateBucketMutation = useUpdateBucket();
  const deleteBucketMutation = useDeleteBucket();
  const addEntryMutation = useAddEntry();
  const updateEntryMutation = useUpdateEntry();
  const deleteEntryMutation = useDeleteEntry();

  const formatMoney = useMemo(() => {
    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
      return (value: number) => formatter.format(value);
    } catch {
      const fallback = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
      return (value: number) => fallback.format(value);
    }
  }, [currency]);

  async function loadBudgetSavings() {
    setBudgetSavingsLoading(true);
    try {
      const trend = await getBudgetTrendData();
      const points: BudgetTrendPoint[] = Array.isArray(trend) ? trend : [];

      const completedPoints = points.slice(0, -1); // exclude current month
      if (completedPoints.length === 0) {
        setBudgetSavings({ totalSavings: 0, previousSavings: 0 });
        return;
      }

      // Over-budget months reduce totals; include negatives in sums.
      const totalSavings = completedPoints.reduce(
        (acc, point) => acc + ((point?.budget ?? 0) - (point?.spend ?? 0)),
        0,
      );

      const lastCompleted = completedPoints[completedPoints.length - 1];
      const previousSavings =
        (lastCompleted?.budget ?? 0) - (lastCompleted?.spend ?? 0);

      setBudgetSavings({
        totalSavings,
        previousSavings,
      });
    } catch (err) {
      console.error(err);
      toast.error("Unable to calculate budget savings right now.");
      setBudgetSavings({ totalSavings: 0, previousSavings: 0 });
    } finally {
      setBudgetSavingsLoading(false);
    }
  }

  useEffect(() => {
    loadBudgetSavings();
  }, []);

  const selectedBucket = useMemo(
    () => buckets.find((b) => b.id === selectedId) ?? null,
    [buckets, selectedId],
  );

  async function addBucket(input: {
    name: string;
    color: string;
    goalAmount?: number;
    interestYearlyPercent?: number;
  }) {
    try {
      const userId = await getLocalUserId();
      const newId = await addBucketMutation(input, userId);
      setSelectedId(newId);
      setCreateOpen(false);
      if (!isOnline) {
        toast.success("Bucket created (will sync when online)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not create bucket.");
    }
  }

  async function addEntry(
    bucketId: string,
    entry: { amount: number; date: string; notes?: string },
  ) {
    try {
      const userId = await getLocalUserId();
      await addEntryMutation(bucketId, entry, "deposit", userId);
      if (!isOnline) {
        toast.success("Entry added (will sync when online)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not add entry.");
    }
  }

  async function addWithdrawal(
    bucketId: string,
    entry: { amount: number; date: string; notes?: string },
  ) {
    try {
      const userId = await getLocalUserId();
      await addEntryMutation(bucketId, entry, "withdrawal", userId);
      if (!isOnline) {
        toast.success("Withdrawal added (will sync when online)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not withdraw.");
    }
  }

  async function updateBucket(
    bucketId: string,
    input: {
      name: string;
      color: string;
      goalAmount?: number;
      interestYearlyPercent?: number;
    },
  ) {
    try {
      await updateBucketMutation(bucketId, input);
      if (!isOnline) {
        toast.success("Bucket updated (will sync when online)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not update bucket.");
    }
  }

  async function deleteBucket(bucketId: string) {
    try {
      await deleteBucketMutation(bucketId);
      setSelectedId(null);
      toast.success("Bucket deleted");
    } catch (err) {
      console.error(err);
      toast.error("Could not delete bucket.");
    }
  }

  async function updateEntry(
    bucketId: string,
    entryId: string,
    input: { amount: number; date: string; notes?: string },
  ) {
    try {
      await updateEntryMutation(bucketId, entryId, input);
      if (!isOnline) {
        toast.success("Entry updated (will sync when online)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not update entry.");
    }
  }

  async function deleteEntry(bucketId: string, entryId: string) {
    try {
      await deleteEntryMutation(bucketId, entryId);
      toast.success("Entry deleted");
    } catch (err) {
      console.error(err);
      toast.error("Could not delete entry.");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-2 sm:px-4 py-4">
        <p className="text-sm text-muted-foreground">Loading savings…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-4 space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Savings</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> New bucket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create savings bucket</DialogTitle>
              <DialogDescription>
                Add a name, pick a color, and optionally set a goal and interest
                rate.
              </DialogDescription>
            </DialogHeader>
            <BucketForm onSubmit={addBucket} />
            <DialogFooter className="hidden" />
          </DialogContent>
        </Dialog>
      </div>

      {selectedBucket ? (
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedId(null)}
                className="-ml-2 inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BucketDetail
              bucket={selectedBucket}
              onAddEntry={addEntry}
              onAddWithdrawal={addWithdrawal}
              onUpdateBucket={updateBucket}
              onUpdateEntry={updateEntry}
              onDeleteBucket={deleteBucket}
              onDeleteEntry={deleteEntry}
              formatMoney={formatMoney}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <BudgetSavingsCard
            formatMoney={formatMoney}
            totalAmount={budgetSavings.totalSavings}
            previousAmount={budgetSavings.previousSavings}
            isLoading={budgetSavingsLoading}
          />
          {buckets.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No buckets yet. Create your first one above.
              </CardContent>
            </Card>
          ) : (
            buckets.map((bucket) => {
              const stats = computeBucketStats(bucket);
              return (
                <Card
                  key={bucket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(bucket.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(bucket.id);
                    }
                  }}
                  className="cursor-pointer transition hover:border-primary/60"
                >
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <PiggyBank
                        className="h-14 w-14"
                        style={{
                          color: getBucketSwatch(
                            bucket.color,
                            resolvedTheme === "dark"
                              ? "dark"
                              : resolvedTheme === "light"
                                ? "light"
                                : undefined,
                          ),
                        }}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="text-lg leading-tight">
                          {bucket.name}
                        </div>
                        <div className="text-2xl font-bold leading-tight">
                          {formatMoney(stats.totalBalance)}
                        </div>
                        {bucket.goalAmount ? (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground"></div>
                            <Progress
                              className="h-4"
                              value={bucketProgress(bucket)}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
