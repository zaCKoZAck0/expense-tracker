"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface EntryFormProps {
  bucketId: string;
  onSubmit: (
    bucketId: string,
    entry: { amount: number; date: string; notes?: string },
  ) => void;
  initialEntry?: { amount: number; date: string; notes?: string };
  submitLabel?: string;
}

export function EntryForm({
  bucketId,
  onSubmit,
  initialEntry,
  submitLabel = "Add entry",
}: EntryFormProps) {
  const [amount, setAmount] = useState<string>(
    initialEntry?.amount?.toString() ?? "",
  );
  const [date, setDate] = useState<string>(
    initialEntry?.date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [notes, setNotes] = useState<string>(initialEntry?.notes ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onSubmit(bucketId, {
      amount: Number(amount),
      date,
      notes: notes || undefined,
    });
    setAmount(initialEntry?.amount?.toString() ?? "");
    setNotes(initialEntry?.notes ?? "");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="entry-amount">Amount</Label>
          <Input
            id="entry-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entry-date">Date</Label>
          <Input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-notes">Notes (optional)</Label>
        <Textarea
          id="entry-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note"
        />
      </div>
      <Button type="submit" className="inline-flex items-center gap-2">
        <Plus className="h-4 w-4" /> {submitLabel}
      </Button>
    </form>
  );
}
