"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ContactSelect } from "./contact-select";
import type { Contact, SplitType, SplitInput } from "@/lib/types";
import { getInitials, getAvatarColor } from "@/lib/avatar";
import { Equal, Percent, DollarSign, Users, X } from "lucide-react";
import * as React from "react";
import { useSession } from "next-auth/react";


interface SplitConfigurationProps {
  totalAmount: number;
  contacts: Contact[];
  splits: SplitInput[];
  onSplitsChange: (splits: SplitInput[]) => void;
  onAddContact: (name: string) => Promise<Contact>;
  disabled?: boolean;
}

/**
 * SplitConfiguration - Complete expense splitting configuration
 * Supports equal, percentage, and exact amount splits
 */
export function SplitConfiguration({
  totalAmount,
  contacts,
  splits,
  onSplitsChange,
  onAddContact,
  disabled = false,
}: SplitConfigurationProps) {
  const { data: session } = useSession();
  const [splitType, setSplitType] = React.useState<SplitType>("equal");
  const [selectedContactIds, setSelectedContactIds] = React.useState<
    (string | null)[]
  >([null]); // Start with "You" selected


  // Get contact name by id
  const getContactName = (contactId: string | null): string => {
    if (contactId === null) return "You";
    const contact = contacts.find((c) => c.id === contactId);
    return contact?.name || "Unknown";
  };

  // Calculate splits based on split type and selected contacts
  const calculateSplits = React.useCallback(
    (
      type: SplitType,
      contactIds: (string | null)[],
      currentSplits: SplitInput[],
    ): SplitInput[] => {
      if (contactIds.length === 0 || totalAmount <= 0) return [];

      const count = contactIds.length;

      switch (type) {
        case "equal": {
          const equalAmount = Math.round((totalAmount / count) * 100) / 100;
          // Handle rounding by giving remainder to first person
          const remainder =
            Math.round((totalAmount - equalAmount * count) * 100) / 100;

          return contactIds.map((contactId, index) => ({
            contactId,
            contactName: getContactName(contactId),
            amount: index === 0 ? equalAmount + remainder : equalAmount,
            percentage: Math.round((100 / count) * 100) / 100,
            isYourShare: contactId === null,
          }));
        }

        case "percentage": {
          // Keep existing percentages if available, otherwise distribute equally
          const existingPercentages = new Map(
            currentSplits.map((s) => [s.contactId, s.percentage || 0]),
          );

          // Calculate total existing percentage for selected contacts
          let totalExistingPercent = 0;
          const newContactIds: (string | null)[] = [];

          for (const contactId of contactIds) {
            if (existingPercentages.has(contactId)) {
              totalExistingPercent += existingPercentages.get(contactId) || 0;
            } else {
              newContactIds.push(contactId);
            }
          }

          // Distribute remaining percentage to new contacts
          const remainingPercent = 100 - totalExistingPercent;
          const perNewContact =
            newContactIds.length > 0
              ? remainingPercent / newContactIds.length
              : 0;

          return contactIds.map((contactId) => {
            const isNew = newContactIds.includes(contactId);
            const percentage = isNew
              ? perNewContact
              : existingPercentages.get(contactId) || 0;
            const amount =
              Math.round(((totalAmount * percentage) / 100) * 100) / 100;

            return {
              contactId,
              contactName: getContactName(contactId),
              amount,
              percentage,
              isYourShare: contactId === null,
            };
          });
        }

        case "exact": {
          // Keep existing amounts if available
          const existingAmounts = new Map(
            currentSplits.map((s) => [s.contactId, s.amount]),
          );

          return contactIds.map((contactId) => {
            const existingAmount = existingAmounts.get(contactId);
            const amount = existingAmount !== undefined ? existingAmount : 0;
            const percentage =
              totalAmount > 0
                ? Math.round((amount / totalAmount) * 100 * 100) / 100
                : 0;

            return {
              contactId,
              contactName: getContactName(contactId),
              amount,
              percentage,
              isYourShare: contactId === null,
            };
          });
        }

        default:
          return [];
      }
    },
    [totalAmount, contacts, getContactName],
  );

  // Handle selection change
  const handleSelectionChange = (contactIds: (string | null)[]) => {
    setSelectedContactIds(contactIds);
    const newSplits = calculateSplits(splitType, contactIds, splits);
    onSplitsChange(newSplits);
  };

  // Handle split type change
  const handleSplitTypeChange = (value: string) => {
    if (!value) return;
    const newType = value as SplitType;
    setSplitType(newType);
    const newSplits = calculateSplits(newType, selectedContactIds, splits);
    onSplitsChange(newSplits);
  };

  // Handle individual amount change (for exact split)
  const handleAmountChange = (contactId: string | null, value: string) => {
    const newAmount = parseFloat(value) || 0;
    const newSplits = splits.map((split) =>
      split.contactId === contactId
        ? {
            ...split,
            amount: newAmount,
            percentage:
              totalAmount > 0
                ? Math.round((newAmount / totalAmount) * 100 * 100) / 100
                : 0,
          }
        : split,
    );
    onSplitsChange(newSplits);
  };

  // Handle individual percentage change (for percentage split)
  const handlePercentageChange = (contactId: string | null, value: string) => {
    const newPercentage = parseFloat(value) || 0;
    const newAmount =
      Math.round(((totalAmount * newPercentage) / 100) * 100) / 100;
    const newSplits = splits.map((split) =>
      split.contactId === contactId
        ? { ...split, percentage: newPercentage, amount: newAmount }
        : split,
    );
    onSplitsChange(newSplits);
  };

  // Remove a person from the split
  const handleRemovePerson = (contactId: string | null) => {
    const newContactIds = selectedContactIds.filter((id) => id !== contactId);
    handleSelectionChange(newContactIds);
  };

  // Recalculate when total amount changes
  React.useEffect(() => {
    if (selectedContactIds.length > 0) {
      const newSplits = calculateSplits(splitType, selectedContactIds, splits);
      onSplitsChange(newSplits);
    }
  }, [totalAmount]);

  // Initialize splits on mount if we have selections
  React.useEffect(() => {
    if (
      splits.length === 0 &&
      selectedContactIds.length > 0 &&
      totalAmount > 0
    ) {
      const initialSplits = calculateSplits(splitType, selectedContactIds, []);
      onSplitsChange(initialSplits);
    }
  }, []);

  // Calculate totals for validation display
  const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
  const totalPercentage = splits.reduce(
    (sum, s) => sum + (s.percentage || 0),
    0,
  );
  const isBalanced =
    Math.abs(totalSplitAmount - totalAmount) < 0.01 ||
    Math.abs(totalPercentage - 100) < 0.1;

  return (
    <div className="space-y-4">
      {/* Contact Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Split with</Label>
        <ContactSelect
          contacts={contacts}
          selectedContactIds={selectedContactIds}
          onSelectionChange={handleSelectionChange}
          onAddContact={onAddContact}
          disabled={disabled}
          includeYou={true}
        />
      </div>

      {/* Split Type Selection */}
      {selectedContactIds.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Split type</Label>
          <ToggleGroup
            type="single"
            value={splitType}
            onValueChange={handleSplitTypeChange}
            className="justify-start"
          >
            <ToggleGroupItem
              value="equal"
              aria-label="Split equally"
              className="gap-1.5"
            >
              <Equal className="h-4 w-4" />
              <span>Equal</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="percentage"
              aria-label="Split by percentage"
              className="gap-1.5"
            >
              <Percent className="h-4 w-4" />
              <span>Percentage</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="exact"
              aria-label="Split by exact amounts"
              className="gap-1.5"
            >
              <DollarSign className="h-4 w-4" />
              <span>Exact</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Split Details */}
      {splits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium text-xl">Split details</Label>
            <span
              className={cn(
                "text-xs",
                isBalanced ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {splitType === "percentage"
                ? `${totalPercentage.toFixed(1)}% of 100%`
                : `$${totalSplitAmount.toFixed(2)} of $${totalAmount.toFixed(2)}`}
            </span>
          </div>

          <div className="space-y-2">
            {splits.map((split) => (
              <div
                key={split.contactId ?? "you"}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8">
                  {split.contactId === null && session?.user?.image ? (
                    <AvatarImage
                      src={session.user.image}
                      alt={session.user.name || "You"}
                    />
                  ) : null}
                  <AvatarFallback
                    className={cn(
                      "text-foreground text-xs",
                      split.contactId === null
                        ? "bg-primary text-primary-foreground"
                        : getAvatarColor(split.contactName || ""),
                    )}
                  >
                    {split.contactId === null ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      getInitials(split.contactName || "")
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <span className="font-medium text-sm flex-1 min-w-0 truncate">
                  {split.contactName}
                  {split.isYourShare && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                </span>

                {/* Input based on split type */}
                {splitType === "equal" ? (
                  <span className="text-sm font-medium tabular-nums">
                    ${split.amount.toFixed(2)}
                  </span>
                ) : splitType === "percentage" ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={split.percentage || ""}
                      onChange={(e) =>
                        handlePercentageChange(
                          split.contactId ?? null,
                          e.target.value,
                        )
                      }
                      className="w-16 h-8 text-right text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={disabled}
                    />
                    <span className="text-muted-foreground text-sm">%</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      (${split.amount.toFixed(2)})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={split.amount || ""}
                      onChange={(e) =>
                        handleAmountChange(
                          split.contactId ?? null,
                          e.target.value,
                        )
                      }
                      className="w-20 h-8 text-right text-sm"
                      min="0"
                      step="0.01"
                      disabled={disabled}
                    />
                  </div>
                )}

                {/* Remove button (only if more than one person) */}
                {splits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemovePerson(split.contactId ?? null)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Validation Warning */}
          {!isBalanced && (
            <p className="text-xs text-destructive">
              {splitType === "percentage"
                ? `Percentages must add up to 100% (currently ${totalPercentage.toFixed(1)}%)`
                : `Amounts must add up to $${totalAmount.toFixed(2)} (currently $${totalSplitAmount.toFixed(2)})`}
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {selectedContactIds.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Select people to split this expense with
        </div>
      )}
    </div>
  );
}
