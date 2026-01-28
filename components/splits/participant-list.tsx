"use client";

import * as React from "react";
import { X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { AmountInput } from "../ui/amount-input";

export type SplitMethod = "equal" | "exact" | "percentage" | "shares";

// Get currency symbol from currency code
const getCurrencySymbol = (currency: string): string => {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value || currency
    );
  } catch {
    return currency;
  }
};

export interface ParticipantSplit {
  contactId: string | null; // null = "You"
  contactName: string;
  included: boolean;
  amount: number;
  percentage: number;
  shares: number;
}

interface ParticipantListProps {
  participants: ParticipantSplit[];
  splitMethod: SplitMethod;
  currency: string;
  onToggleParticipant: (contactId: string | null) => void;
  onRemoveParticipant: (contactId: string | null) => void;
  onUpdateAmount: (contactId: string | null, value: number) => void;
  onUpdatePercentage: (contactId: string | null, value: number) => void;
  onUpdateShares: (contactId: string | null, value: number) => void;
}

// Get avatar initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Get consistent avatar color based on name
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];
  const index =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
};

/**
 * ParticipantRow - Single row for a participant in the split list
 */
function ParticipantRow({
  participant,
  splitMethod,
  currency,
  onToggle,
  onRemove,
  onUpdateAmount,
  onUpdatePercentage,
  onUpdateShares,
}: {
  participant: ParticipantSplit;
  splitMethod: SplitMethod;
  currency: string;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateAmount: (value: number) => void;
  onUpdatePercentage: (value: number) => void;
  onUpdateShares: (value: number) => void;
}) {
  const isYou = participant.contactId === null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        participant.included ? "bg-card" : "bg-muted/30 opacity-60",
      )}
    >
      {/* Include Checkbox */}
      <Checkbox
        checked={participant.included}
        onCheckedChange={onToggle}
        disabled={isYou} // Can't uncheck "You"
      />

      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarFallback
          className={cn(
            "text-white text-xs",
            isYou ? "bg-primary" : getAvatarColor(participant.contactName),
          )}
        >
          {isYou ? (
            <Users className="h-4 w-4" />
          ) : (
            getInitials(participant.contactName)
          )}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 min-w-32">
        <p className="font-medium text-sm truncate">
          {participant.contactName}
        </p>
        {splitMethod === "equal" && participant.included && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(participant.amount, currency)}
          </p>
        )}
      </div>

      {/* Input based on split method (only shown when included) */}
      {participant.included && (
        <>
          {splitMethod === "exact" && (
            <div className="flex items-center gap-1 w-1/2">
              <AmountInput
                value={participant.amount || ""}
                onChange={(e) =>
                  onUpdateAmount(parseFloat(e.target.value) || 0)
                }
                className="h-12 w-full text-right"
                min="0"
              />
            </div>
          )}

          {splitMethod === "percentage" && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={participant.percentage || ""}
                onChange={(e) =>
                  onUpdatePercentage(parseFloat(e.target.value) || 0)
                }
                className="h-12 text-right text-sm tabular-nums"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="text-muted-foreground text-xl font-semibold">
                %
              </span>
            </div>
          )}

          {splitMethod === "shares" && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={participant.shares || ""}
                onChange={(e) => onUpdateShares(parseInt(e.target.value) || 1)}
                className="h-12 text-right text-2xl font-medium tabular-nums"
                min="1"
                step="1"
              />
              <span className="text-muted-foreground text-xl font-semibold">
                share
                {participant.shares === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </>
      )}

      {/* Remove button - only for contacts (not "You"), only when NOT included */}
      {!isYou && !participant.included && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * ParticipantList - Scrollable list of participants with split inputs
 */
export function ParticipantList({
  participants,
  splitMethod,
  currency,
  onToggleParticipant,
  onRemoveParticipant,
  onUpdateAmount,
  onUpdatePercentage,
  onUpdateShares,
}: ParticipantListProps) {
  return (
    <ScrollArea className="max-h-54 overflow-auto pr-3">
      <div className="space-y-2">
        {participants.map((participant) => (
          <ParticipantRow
            key={participant.contactId ?? "you"}
            participant={participant}
            splitMethod={splitMethod}
            currency={currency}
            onToggle={() => onToggleParticipant(participant.contactId)}
            onRemove={() => onRemoveParticipant(participant.contactId)}
            onUpdateAmount={(value) =>
              onUpdateAmount(participant.contactId, value)
            }
            onUpdatePercentage={(value) =>
              onUpdatePercentage(participant.contactId, value)
            }
            onUpdateShares={(value) =>
              onUpdateShares(participant.contactId, value)
            }
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// Re-export utilities for use in parent component
export { getInitials, getAvatarColor };
