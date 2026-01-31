import AnalyticsPage from "@/components/analytics-page";
import ProfilePage from "@/components/profile-page";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import SavingsPage from "../components/savings-page";
import TransactionsPage from "@/components/transactions-page";
import { Suspense, lazy } from "react";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { AnalyticsSkeleton } from "@/components/skeletons/analytics-skeleton";
import { SavingsSkeleton } from "@/components/skeletons/savings-skeleton";
import { TransactionsSkeleton } from "@/components/skeletons/transactions-skeleton";
import { SplitSkeleton } from "@/components/skeletons/split-skeleton";

const SplitPage = lazy(() => import("@/components/split-page"));

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page || "dashboard";

  const session = await auth();
  const isAuthed = !!session?.user?.email;

  if (page === "analytics") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPage />
      </Suspense>
    );
  }

  if (page === "savings") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense fallback={<SavingsSkeleton />}>
        <SavingsPage />
      </Suspense>
    );
  }

  if (page === "transactions") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense fallback={<TransactionsSkeleton />}>
        <TransactionsPage />
      </Suspense>
    );
  }

  if (page === "profile") {
    return <ProfilePage />;
  }

  if (page === "split") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense fallback={<SplitSkeleton />}>
        <SplitPage />
      </Suspense>
    );
  }

  if (!isAuthed) {
    redirect("/auth");
  }

  // Dashboard now fetches data on client based on selected month
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}
