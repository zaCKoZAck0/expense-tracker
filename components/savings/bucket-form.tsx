"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { COLOR_OPTIONS } from "./types";

interface BucketFormProps {
  onSubmit: (input: {
    name: string;
    color: string;
    goalAmount?: number;
    interestYearlyPercent?: number;
  }) => void;
  initialValues?: Partial<{
    name: string;
    color: string;
    goalAmount?: number;
    interestYearlyPercent?: number;
  }>;
  submitLabel?: string;
}

export function BucketForm({
  onSubmit,
  initialValues,
  submitLabel = "Create bucket",
}: BucketFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [color, setColor] = useState<string>(
    initialValues?.color ?? COLOR_OPTIONS[0]?.id ?? "peach",
  );
  const [goalAmount, setGoalAmount] = useState<string>(
    initialValues?.goalAmount?.toString() ?? "",
  );
  const [interest, setInterest] = useState<string>(
    initialValues?.interestYearlyPercent?.toString() ?? "",
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      color,
      goalAmount: goalAmount ? Number(goalAmount) : undefined,
      interestYearlyPercent: interest ? Number(interest) : undefined,
    });
    setName(initialValues?.name ?? "");
    setColor(initialValues?.color ?? COLOR_OPTIONS[0]?.id ?? "peach");
    setGoalAmount(initialValues?.goalAmount?.toString() ?? "");
    setInterest(initialValues?.interestYearlyPercent?.toString() ?? "");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bucket-name">Name</Label>
        <Input
          id="bucket-name"
          placeholder="Vacation, Emergency Fund"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="grid grid-cols-5 gap-4">
          {COLOR_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-label={option.label}
              title={option.label}
              onClick={() => setColor(option.id)}
              className={`aspect-square w-full rounded-lg border transition hover:shadow-sm ${
                color === option.id
                  ? "ring-2 ring-offset-2 ring-primary border-transparent"
                  : "border-foreground/50"
              }`}
              style={{ backgroundColor: option.swatch }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal">Goal amount (optional)</Label>
        <Input
          id="goal"
          type="number"
          min="0"
          step="0.01"
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          placeholder="5000"
        />
      </div>

      <Accordion type="single" collapsible className="rounded-lg border">
        <AccordionItem value="advanced">
          <AccordionTrigger className="px-4 text-sm font-semibold">
            Advanced
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="interest">APR % (optional)</Label>
              <Input
                id="interest"
                type="number"
                min="0"
                step="0.01"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="5.5"
              />
              <p className="text-xs text-muted-foreground">
                Set only if this bucket earns interest.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type="submit" className="inline-flex items-center gap-2">
        <Plus className="h-4 w-4" /> {submitLabel}
      </Button>
    </form>
  );
}
