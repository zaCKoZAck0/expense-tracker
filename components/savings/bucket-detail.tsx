"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { PiggyBank, Plus, Target, TrendingUp, Trash, PenLineIcon, DollarSignIcon, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BucketForm } from "./bucket-form";
import { EntryForm } from "./entry-form";
import { ActivityList } from "./activity-list";
import { BalanceChart } from "./balance-chart";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SavingsBucket,
  bucketProgress,
  computeBucketStats,
  formatBucketDate,
  getBucketSwatch,
} from "./types";
import { StatTile } from "./stat-tile";

interface BucketDetailProps {
  bucket: SavingsBucket;
  formatMoney: (value: number) => string;
  onAddEntry: (
    bucketId: string,
    entry: { amount: number; date: string; notes?: string },
  ) => void;
  onAddWithdrawal: (
    bucketId: string,
    entry: { amount: number; date: string; notes?: string },
  ) => void;
  onUpdateBucket: (
    bucketId: string,
    input: {
      name: string;
      color: string;
      goalAmount?: number;
      interestYearlyPercent?: number;
    },
  ) => void;
  onUpdateEntry: (
    bucketId: string,
    entryId: string,
    input: { amount: number; date: string; notes?: string },
  ) => void;
  onDeleteBucket: (bucketId: string) => void;
  onDeleteEntry: (bucketId: string, entryId: string) => void;
}

export function BucketDetail({
  bucket,
  formatMoney,
  onAddEntry,
  onAddWithdrawal,
  onUpdateBucket,
  onUpdateEntry,
  onDeleteBucket,
  onDeleteEntry,
}: BucketDetailProps) {
  const { resolvedTheme } = useTheme();
  // Normalize theme to supported literal values to satisfy getBucketSwatch typing.
  const themeMode: "light" | "dark" | undefined =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : undefined;
  const stats = computeBucketStats(bucket);
  const hasInterestRate =
    typeof bucket.interestYearlyPercent === "number" &&
    bucket.interestYearlyPercent > 0;
  const statColumns = hasInterestRate ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const [addOpen, setAddOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [editBucketOpen, setEditBucketOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PiggyBank
            className="h-10 w-10"
            style={{
              color: getBucketSwatch(bucket.color, themeMode),
            }}
          />
          <div>
            <div className="text-lg font-semibold">{bucket.name}</div>
            <div className="text-sm text-muted-foreground">
              Created {formatBucketDate(bucket.createdAt)}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditBucketOpen(true)}>
              <PenLineIcon className="h-4 w-4" />
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

      <Dialog open={editBucketOpen} onOpenChange={setEditBucketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit bucket</DialogTitle>
            <DialogDescription>
              Update name, color, goal, or rate.
            </DialogDescription>
          </DialogHeader>
          <BucketForm
            key={bucket.id}
            submitLabel="Save changes"
            initialValues={{
              name: bucket.name,
              color: bucket.color,
              goalAmount: bucket.goalAmount,
              interestYearlyPercent: bucket.interestYearlyPercent,
            }}
            onSubmit={(input) => {
              onUpdateBucket(bucket.id, input);
              setEditBucketOpen(false);
            }}
          />
          <DialogFooter className="hidden" />
        </DialogContent>
      </Dialog>

      {/* Delete Bucket Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bucket?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the bucket and all its entries. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDeleteBucket(bucket.id)}
            >
              Delete bucket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={`grid gap-3 ${statColumns}`}>
        <StatTile
          icon={PiggyBank}
          label="Balance"
          valueLabel={formatMoney(stats.totalBalance)}
        />
        {hasInterestRate ? (
          <StatTile
            icon={TrendingUp}
            label="Interest"
            valueLabel={formatMoney(stats.interestEarned)}
          />
        ) : null}
        <StatTile
          icon={Target}
          label="Contributed"
          valueLabel={formatMoney(stats.totalContributed)}
        />
      </div>

      {bucket.goalAmount ? (
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Goal progress</span>
            <span className="font-medium">{bucketProgress(bucket)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <Progress value={bucketProgress(bucket)} />
          </div>
        </div>
      ) : null}

      {/* Balance Growth Graph */}
      <Accordion type="single" collapsible className="rounded-lg border">
        <AccordionItem value="chart" className="border-none">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Balance History
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <BalanceChart bucket={bucket} formatMoney={formatMoney} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Entries</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWithdrawOpen(true)}
          >
            <DollarSignIcon className="h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
          </DialogHeader>
          <EntryForm
            bucketId={bucket.id}
            submitLabel="Save"
            onSubmit={(id, entry) => {
              onAddEntry(id, entry);
              setAddOpen(false);
            }}
          />
          <DialogFooter className="hidden" />
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw</DialogTitle>
            <DialogDescription>
              Withdraw funds from this bucket; this reduces the current balance.
            </DialogDescription>
          </DialogHeader>
          <EntryForm
            bucketId={bucket.id}
            submitLabel="Withdraw"
            onSubmit={(id, entry) => {
              onAddWithdrawal(id, entry);
              setWithdrawOpen(false);
            }}
          />
          <DialogFooter className="hidden" />
        </DialogContent>
      </Dialog>

      <ActivityList
        bucket={bucket}
        formatMoney={formatMoney}
        onUpdateEntry={onUpdateEntry}
        onDeleteEntry={onDeleteEntry}
      />
    </div>
  );
}
