"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EntryForm } from "./entry-form";
import { SavingsBucket } from "./types";

interface ActivityListProps {
  bucket: SavingsBucket;
  formatMoney: (value: number) => string;
  onUpdateEntry: (
    bucketId: string,
    entryId: string,
    input: { amount: number; date: string; notes?: string },
  ) => void;
  onDeleteEntry: (bucketId: string, entryId: string) => void;
}

export function ActivityList({
  bucket,
  formatMoney,
  onUpdateEntry,
  onDeleteEntry,
}: ActivityListProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Activity</h3>
      {bucket.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <div className="space-y-2">
          {bucket.entries.map((entry) => {
            const isWithdrawal = entry.entryType === "withdrawal";
            const days = isWithdrawal ? 0 : daysBetween(entry.date, new Date());
            const factor =
              !isWithdrawal && bucket.interestYearlyPercent
                ? Math.pow(
                    1 + (bucket.interestYearlyPercent ?? 0) / 100,
                    days / 365,
                  )
                : 1;
            const grown = isWithdrawal ? -entry.amount : entry.amount * factor;
            const isEditing = editingEntryId === entry.id;
            const isDeleting = deletingEntryId === entry.id;
            const entryDateISO = format(new Date(entry.date), "yyyy-MM-dd");
            return (
              <div
                key={entry.id}
                className="rounded-lg border bg-muted/40 px-3 py-2 flex items-center justify-between"
              >
                <div className="space-y-1 group">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{formatMoney(grown)}</div>
                    <Badge
                      variant={isWithdrawal ? "destructive" : "default"}
                      className="inline-flex items-center gap-1 px-2 py-1"
                      aria-label={isWithdrawal ? "Withdrawal" : "Deposit"}
                    >
                      {isWithdrawal ? (
                        <ArrowDownLeft className="h-6 w-6" strokeWidth={2.5} />
                      ) : (
                        <ArrowUpRight className="h-6 w-6" strokeWidth={2.5} />
                      )}
                      <span className="sr-only">
                        {isWithdrawal ? "Withdrawal" : "Deposit"}
                      </span>
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isWithdrawal ? (
                      <>
                        Withdrawn {format(new Date(entry.date), "MMM d, yyyy")}
                      </>
                    ) : (
                      <>
                        Saved {format(new Date(entry.date), "MMM d, yyyy")} (
                        {factor.toFixed(3)}x)
                      </>
                    )}
                  </div>
                  {entry.notes ? (
                    <div className="text-xs text-muted-foreground">
                      {entry.notes}
                    </div>
                  ) : null}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingEntryId(entry.id)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingEntryId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Edit Entry Dialog */}
                <Dialog
                  open={isEditing}
                  onOpenChange={(open) =>
                    setEditingEntryId(open ? entry.id : null)
                  }
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit entry</DialogTitle>
                      <DialogDescription>
                        Adjust amount, date, or notes for this entry.
                      </DialogDescription>
                    </DialogHeader>
                    <EntryForm
                      key={entry.id}
                      bucketId={bucket.id}
                      initialEntry={{
                        amount: entry.amount,
                        date: entryDateISO,
                        notes: entry.notes,
                      }}
                      submitLabel={
                        isWithdrawal ? "Save withdrawal" : "Save entry"
                      }
                      onSubmit={(id, updated) => {
                        onUpdateEntry(id, entry.id, updated);
                        setEditingEntryId(null);
                      }}
                    />
                    <DialogFooter className="hidden" />
                  </DialogContent>
                </Dialog>

                {/* Delete Entry Confirmation */}
                <AlertDialog
                  open={isDeleting}
                  onOpenChange={(open) =>
                    setDeletingEntryId(open ? entry.id : null)
                  }
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the entry and update the bucket
                        balance.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          onDeleteEntry(bucket.id, entry.id);
                          setDeletingEntryId(null);
                        }}
                      >
                        Delete entry
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Local helper to avoid re-importing in parent
function daysBetween(startISO: string, end: Date) {
  const start = new Date(startISO);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
