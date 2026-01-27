import { AnalyticsClient } from "@/components/analytics-client";
import {
  getAvailableMonths,
  getBudgetTrendData,
  getExpenseCategoryData,
  getIncomeCategoryData,
  getDailyActivityData,
  getUserCurrency,
} from "@/app/actions/analytics";
import { getCurrentMonthKey } from "@/lib/utils";

export default async function AnalyticsPage() {
  const availableMonths = await getAvailableMonths();
  const fallbackMonth = getCurrentMonthKey();
  const initialMonth = availableMonths[0] ?? fallbackMonth;
  const [trendData, initialPieData, initialIncomePieData, dailyActivityData, currency] = await Promise.all([
    getBudgetTrendData(),
    getExpenseCategoryData(initialMonth),
    getIncomeCategoryData(initialMonth),
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
      initialIncomePieData={initialIncomePieData}
      trendData={trendData}
      dailyActivityData={dailyActivityData}
      currency={currency}
    />
  );
}
