import { AnalyticsClient } from "@/components/analytics-client";
import {
  getAvailableMonths,
  getBudgetTrendData,
  getExpenseCategoryData,
  getDailyActivityData,
  getUserCurrency,
} from "@/app/actions/analytics";
import { getCurrentMonthKey } from "@/lib/utils";

export default async function AnalyticsPage() {
  const availableMonths = await getAvailableMonths();
  const fallbackMonth = getCurrentMonthKey();
  const initialMonth = availableMonths[0] ?? fallbackMonth;
  const [trendData, initialPieData, dailyActivityData, currency] = await Promise.all([
    getBudgetTrendData(),
    getExpenseCategoryData(initialMonth),
    getDailyActivityData(),
    getUserCurrency(),
  ]);

  return (
    <AnalyticsClient
      availableMonths={
        availableMonths.length ? availableMonths : [initialMonth]
      }
      initialMonth={initialMonth}
      initialPieData={initialPieData}
      trendData={trendData}
      dailyActivityData={dailyActivityData}
      currency={currency}
    />
  );
}
