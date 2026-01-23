"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useUserSettings } from "@/components/user-settings-provider";
import { useNavigation } from "@/components/navigation-provider";
import { formatCurrency } from "@/lib/utils";

interface DailySpendingChartProps {
  data: { day: number; amount: number }[];
  daysInMonth: number;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function DailySpendingChart({ data, daysInMonth }: DailySpendingChartProps) {
  const { currency } = useUserSettings();
  const { selectedMonth } = useNavigation();

  // Get the month name from selectedMonth (format: "YYYY-MM")
  const [, monthIndex] = selectedMonth.split("-").map(Number);
  const monthName = monthNames[monthIndex - 1] || "Jan";

  // Create full month data with zeros for days without spending
  const fullMonthData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const existing = data.find((d) => d.day === day);
    return {
      day,
      label: `${monthName} ${day}`,
      amount: existing?.amount || 0,
    };
  });

  // Only show ticks every 5 days (1, 6, 11, 16, 21, 26, 31)
  const tickDays = [1, 6, 11, 16, 21, 26];
  if (daysInMonth >= 31) tickDays.push(31);

  if (data.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
        No spending data yet
      </div>
    );
  }

  return (
    <div className="h-20 w-full overflow-x-auto">
      <div className="h-full min-w-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={fullMonthData} barCategoryGap={1} margin={{ top: 0, right: 6, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground)", opacity: 0.5, fontSize: 10 }}
              ticks={tickDays}
              tickFormatter={(day) => `${monthName} ${day}`}
              interval={0}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-md bg-popover px-2 py-1 text-xs shadow-md border">
                      <p className="font-medium">{data.label}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(data.amount, currency)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="amount"
              fill="var(--primary)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

