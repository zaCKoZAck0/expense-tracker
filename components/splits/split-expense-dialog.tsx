"use client";

import * as React from "react";
import { Percent, DollarSign, Equal, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ContactSelect } from "./contact-select";
import {
  ParticipantList,
  type ParticipantSplit,
  type SplitMethod,
} from "./participant-list";
import type { Contact, SplitInput, Expense } from "@/lib/types";
import {
  getContacts,
  addContact,
  updateExpenseWithSplits,
} from "@/app/actions";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency } from "@/lib/utils";

interface SplitExpenseDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * SplitExpenseDialog - Splitwise-like expense splitting dialog
 *
 * Features:
 * - Equal split: Divide evenly among selected people
 * - Exact amounts: Specify exact amount for each person
 * - Percentages: Specify percentage for each person
 * - Shares: Split by shares (e.g., 2 shares vs 1 share)
 */
export function SplitExpenseDialog({
  expense,
  open,
  onOpenChange,
  onSuccess,
}: SplitExpenseDialogProps) {
  const { currency } = useUserSettings();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [splitMethod, setSplitMethod] = React.useState<SplitMethod>("equal");

  // Participants list with their split details
  const [participants, setParticipants] = React.useState<ParticipantSplit[]>([
    {
      contactId: null,
      contactName: "You",
      included: true,
      amount: expense.amount,
      percentage: 100,
      shares: 1,
    },
  ]);

  const totalAmount = expense.amount;

  // Load contacts when dialog opens
  React.useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open]);

  // Initialize from existing splits or reset
  React.useEffect(() => {
    if (open && expense.splits && expense.splits.length > 0) {
      const existingSplits: ParticipantSplit[] = expense.splits.map((s) => ({
        contactId: s.contactId ?? null,
        contactName: s.contact?.name || (s.isYourShare ? "You" : "Unknown"),
        included: true,
        amount: s.amount,
        percentage: s.percentage ?? (s.amount / totalAmount) * 100,
        shares: 1,
      }));
      setParticipants(existingSplits);
    } else if (open) {
      // Reset to just "You" when opening fresh
      setParticipants([
        {
          contactId: null,
          contactName: "You",
          included: true,
          amount: totalAmount,
          percentage: 100,
          shares: 1,
        },
      ]);
    }
  }, [open, expense.splits, totalAmount]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const result = await getContacts();
      if (result.success) {
        setContacts(result.data);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a new contact
  const handleAddContact = async (name: string): Promise<Contact> => {
    const result = await addContact({ name });
    if (!result.success) {
      throw new Error(result.error);
    }
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === result.data.id);
      if (exists) return prev;
      return [...prev, result.data].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
    return result.data;
  };

  // Add a participant from contacts
  const addParticipant = (contact: Contact) => {
    if (participants.some((p) => p.contactId === contact.id)) {
      return;
    }

    const newParticipant: ParticipantSplit = {
      contactId: contact.id,
      contactName: contact.name,
      included: true,
      amount: 0,
      percentage: 0,
      shares: 1,
    };

    const updated = [...participants, newParticipant];
    setParticipants(updated);
    recalculateSplits(updated, splitMethod);
  };

  // Remove a participant
  const removeParticipant = (contactId: string | null) => {
    if (contactId === null) return; // Can't remove "You"
    const updated = participants.filter((p) => p.contactId !== contactId);
    setParticipants(updated);
    recalculateSplits(updated, splitMethod);
  };

  // Toggle participant inclusion
  const toggleParticipant = (contactId: string | null) => {
    const updated = participants.map((p) =>
      p.contactId === contactId ? { ...p, included: !p.included } : p,
    );
    setParticipants(updated);
    recalculateSplits(updated, splitMethod);
  };

  // Recalculate splits based on method
  const recalculateSplits = (
    parts: ParticipantSplit[],
    method: SplitMethod,
  ) => {
    const included = parts.filter((p) => p.included);
    const count = included.length;

    if (count === 0) return;

    let updated: ParticipantSplit[];

    switch (method) {
      case "equal": {
        const equalAmount = Math.round((totalAmount / count) * 100) / 100;
        const remainder =
          Math.round((totalAmount - equalAmount * count) * 100) / 100;
        let remainderAssigned = false;

        updated = parts.map((p) => {
          if (!p.included) {
            return { ...p, amount: 0, percentage: 0 };
          }
          const amount = !remainderAssigned
            ? equalAmount + remainder
            : equalAmount;
          remainderAssigned = true;
          return {
            ...p,
            amount,
            percentage: Math.round((amount / totalAmount) * 100 * 100) / 100,
          };
        });
        break;
      }

      case "shares": {
        const totalShares = included.reduce((sum, p) => sum + p.shares, 0);
        const perShare = totalShares > 0 ? totalAmount / totalShares : 0;

        updated = parts.map((p) => {
          if (!p.included) {
            return { ...p, amount: 0, percentage: 0 };
          }
          const amount = Math.round(perShare * p.shares * 100) / 100;
          return {
            ...p,
            amount,
            percentage: Math.round((amount / totalAmount) * 100 * 100) / 100,
          };
        });
        break;
      }

      case "percentage": {
        updated = parts.map((p) => {
          const amount =
            Math.round(((totalAmount * p.percentage) / 100) * 100) / 100;
          return { ...p, amount };
        });
        break;
      }

      case "exact":
      default:
        updated = parts;
        break;
    }

    setParticipants(updated);
  };

  // Handle split method change
  const handleMethodChange = (method: SplitMethod) => {
    setSplitMethod(method);
    recalculateSplits(participants, method);
  };

  // Update individual values
  const updateAmount = (contactId: string | null, value: number) => {
    const updated = participants.map((p) =>
      p.contactId === contactId
        ? {
            ...p,
            amount: value,
            percentage:
              totalAmount > 0
                ? Math.round((value / totalAmount) * 100 * 100) / 100
                : 0,
          }
        : p,
    );
    setParticipants(updated);
  };

  const updatePercentage = (contactId: string | null, value: number) => {
    const updated = participants.map((p) =>
      p.contactId === contactId
        ? {
            ...p,
            percentage: value,
            amount: Math.round(((totalAmount * value) / 100) * 100) / 100,
          }
        : p,
    );
    setParticipants(updated);
  };

  const updateShares = (contactId: string | null, value: number) => {
    const updated = participants.map((p) =>
      p.contactId === contactId ? { ...p, shares: value } : p,
    );
    setParticipants(updated);
    recalculateSplits(updated, "shares");
  };

  // Calculate totals for validation
  const includedParticipants = participants.filter((p) => p.included);
  const totalSplitAmount = includedParticipants.reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const totalPercentage = includedParticipants.reduce(
    (sum, p) => sum + p.percentage,
    0,
  );
  const totalShares = includedParticipants.reduce(
    (sum, p) => sum + p.shares,
    0,
  );

  const isBalanced = Math.abs(totalSplitAmount - totalAmount) < 0.01;
  const isPercentageBalanced = Math.abs(totalPercentage - 100) < 0.1;

  // Save the split
  const handleSave = async () => {
    if (!isBalanced && splitMethod !== "percentage") {
      toast.error("Split amounts must equal the total");
      return;
    }
    if (!isPercentageBalanced && splitMethod === "percentage") {
      toast.error("Percentages must add up to 100%");
      return;
    }

    setIsSaving(true);
    try {
      const splits: SplitInput[] = includedParticipants.map((p) => ({
        contactId: p.contactId,
        contactName: p.contactName,
        amount: p.amount,
        percentage: p.percentage,
        isYourShare: p.contactId === null,
      }));

      const result = await updateExpenseWithSplits(expense.id, {
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        notes: expense.notes ?? undefined,
        type: expense.type,
        isSplit: true,
        splits,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Expense split saved");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save split:", error);
      toast.error("Failed to save split");
    } finally {
      setIsSaving(false);
    }
  };

  // Available contacts not yet added
  const availableContacts = contacts.filter(
    (c) => !participants.some((p) => p.contactId === c.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col px-3 md:px-6">
        <DialogHeader>
          <DialogTitle>Split Expense</DialogTitle>
          <DialogDescription>
            Split {formatCurrency(totalAmount, currency)} with others
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Split Method Tabs */}
          <Tabs
            value={splitMethod}
            onValueChange={(v) => handleMethodChange(v as SplitMethod)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="equal" className="text-xs px-2">
                <Equal className="h-3 w-3 mr-1" />
                <span className="hidden md:inline">Equal</span>
              </TabsTrigger>
              <TabsTrigger value="exact" className="text-xs px-2">
                <DollarSign className="h-3 w-3 mr-1" />
                <span className="hidden md:inline">Exact</span>
              </TabsTrigger>
              <TabsTrigger value="percentage" className="text-xs px-2">
                <Percent className="h-3 w-3 mr-1" />
                <span className="hidden md:inline">Percentage</span>
              </TabsTrigger>
              <TabsTrigger value="shares" className="text-xs px-2">
                <Hash className="h-3 w-3 mr-1" />
                <span className="hidden md:inline">Shares</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Add Participants */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Add people</Label>
            <ContactSelect
              contacts={availableContacts}
              selectedContactIds={[]}
              onSelectionChange={(ids) => {
                const contactId = ids[ids.length - 1];
                if (contactId) {
                  const contact = contacts.find((c) => c.id === contactId);
                  if (contact) addParticipant(contact);
                }
              }}
              onAddContact={async (name) => {
                const contact = await handleAddContact(name);
                addParticipant(contact);
                return contact;
              }}
              disabled={isLoading}
              includeYou={false}
            />
          </div>

          {/* Participants List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Split between ({includedParticipants.length})
              </Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isBalanced
                    ? "text-muted-foreground"
                    : "text-destructive font-medium",
                )}
              >
                {formatCurrency(totalSplitAmount, currency)} /{" "}
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>

            <ParticipantList
              participants={participants}
              splitMethod={splitMethod}
              currency={currency}
              onToggleParticipant={toggleParticipant}
              onRemoveParticipant={removeParticipant}
              onUpdateAmount={updateAmount}
              onUpdatePercentage={updatePercentage}
              onUpdateShares={updateShares}
            />
          </div>

          {/* Summary */}
          {splitMethod === "shares" && (
            <div className="text-xs text-muted-foreground">
              Total: {totalShares} shares ={" "}
              {formatCurrency(totalAmount / totalShares, currency)} per share
            </div>
          )}

          {/* Validation Warning */}
          {!isBalanced && splitMethod !== "percentage" && (
            <p className="text-xs text-destructive">
              Amounts must add up to {formatCurrency(totalAmount, currency)}{" "}
              (currently {formatCurrency(totalSplitAmount, currency)})
            </p>
          )}
          {!isPercentageBalanced && splitMethod === "percentage" && (
            <p className="text-xs text-destructive">
              Percentages must add up to 100% (currently{" "}
              {totalPercentage.toFixed(1)}%)
            </p>
          )}
        </div>

        <DialogFooter className="">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSaving ||
              (!isBalanced && splitMethod !== "percentage") ||
              (!isPercentageBalanced && splitMethod === "percentage")
            }
          >
            {isSaving ? "Saving..." : "Save Split"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
