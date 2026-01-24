"use client";

import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  submitLabel = "Save",
}: EntryFormProps) {
  const [amount, setAmount] = useState<string>(
    initialEntry?.amount?.toString() ?? "",
  );

  // Parse initial date or use today
  const getInitialDate = () => {
    if (initialEntry?.date) {
      return parse(initialEntry.date, "yyyy-MM-dd", new Date());
    }
    return new Date();
  };

  const [date, setDate] = useState<Date>(getInitialDate);
  const [notes, setNotes] = useState<string>(initialEntry?.notes ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    onSubmit(bucketId, {
      amount: Number(amount),
      date: format(date, "yyyy-MM-dd"),
      notes: notes || undefined,
    });
    setAmount(initialEntry?.amount?.toString() ?? "");
    setNotes(initialEntry?.notes ?? "");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="entry-amount">Amount</Label>
        <AmountInput
          id="entry-amount"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "w-full text-left font-normal hover:bg-background/80",
                !date && "text-muted-foreground",
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-6 w-6 text-primary" strokeWidth={2.5} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) =>
                d > new Date() || d < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-notes">Notes (optional)</Label>
        <Input
          id="entry-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note"
        />
      </div>
      <div className="w-full flex justify-center pt-3">
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
