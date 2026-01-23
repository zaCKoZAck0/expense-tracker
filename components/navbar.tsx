"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigation } from "@/components/navigation-provider";
import { useMemo } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { selectedMonth, setSelectedMonth, page } = useNavigation();

  // Generate list of past months (up to 12 months back from current)
  const availableMonths = useMemo(() => {
    const months: string[] = [];
    const current = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      months.push(`${year}-${month}`);
    }

    return months;
  }, []);

  // Format month for display (e.g., "2026-01" -> "January 2026")
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-b z-50">
      <div className="max-w-3xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
        <Link
          href="/?page=profile"
          aria-label="Open profile"
          className="rounded-full"
        >
          <Avatar>
            {user?.image ? (
              <AvatarImage src={user.image} alt={user?.name ?? "User"} />
            ) : null}
          </Avatar>
        </Link>

        {/* Month selector in middle - only show on dashboard */}
        {page === "dashboard" && (
          <div className="flex-1 flex justify-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <ThemeToggle />
        </div>

        {status === "loading" ? <span className="sr-only">Loading</span> : null}
      </div>
    </header>
  );
}
