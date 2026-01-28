"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, cn, formatDateUTC } from "@/lib/utils";
import type { Contact, Expense, ExpenseSplit } from "@/lib/types";
import { Check, Users, ChevronRight } from "lucide-react";
import { markSplitAsPaid } from "@/app/actions";
import { toast } from "sonner";
import { useNavigation } from "@/components/navigation-provider";

interface ContactWithBalance {
  contact: Contact;
  balance: number;
  openSplits: (ExpenseSplit & { expense: Expense })[];
}

interface ContactBalanceListProps {
  contacts: ContactWithBalance[];
  currency: string;
}

import { getInitials, getAvatarColor } from "@/lib/avatar";


export function ContactBalanceList({
  contacts,
  currency,
}: ContactBalanceListProps) {
  const [selectedContact, setSelectedContact] =
    useState<ContactWithBalance | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const { triggerRefresh, openExpense } = useNavigation();



  const handleSettleAll = async () => {
    if (!selectedContact) return;

    setIsSettling(true);
    try {
      // Mark all open splits as paid
      await Promise.all(
        selectedContact.openSplits.map((split) => markSplitAsPaid(split.id)),
      );

      toast.success(`Settled up with ${selectedContact.contact.name}`);
      setSelectedContact(null);
      triggerRefresh();
    } catch (error) {
      console.error("Failed to settle up:", error);
      toast.error("Failed to settle up");
    } finally {
      setIsSettling(false);
    }
  };

  // ...

  return (
    <>
      <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden divide-y">
        {contacts.map((item) => (
          <div
            key={item.contact.id}
            className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => setSelectedContact(item)}
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback
                className={cn(
                  "text-foreground text-xs",
                  getAvatarColor(item.contact.name),
                )}
              >
                {getInitials(item.contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm truncate">
                  {item.contact.name}
                </h4>
                <span
                  className={cn(
                    "font-bold text-sm tabular-nums",
                    item.balance > 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  {item.balance > 0 ? "+" : ""}
                  {formatCurrency(item.balance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {item.balance > 0 ? "owes you" : "you owe"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.openSplits.length} txn{item.openSplits.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
        ))}
      </div>

      <Dialog
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-12 w-12 border-2 border-secondary">
                <AvatarFallback
                  className={cn(
                    "text-foreground text-sm font-medium",
                    selectedContact
                      ? getAvatarColor(selectedContact.contact.name)
                      : "",
                  )}
                >
                  {selectedContact
                    ? getInitials(selectedContact.contact.name)
                    : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{selectedContact?.contact.name}</DialogTitle>
                <DialogDescription>
                  {selectedContact?.balance && selectedContact.balance > 0
                    ? "Owes you"
                    : "You owe"}
                  <span
                    className={cn(
                      "font-bold ml-1 text-foreground",
                      (selectedContact?.balance || 0) > 0
                        ? "text-primary"
                        : "text-destructive",
                    )}
                  >
                    {selectedContact &&
                      formatCurrency(Math.abs(selectedContact.balance), currency)}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-3 max-h-[300px] overflow-y-auto">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Open Transactions
            </h4>
            {/* Open Transactions Table */}
            <div className="border rounded-md overflow-hidden bg-background">
              <Table>
                <TableBody>
                  {selectedContact?.openSplits.map((split) => (
                    <TableRow
                      key={split.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => openExpense(split.expense)}
                    >
                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm truncate max-w-[160px]">
                            {split.expense.category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateUTC(new Date(split.expense.date))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <span className="font-medium">
                          {formatCurrency(split.amount, currency)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedContact(null)}
              disabled={isSettling}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSettleAll} disabled={isSettling}>
              {isSettling ? (
                "Settling..."
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Settle Up
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
