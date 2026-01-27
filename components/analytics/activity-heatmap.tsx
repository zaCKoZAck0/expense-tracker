"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import {
  format,
  subDays,
  subMonths,
  eachDayOfInterval,
  getDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface ActivityHeatmapProps {
  data: Array<{ date: string; count: number; expense?: number; earning?: number; transactions?: number }>;
  currency: string;
}

export function ActivityHeatmap({ data, currency }: ActivityHeatmapProps) {
  // Use a stable reference for today (start of day) to avoid hydration mismatches and time shifting
  // This ensures 'today' means 'today at 00:00:00 local time'
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Generate last 10 months (approx 300 days) to prevent overflow
  const startDate = subMonths(today, 9);

  // Generate calendar days from startDate to today.
  // We don't strictly use this for the grid layout anymore, but good to have reference.
  // const calendarDays = useMemo(() => {
  //   return eachDayOfInterval({ start: startDate, end: today });
  // }, [startDate, today]);

  // Transform data to Map for O(1) lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, { count: number; expense: number; earning: number; transactions: number }>();
    data.forEach((item) => {
      map.set(item.date, {
        count: item.count,
        expense: item.expense ?? item.count,
        earning: item.earning ?? 0,
        transactions: item.transactions ?? 0,
      });
    });
    return map;
  }, [data]);

  // Determine quartiles for coloring
  const counts = data.map((d) => d.count).filter((c) => c > 0);

  // Simple thresholding logic
  const getLevel = (count: number) => {
    if (count === 0) return 0;
    if (counts.length === 0) return 1;

    // Percentiles
    const sorted = [...counts].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];

    if (count >= p90) return 4;
    if (count >= p75) return 3;
    if (count >= p50) return 2;
    return 1;
  };

  const getColorClass = (level: number) => {
    switch (level) {
      case 0:
        return "bg-primary/25"; // Empty but visible
      case 1:
        return "bg-secondary/20";
      case 2:
        return "bg-secondary/40";
      case 3:
        return "bg-secondary/60";
      case 4:
        return "bg-secondary/80"; // Highest
      default:
        return "bg-foreground/25";
    }
  };

  // Grid Construction:
  // Iterate from `startOfWeek(startDate)` to `endOfWeek(today)`.
  // Chunk into groups of 7.
  const gridWeeks = useMemo(() => {
    const start = startOfWeek(startDate);
    const end = endOfWeek(today);
    const allDays = eachDayOfInterval({ start, end });

    const weeks: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    return weeks;
  }, [startDate, today]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
        <CardDescription>
          Spending frequency over the past months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex flex-col items-center">
            {/* Month Labels */}
            <div className="flex text-xs text-muted-foreground mb-2 ml-8 w-max">
              {gridWeeks.map((week, index) => {
                const firstDay = week[0];
                const prevWeek = gridWeeks[index - 1];
                const prevFirstDay = prevWeek?.[0];

                // Logic: Show label if it's the first week, or if month changed from previous week's first day
                const showLabel =
                  index === 0 ||
                  (prevFirstDay &&
                    firstDay.getMonth() !== prevFirstDay.getMonth());

                return (
                  // Use same width/gap as the grid columns to align
                  <div
                    key={index}
                    className="w-3 mx-[2px] overflow-visible whitespace-nowrap"
                  >
                    {showLabel && <span>{format(firstDay, "MMM")}</span>}
                  </div>
                );
              })}
            </div>

            <div className="flex">
              {/* Weekday Labels (Mon, Wed, Fri) */}
              {/* Align with rows: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat */}
              <div className="flex flex-col gap-1 mr-2 text-[10px] text-muted-foreground text-right pt-[16px]">
                {/* 7 rows to align perfectly */}
                <div className="h-3"></div> {/* Sun */}
                <div className="h-3 leading-[12px]">Mon</div>
                <div className="h-3"></div> {/* Tue */}
                <div className="h-3 leading-[12px]">Wed</div>
                <div className="h-3"></div> {/* Thu */}
                <div className="h-3 leading-[12px]">Fri</div>
                <div className="h-3"></div> {/* Sat */}
              </div>

              {/* Heatmap Grid */}
              <div className="flex gap-1">
                {gridWeeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const isAfterToday = day > today;
                      const isBeforeStart = day < startDate;
                      const isHidden = isAfterToday || isBeforeStart;

                      const dateStr = format(day, "yyyy-MM-dd");
                      const dayData = dataMap.get(dateStr) || { count: 0, expense: 0, earning: 0, transactions: 0 };
                      const level = getLevel(dayData.count);

                      if (isHidden) {
                        return (
                          <div key={day.toISOString()} className="w-3 h-3" />
                        );
                      }

                      return (
                        <TooltipProvider key={day.toISOString()}>
                          <Tooltip>
                            <TooltipTrigger>
                              <div
                                className={cn(
                                  "w-3 h-3 rounded-[2px] transition-colors",
                                  getColorClass(level),
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div className="font-semibold">
                                  {dayData.transactions === 0
                                    ? "No activity"
                                    : (
                                      <>
                                        <div className="text-muted-foreground mb-1">
                                          {dayData.transactions} transaction{dayData.transactions !== 1 ? "s" : ""}
                                        </div>
                                        {dayData.expense > 0 && (
                                          <div>Spent: {formatCurrency(dayData.expense, currency)}</div>
                                        )}
                                        {dayData.earning > 0 && (
                                          <div>Earned: {formatCurrency(dayData.earning, currency)}</div>
                                        )}
                                      </>
                                    )}
                                </div>
                                <div className="text-muted-foreground mt-1">
                                  {format(day, "MMM d, yyyy")}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground px-4">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-[2px] bg-primary/25"></div>
              <div className="w-3 h-3 rounded-[2px] bg-secondary/20"></div>
              <div className="w-3 h-3 rounded-[2px] bg-secondary/40"></div>
              <div className="w-3 h-3 rounded-[2px] bg-secondary/60"></div>
              <div className="w-3 h-3 rounded-[2px] bg-secondary/80"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
