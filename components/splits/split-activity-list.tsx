"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDateUTC, cn } from "@/lib/utils";
import type { Expense, ExpenseSplit } from "@/lib/types";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  categoryIcons,
  defaultCategoryIcon,
} from "@/lib/constants";
import { useNavigation } from "@/components/navigation-provider";

interface SplitActivityListProps {
  activities: (ExpenseSplit & { expense: Expense; contact: any })[];
  currency: string;
}

import { getInitials, getAvatarColor } from "@/lib/avatar";

// ...
export function SplitActivityList({
  activities,
  currency,
}: SplitActivityListProps) {
  const { openExpense } = useNavigation();



  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
        No recent split activity.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <Table>
        <TableBody>
          {activities.map((activity) => {
            const Icon =
              categoryIcons[activity.expense.category] ||
              defaultCategoryIcon;

            return (
              <TableRow
                key={activity.id}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => openExpense(activity.expense)}
              >
                <TableCell className="w-12 pr-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className={cn(
                        "text-foreground text-xs",
                        activity.contact
                          ? getAvatarColor(activity.contact.name)
                          : "bg-muted",
                      )}
                    >
                      {activity.contact ? (
                        getInitials(activity.contact.name)
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate">
                      {activity.expense.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                       {activity.contact?.name} owes you • {formatDistanceToNow(new Date(activity.createdAt || new Date()), { addSuffix: true })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium text-primary tabular-nums">
                    +{formatCurrency(activity.amount, currency)}
                  </div>
                  {activity.isPaid && (
                   <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                     Settled
                   </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
